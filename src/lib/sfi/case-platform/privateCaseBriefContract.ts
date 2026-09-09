import { createHash } from 'node:crypto';
import type { SfiCanonicalRef } from '@/core/contracts/sfi';
import type { SfiUnifontGlyph } from './unifontType3';

export const SFI_PRIVATE_CASE_BRIEF_ASSET_CONTRACT = 'SFI-PRIVATE-CASE-BRIEF-ASSET-1.2' as const;
export const SFI_CASE_COVER_BRIEF_CONTRACT = 'SFI-CASE-COVER-BRIEF-1.1' as const;
export const SFI_CASE_ASSET_BUCKET = 'sfi-case-assets' as const;

const BASE_COVER_BRIEF = 'Refined high-end editorial cover for a System Friction Institute case brief. Deep black field, restrained warm-gold illumination, precise institutional geometry and a central real-world operational metaphor. Show signal, structure, interruption and unresolved continuity without using dashboard UI, infographic blocks, logos from the observed company or unverified claims. Minimal, sovereign, contemporary, cinematic, evidence-oriented. No visible text unless typography is added later by the document renderer.';

export type SfiCaseCoverBrief = {
  contract: typeof SFI_CASE_COVER_BRIEF_CONTRACT;
  caseId: string;
  prompt: string;
  sourceEvidenceRefs: SfiCanonicalRef[];
  visibleTextAllowed: false;
  externalImageGenerated: boolean;
  provider: string | null;
  model: string | null;
  approvalRequired: true;
  publicationState: 'PRIVATE_DRAFT';
};

export type PrivateCaseBriefRenderInput = {
  caseId: string;
  version: string;
  subject: string;
  scope: string;
  generatedAt: string;
  evidenceRefs: SfiCanonicalRef[];
  coverBrief: SfiCaseCoverBrief;
};

function nullableText(value: string | null | undefined) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || null;
}

function normalizeRef(ref: SfiCanonicalRef): SfiCanonicalRef {
  const id = ref.id.trim();
  if (!id) throw new Error('SFI_CASE_COVER_EVIDENCE_REF_ID_REQUIRED');
  return { id, version: nullableText(ref.version), hash: nullableText(ref.hash) };
}

function refKey(ref: SfiCanonicalRef) {
  return `${ref.id}\u0000${ref.version ?? ''}\u0000${ref.hash ?? ''}`;
}

export function formatCanonicalRef(ref: SfiCanonicalRef) {
  return `${ref.id}${ref.version ? `@${ref.version}` : ''}${ref.hash ? `#${ref.hash}` : ''}`;
}

export function buildSfiCaseCoverBrief(input: {
  caseId: string;
  sourceEvidenceRefs: SfiCanonicalRef[];
  provider?: string | null;
  model?: string | null;
  externalImageGenerated?: boolean;
}): SfiCaseCoverBrief {
  const caseId = input.caseId.trim();
  if (!caseId) throw new Error('SFI_CASE_COVER_CASE_ID_REQUIRED');
  const byKey = new Map<string, SfiCanonicalRef>();
  for (const raw of input.sourceEvidenceRefs) {
    const ref = normalizeRef(raw);
    byKey.set(refKey(ref), ref);
  }
  const refs = [...byKey.values()].sort((a, b) => refKey(a).localeCompare(refKey(b)));
  const lineageClause = refs.length
    ? `Case-specific visual detail may be derived only from these admitted evidence references: ${refs.map(formatCanonicalRef).join(', ')}. Do not render the reference identifiers as visible text.`
    : 'No admitted case-specific evidence detail is available; keep the metaphor generic and do not invent actor, place, company, rupture, outcome or logo.';
  return {
    contract: SFI_CASE_COVER_BRIEF_CONTRACT,
    caseId,
    prompt: `${BASE_COVER_BRIEF} ${lineageClause}`,
    sourceEvidenceRefs: refs,
    visibleTextAllowed: false,
    externalImageGenerated: input.externalImageGenerated === true,
    provider: input.provider?.trim() || null,
    model: input.model?.trim() || null,
    approvalRequired: true,
    publicationState: 'PRIVATE_DRAFT',
  };
}

