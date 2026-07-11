import 'server-only';

import { inflateSync } from 'node:zlib';
import mammoth from 'mammoth';
import type { StudioGenericFeature } from './types';
import { StudioMultimodalError } from './types';

const MAX_EXTRACTED_CHARACTERS = 5_000_000;
const STOP_WORDS = new Set([
  'a','al','algo','and','are','as','at','be','been','by','con','como','de','del','desde','do','el','en','es','esta','este','for','from','ha','have','he','i','in','is','it','la','las','lo','los','más','me','mi','no','not','of','on','o','para','pero','por','que','se','sin','su','the','this','to','un','una','was','we','with','y','ya','you',
]);

type TextExtraction = {
  text: string;
  parser: string;
  warnings: string[];
  pageCount: number | null;
};

function decodeUtf8(bytes: Buffer) {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function stripRtf(input: string) {
  return input
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
    .replace(/\\[a-zA-Z]+-?\d* ?/g, ' ')
    .replace(/[{}]/g, ' ');
}

function decodePdfLiteral(input: string) {
  return input
    .replace(/\\([0-7]{1,3})/g, (_match, octal: string) => String.fromCharCode(Number.parseInt(octal, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

function decodePdfHex(input: string) {
  const normalized = input.replace(/\s+/g, '');
  if (!normalized || !/^[0-9a-fA-F]+$/.test(normalized)) return '';
  const padded = normalized.length % 2 === 0 ? normalized : `${normalized}0`;
  const bytes = Buffer.from(padded, 'hex');
  const utf16 = bytes.length >= 2 && ((bytes[0] === 0xfe && bytes[1] === 0xff) || (bytes[0] === 0xff && bytes[1] === 0xfe));
  if (utf16) {
    const body = bytes.subarray(2);
    if (bytes[0] === 0xff) body.swap16();
    return body.toString('utf16le');
  }
  return bytes.toString('latin1');
}

function extractTextOperators(content: string) {
  const parts: string[] = [];
  const literal = /\(((?:\\.|[^\\()])*)\)\s*Tj/g;
  const hex = /<([0-9a-fA-F\s]+)>\s*Tj/g;
  const arrays = /\[((?:[^\]]|\](?!\s*TJ))*)\]\s*TJ/gs;

  for (const match of content.matchAll(literal)) parts.push(decodePdfLiteral(match[1] ?? ''));
  for (const match of content.matchAll(hex)) parts.push(decodePdfHex(match[1] ?? ''));
  for (const match of content.matchAll(arrays)) {
    const body = match[1] ?? '';
    for (const item of body.matchAll(/\(((?:\\.|[^\\()])*)\)|<([0-9a-fA-F\s]+)>/g)) {
      parts.push(item[1] !== undefined ? decodePdfLiteral(item[1]) : decodePdfHex(item[2] ?? ''));
    }
    parts.push('\n');
  }

  return parts.join(' ');
}

function extractPdfTextFallback(bytes: Buffer): TextExtraction {
  const binary = bytes.toString('latin1');
  if (!binary.startsWith('%PDF-')) {
    throw new StudioMultimodalError('DOCUMENT_PARSE_FAILED', 'The uploaded file does not contain a valid PDF header.', 422);
  }

  const contents: string[] = [binary];
  const streamPattern = /<<(.*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/gs;
  for (const match of binary.matchAll(streamPattern)) {
    const dictionary = match[1] ?? '';
    const raw = Buffer.from(match[2] ?? '', 'latin1');
    if (/\/FlateDecode\b/.test(dictionary)) {
      try {
        contents.push(inflateSync(raw).toString('latin1'));
      } catch {
        // A malformed or unsupported stream is skipped; other streams may still contain usable text.
      }
    } else if (!/\/Filter\b/.test(dictionary)) {
      contents.push(raw.toString('latin1'));
    }
  }

  const text = contents.map(extractTextOperators).filter(Boolean).join('\n');
  const pageCount = Math.max(0, (binary.match(/\/Type\s*\/Page\b/g) ?? []).length) || null;
  if (!text.trim()) {
    throw new StudioMultimodalError(
      'DOCUMENT_PARSE_FAILED',
      'PDF contains no text extractable by the server-safe parser. It may be scanned, encrypted, or use unsupported font encodings.',
      422,
      { parser: 'pdf_node_stream_text_v1' },
    );
  }

  return {
    text,
    parser: 'pdf_node_stream_text_v1',
    warnings: ['PDF_LAYOUT_NOT_PRESERVED', 'PDF_COMPLEX_FONT_ENCODINGS_MAY_BE_INCOMPLETE'],
    pageCount,
  };
}

async function extractPdfText(bytes: Buffer): Promise<TextExtraction> {
  if (typeof globalThis.DOMMatrix !== 'undefined') {
    try {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: bytes });
      try {
        const result = await parser.getText();
        return { text: result.text, parser: 'pdf-parse_v2', warnings: [], pageCount: result.total };
      } finally {
        await parser.destroy().catch(() => undefined);
      }
    } catch {
      const fallback = extractPdfTextFallback(bytes);
      return { ...fallback, warnings: ['PDF_PARSE_LIBRARY_FAILED_USING_NODE_FALLBACK', ...fallback.warnings] };
    }
  }

  const fallback = extractPdfTextFallback(bytes);
  return { ...fallback, warnings: ['PDF_DOMMATRIX_UNAVAILABLE_USING_NODE_FALLBACK', ...fallback.warnings] };
}

async function extractText(bytes: Buffer, extension: string): Promise<TextExtraction> {
  if (['txt', 'md', 'markdown', 'json', 'csv', 'tsv'].includes(extension)) {
    return { text: decodeUtf8(bytes), parser: `utf8_${extension || 'text'}`, warnings: [], pageCount: null };
  }

  if (extension === 'rtf') {
    return { text: stripRtf(decodeUtf8(bytes)), parser: 'rtf_control_word_strip_v1', warnings: ['RTF_FORMATTING_NOT_PRESERVED'], pageCount: null };
  }

  if (extension === 'docx') {
    try {
      const result = await mammoth.extractRawText({ buffer: bytes });
      return {
        text: result.value,
        parser: 'mammoth_extract_raw_text',
        warnings: result.messages.map((message) => message.message).slice(0, 20),
        pageCount: null,
      };
    } catch (error) {
      throw new StudioMultimodalError('DOCUMENT_PARSE_FAILED', 'DOCX extraction failed.', 422, {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (extension === 'pdf') {
    return extractPdfText(bytes);
  }

  throw new StudioMultimodalError('UNSUPPORTED_FILE_TYPE', 'No document parser is connected for this extension.', 415, { extension });
}

function normalizeText(input: string) {
  return input.replace(/\u0000/g, '').replace(/\r\n?/g, '\n').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function tokenize(input: string) {
  return input.toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
}

function topTerms(tokens: string[], limit: number) {
  const counts = new Map<string, number>();
  tokens.forEach((token) => {
    if (token.length < 3 || STOP_WORDS.has(token)) return;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  });
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

function topBigrams(tokens: string[], limit: number) {
  const counts = new Map<string, number>();
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const left = tokens[index];
    const right = tokens[index + 1];
    if (!left || !right || STOP_WORDS.has(left) || STOP_WORDS.has(right) || left.length < 3 || right.length < 3) continue;
    const key = `${left} ${right}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([phrase, count]) => ({ phrase, count }));
}

function paragraphArc(text: string) {
  const paragraphs = text.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
  if (!paragraphs.length) return [];
  const max = Math.max(...paragraphs.map((item) => item.length), 1);
  return paragraphs.slice(0, 80).map((item, index) => ({ index, relativeLength: Number((item.length / max).toFixed(4)) }));
}

export async function analyzeStudioText(bytes: Buffer, extension: string) {
  const extracted = await extractText(bytes, extension);
  const text = normalizeText(extracted.text).slice(0, MAX_EXTRACTED_CHARACTERS);
  const truncated = extracted.text.length > MAX_EXTRACTED_CHARACTERS;
  const tokens = tokenize(text);
  const unique = new Set(tokens);
  const paragraphs = text.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
  const themes = topTerms(tokens, 12);
  const motifs = topBigrams(tokens, 10);
  const semanticDensity = tokens.length ? unique.size / tokens.length : null;
  const symbolicRecurrence = tokens.length ? 1 - unique.size / tokens.length : null;
  const warnings = [...extracted.warnings, ...(truncated ? ['TEXT_TRUNCATED_TO_ANALYSIS_LIMIT'] : [])];
  const source = `studio_text:${extracted.parser}`;

  const features: StudioGenericFeature[] = [
    {
      key: 'character_count', label: 'CHARACTER COUNT', numericValue: text.length, textValue: null, unit: 'characters', source, confidence: 1,
      status: 'OBSERVED', explanation: 'Characters extracted from the persisted document.', warnings,
    },
    {
      key: 'token_count', label: 'TOKEN COUNT', numericValue: tokens.length, textValue: null, unit: 'tokens', source, confidence: 1,
      status: 'OBSERVED', explanation: 'Unicode word-token count from extracted text.', warnings,
    },
    {
      key: 'section_count', label: 'SECTION COUNT', numericValue: paragraphs.length, textValue: null, unit: 'sections', source, confidence: 0.85,
      status: 'DERIVED', explanation: 'Paragraph blocks separated by blank lines; formatting-dependent.', warnings: [...warnings, 'PARAGRAPH_BASED_SECTION_ESTIMATE'],
    },
    {
      key: 'semantic_density', label: 'LEXICAL DENSITY', numericValue: semanticDensity, textValue: null, unit: 'ratio', source, confidence: tokens.length ? 0.9 : null,
      status: semanticDensity === null ? 'MISSING' : 'DERIVED', explanation: 'Unique token ratio; this is lexical diversity, not an AI semantic judgment.', warnings,
    },
    {
      key: 'symbolic_recurrence', label: 'TOKEN RECURRENCE', numericValue: symbolicRecurrence, textValue: null, unit: 'ratio', source, confidence: tokens.length ? 0.9 : null,
      status: symbolicRecurrence === null ? 'MISSING' : 'DERIVED', explanation: 'Repeated-token ratio across extracted text.', warnings,
    },
    {
      key: 'dominant_terms', label: 'DOMINANT TERMS', numericValue: null, textValue: themes.map((item) => `${item.term}:${item.count}`).join(', ') || null, unit: null, source,
      confidence: themes.length ? 0.8 : null, status: themes.length ? 'DERIVED' : 'MISSING', explanation: 'Most frequent non-stopword terms.', warnings,
    },
    {
      key: 'recurrent_phrases', label: 'RECURRENT PHRASES', numericValue: null, textValue: motifs.map((item) => `${item.phrase}:${item.count}`).join(', ') || null, unit: null, source,
      confidence: motifs.length ? 0.75 : null, status: motifs.length ? 'DERIVED' : 'MISSING', explanation: 'Repeated adjacent-token phrases.', warnings,
    },
  ];

  if (extracted.pageCount !== null) {
    features.push({
      key: 'page_count', label: 'PAGE COUNT', numericValue: extracted.pageCount, textValue: null, unit: 'pages', source, confidence: 1,
      status: 'OBSERVED', explanation: 'Page count reported by the PDF parser.', warnings,
    });
  }

  return {
    features,
    row: {
      tokens: tokens.length,
      sections: paragraphs.length,
      themes: themes.map((item) => `${item.term}:${item.count}`),
      motifs: motifs.map((item) => `${item.phrase}:${item.count}`),
      sentiment_arousal: null,
      narrative_arc: paragraphArc(text),
      semantic_density: semanticDensity,
      symbolic_recurrence: symbolicRecurrence,
      payload: {
        parser: extracted.parser,
        pageCount: extracted.pageCount,
        characterCount: text.length,
        truncated,
        warnings,
        excerpt: text.slice(0, 4000),
        sentimentStatus: 'MISSING_NO_SENTIMENT_ENGINE',
      },
    },
    warnings,
  };
}