function charLength(value: string) {
  return Array.from(value).length;
}

function sliceChars(value: string, start: number, end?: number) {
  return Array.from(value).slice(start, end).join('');
}

function wrap(value: string, width = 82) {
  const words = value.replace(/[\r\n]+/g, ' ').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  const pushWord = (word: string) => {
    let remaining = word;
    while (charLength(remaining) > width) {
      const prefix = sliceChars(remaining, 0, width);
      if (line) {
        lines.push(line);
        line = '';
      }
      lines.push(prefix);
      remaining = sliceChars(remaining, width);
    }
    if (!remaining) return;
    const next = line ? `${line} ${remaining}` : remaining;
    if (charLength(next) > width && line) {
      lines.push(line);
      line = remaining;
    } else line = next;
  };
  for (const word of words) pushWord(word);
  if (line) lines.push(line);
  return lines;
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result.length ? result : [[]];
}

function detailLines(input: PrivateCaseBriefRenderInput) {
  const evidenceLabels = input.evidenceRefs.map(formatCanonicalRef);
  return [
    `Case: ${input.caseId}`,
    `Version: ${input.version}`,
    `Generated: ${input.generatedAt}`,
    'Publication: PRIVATE_DRAFT',
    '',
    'Subject', ...wrap(input.subject || 'MISSING', 78), '',
    'Scope', ...wrap(input.scope || 'MISSING', 78), '',
    `Evidence references (${evidenceLabels.length})`,
    ...(evidenceLabels.length ? evidenceLabels.flatMap((ref) => wrap(ref, 78)) : ['MISSING']),
    '', 'Cover generation boundary', ...wrap(input.coverBrief.prompt, 78),
    '', 'This document is a private projection. Report != evidence. Report != decision. Publication requires separate human/governance authorization.',
  ];
}

function pageLineGroups(input: PrivateCaseBriefRenderInput) {
  const cover = {
    coverLines: wrap('SYSTEM FRICTION INSTITUTE / PRIVATE CASE BRIEF', 48),
    subjectLines: wrap(input.subject || 'Case subject not declared', 54),
    footerLines: wrap(`PRIVATE / ${input.caseId} / ${input.version}`, 60),
  };
  const detailChunks = chunks(detailLines(input), 47);
  return { cover, detailChunks };
}

export function requiredPrivateCaseBriefCodePoints(input: PrivateCaseBriefRenderInput) {
  const { cover, detailChunks } = pageLineGroups(input);
  const values = [
    ...cover.coverLines,
    ...cover.subjectLines,
    ...cover.footerLines,
    ...detailChunks.flatMap((lines, index) => [`PRIVATE CASE BRIEF / DETAIL ${index + 1} OF ${detailChunks.length}`, '', ...lines]),
  ];
  const result = new Set<number>();
  for (const value of values) {
    for (const char of value) {
      const codePoint = char.codePointAt(0);
      if (typeof codePoint === 'number' && codePoint >= 0x20) result.add(codePoint);
    }
  }
  result.add(0x20);
  return result;
}

type FontGlyph = SfiUnifontGlyph & { code: number; name: string };
type FontPartition = { resource: string; glyphs: FontGlyph[]; byCodePoint: Map<number, FontGlyph> };

function fontPartitions(required: Set<number>, glyphs: ReadonlyMap<number, SfiUnifontGlyph>) {
  const ordered = [...required].sort((a, b) => a - b);
  const missing = ordered.filter((codePoint) => !glyphs.has(codePoint));
  if (missing.length) {
    throw new Error(`SFI_PRIVATE_CASE_BRIEF_UNICODE_GLYPH_UNAVAILABLE:${missing.map((value) => `U+${value.toString(16).toUpperCase()}`).join(',')}`);
  }
  return chunks(ordered, 240).map((values, partitionIndex): FontPartition => {
    const mapped = values.map((codePoint, index) => {
      const glyph = glyphs.get(codePoint)!;
      return { ...glyph, code: index + 1, name: `g${codePoint.toString(16).toUpperCase().padStart(4, '0')}` };
    });
    return {
      resource: `F${partitionIndex + 1}`,
      glyphs: mapped,
      byCodePoint: new Map(mapped.map((glyph) => [glyph.codePoint, glyph])),
    };
  });
}

function utf16BeHex(codePoint: number) {
  if (codePoint <= 0xffff) return codePoint.toString(16).toUpperCase().padStart(4, '0');
  const adjusted = codePoint - 0x10000;
  const high = 0xd800 + (adjusted >> 10);
  const low = 0xdc00 + (adjusted & 0x3ff);
  return `${high.toString(16).toUpperCase().padStart(4, '0')}${low.toString(16).toUpperCase().padStart(4, '0')}`;
}

function glyphStream(glyph: FontGlyph) {
  const advance = glyph.width === 8 ? 500 : 1000;
  const pixelWidth = glyph.width === 8 ? 125 : 62.5;
  const pixelHeight = 62.5;
  const ops = [`${advance} 0 d0`];
  for (let row = 0; row < 16; row += 1) {
    const bits = glyph.rows[row] ?? 0;
    for (let column = 0; column < glyph.width; column += 1) {
      const mask = 1 << (glyph.width - 1 - column);
      if ((bits & mask) === 0) continue;
      const x = column * pixelWidth;
      const y = (15 - row) * pixelHeight;
      ops.push(`${x} ${y} ${pixelWidth} ${pixelHeight} re f`);
    }
  }
  return ops.join('\n');
}

function cmapStream(partition: FontPartition) {
  const mappings = chunks(partition.glyphs, 100).flatMap((group) => [
    `${group.length} beginbfchar`,
    ...group.map((glyph) => `<${glyph.code.toString(16).toUpperCase().padStart(2, '0')}> <${utf16BeHex(glyph.codePoint)}>`),
    'endbfchar',
  ]);
  return [
    '/CIDInit /ProcSet findresource begin',
    '12 dict begin',
    'begincmap',
    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
    `/CMapName /SFI-Unifont-${partition.resource} def`,
    '/CMapType 2 def',
    '1 begincodespacerange',
    '<01> <F0>',
    'endcodespacerange',
    ...mappings,
    'endcmap',
    'CMapName currentdict /CMap defineresource pop',
    'end',
    'end',
  ].join('\n');
}

function fontRegistry(partitions: FontPartition[]) {
  const byCodePoint = new Map<number, { partition: FontPartition; glyph: FontGlyph }>();
  for (const partition of partitions) {
    for (const glyph of partition.glyphs) byCodePoint.set(glyph.codePoint, { partition, glyph });
  }
  return byCodePoint;
}

function textOps(lines: string[], x: number, y: number, leading: number, fontSize: number, registry: ReturnType<typeof fontRegistry>) {
  const ops = ['BT', `${x} ${y} Td`, `${leading} TL`];
  lines.forEach((line, lineIndex) => {
    if (lineIndex) ops.push('T*');
    let resource = '';
    let bytes = '';
    const flush = () => {
      if (!bytes) return;
      ops.push(`/${resource} ${fontSize} Tf`, `<${bytes}> Tj`);
      bytes = '';
    };
    for (const char of line) {
      const codePoint = char.codePointAt(0)!;
      const found = registry.get(codePoint);
      if (!found) throw new Error(`SFI_PRIVATE_CASE_BRIEF_UNICODE_GLYPH_UNAVAILABLE:U+${codePoint.toString(16).toUpperCase()}`);
      if (resource && resource !== found.partition.resource) flush();
      resource = found.partition.resource;
      bytes += found.glyph.code.toString(16).toUpperCase().padStart(2, '0');
    }
    flush();
  });
  ops.push('ET');
  return ops.join('\n');
}

function pdfStream(stream: string) {
  return `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`;
}

export function renderPrivateCaseBriefPdf(input: PrivateCaseBriefRenderInput, unicodeGlyphs: ReadonlyMap<number, SfiUnifontGlyph>): Buffer {
  const required = requiredPrivateCaseBriefCodePoints(input);
  const partitions = fontPartitions(required, unicodeGlyphs);
  const registry = fontRegistry(partitions);
  const { cover, detailChunks } = pageLineGroups(input);
  const pageStreams = [
    [
      '0 0 0 rg 0 0 612 792 re f',
      '0.78 0.61 0.25 rg',
      textOps(cover.coverLines, 64, 650, 24, 16, registry),
      '0.92 0.92 0.90 rg',
      textOps(cover.subjectLines, 64, 530, 22, 18, registry),
      '0.78 0.61 0.25 RG 1.2 w 64 470 m 548 470 l S',
      '0.68 0.68 0.66 rg',
      textOps(cover.footerLines, 64, 430, 14, 9, registry),
    ].join('\n'),
    ...detailChunks.map((lines, index) => [
      '0 0 0 rg',
      textOps([`PRIVATE CASE BRIEF / DETAIL ${index + 1} OF ${detailChunks.length}`, '', ...lines], 54, 740, 13, 9, registry),
    ].join('\n')),
  ];

  type PdfObject = { key: string; body: () => string };
  const objects: PdfObject[] = [];
  const numbers = new Map<string, number>();
  const reserve = (key: string, body: () => string) => {
    if (numbers.has(key)) throw new Error(`SFI_PRIVATE_CASE_BRIEF_PDF_DUPLICATE_OBJECT:${key}`);
    objects.push({ key, body });
    numbers.set(key, objects.length);
  };
  const ref = (key: string) => {
    const number = numbers.get(key);
    if (!number) throw new Error(`SFI_PRIVATE_CASE_BRIEF_PDF_OBJECT_MISSING:${key}`);
    return `${number} 0 R`;
  };

  reserve('catalog', () => `<< /Type /Catalog /Pages ${ref('pages')} >>`);
  reserve('pages', () => `<< /Type /Pages /Kids [${pageStreams.map((_, index) => ref(`page:${index}`)).join(' ')}] /Count ${pageStreams.length} >>`);
  pageStreams.forEach((_, index) => reserve(`page:${index}`, () => {
    const resources = partitions.map((partition) => `/${partition.resource} ${ref(`font:${partition.resource}`)}`).join(' ');
    return `<< /Type /Page /Parent ${ref('pages')} /MediaBox [0 0 612 792] /Resources << /Font << ${resources} >> >> /Contents ${ref(`content:${index}`)} >>`;
  }));

  for (const partition of partitions) {
    reserve(`font:${partition.resource}`, () => {
      const charProcs = partition.glyphs.map((glyph) => `/${glyph.name} ${ref(`glyph:${partition.resource}:${glyph.code}`)}`).join(' ');
      const differences = partition.glyphs.map((glyph) => `/${glyph.name}`).join(' ');
      const widths = partition.glyphs.map((glyph) => glyph.width === 8 ? '500' : '1000').join(' ');
      return `<< /Type /Font /Subtype /Type3 /Name /${partition.resource} /FontBBox [0 0 1000 1000] /FontMatrix [0.001 0 0 0.001 0 0] /CharProcs << ${charProcs} >> /Encoding << /Type /Encoding /Differences [1 ${differences}] >> /FirstChar 1 /LastChar ${partition.glyphs.length} /Widths [${widths}] /Resources << >> /ToUnicode ${ref(`cmap:${partition.resource}`)} >>`;
    });
    reserve(`cmap:${partition.resource}`, () => pdfStream(cmapStream(partition)));
    for (const glyph of partition.glyphs) {
      reserve(`glyph:${partition.resource}:${glyph.code}`, () => pdfStream(glyphStream(glyph)));
    }
  }
  pageStreams.forEach((stream, index) => reserve(`content:${index}`, () => pdfStream(stream)));

  let pdf = '%PDF-1.4\n%SFI-UNICODE-TYPE3\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += `${numbers.get(object.key)} 0 obj\n${object.body()}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${ref('catalog')} >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'ascii');
}

export function sha256Hex(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}
