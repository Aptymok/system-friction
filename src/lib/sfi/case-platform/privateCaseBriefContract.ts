import { createHash } from 'node:crypto';
import type { SfiCanonicalRef } from '@/core/contracts/sfi';

export const SFI_PRIVATE_CASE_BRIEF_ASSET_CONTRACT = 'SFI-PRIVATE-CASE-BRIEF-ASSET-1.1' as const;
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

const WIN_ANSI_SPECIAL = new Map<number, number>([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
  [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
  [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
  [0x017e, 0x9e], [0x0178, 0x9f],
]);

function winAnsiByte(codePoint: number) {
  if ((codePoint >= 0x20 && codePoint <= 0x7e) || (codePoint >= 0xa0 && codePoint <= 0xff)) return codePoint;
  return WIN_ANSI_SPECIAL.get(codePoint) ?? null;
}

/**
 * Standard PDF Helvetica is WinAnsi, not Unicode. Preserve common Latin text exactly and
 * preserve every other code point losslessly as visible <U+XXXX> notation rather than '?'.
 */
function pdfVisibleText(value: string) {
  let out = '';
  for (const char of value.replace(/[\r\n]+/g, ' ')) {
    const codePoint = char.codePointAt(0) ?? 0;
    out += winAnsiByte(codePoint) === null ? `<U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}>` : char;
  }
  return out;
}

function escapePdfText(value: string) {
  const out: string[] = [];
  for (const char of pdfVisibleText(value)) {
    const codePoint = char.codePointAt(0) ?? 0;
    const byte = winAnsiByte(codePoint);
    if (byte === null) throw new Error('SFI_PRIVATE_CASE_BRIEF_PDF_ENCODING_INTERNAL');
    if (byte === 0x5c) out.push('\\\\');
    else if (byte === 0x28) out.push('\\(');
    else if (byte === 0x29) out.push('\\)');
    else if (byte >= 0x20 && byte <= 0x7e) out.push(String.fromCharCode(byte));
    else out.push(`\\${byte.toString(8).padStart(3, '0')}`);
  }
  return out.join('');
}

function wrap(value: string, width = 82) {
  const words = pdfVisibleText(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  const pushWord = (word: string) => {
    let remaining = word;
    while (remaining.length > width) {
      const prefix = remaining.slice(0, width);
      if (line) {
        lines.push(line);
        line = '';
      }
      lines.push(prefix);
      remaining = remaining.slice(width);
    }
    if (!remaining) return;
    const next = line ? `${line} ${remaining}` : remaining;
    if (next.length > width && line) {
      lines.push(line);
      line = remaining;
    } else line = next;
  };
  for (const word of words) pushWord(word);
  if (line) lines.push(line);
  return lines;
}

function textOps(lines: string[], x: number, y: number, leading = 15, fontSize = 10) {
  return ['BT', `/F1 ${fontSize} Tf`, `${x} ${y} Td`, `${leading} TL`, ...lines.flatMap((line, index) => [index ? 'T*' : '', `(${escapePdfText(line)}) Tj`]).filter(Boolean), 'ET'].join('\n');
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result.length ? result : [[]];
}

export function renderPrivateCaseBriefPdf(input: {
  caseId: string;
  version: string;
  subject: string;
  scope: string;
  generatedAt: string;
  evidenceRefs: SfiCanonicalRef[];
  coverBrief: SfiCaseCoverBrief;
}): Buffer {
  const evidenceLabels = input.evidenceRefs.map(formatCanonicalRef);
  const coverLines = wrap('SYSTEM FRICTION INSTITUTE / PRIVATE CASE BRIEF', 48);
  const subjectLines = wrap(input.subject || 'Case subject not declared', 54);
  const detailLines = [
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
  const page1 = [
    '0 0 0 rg 0 0 612 792 re f',
    '0.78 0.61 0.25 rg',
    textOps(coverLines, 64, 650, 24, 16),
    '0.92 0.92 0.90 rg',
    textOps(subjectLines, 64, 530, 22, 18),
    '0.78 0.61 0.25 RG 1.2 w 64 470 m 548 470 l S',
    '0.68 0.68 0.66 rg',
    textOps(wrap(`PRIVATE / ${input.caseId} / ${input.version}`, 60), 64, 430, 14, 9),
  ].join('\n');

  const detailChunks = chunks(detailLines, 47);
  const pageStreams = [page1, ...detailChunks.map((lines, index) => [
    '0 0 0 rg',
    textOps([`PRIVATE CASE BRIEF / DETAIL ${index + 1} OF ${detailChunks.length}`, '', ...lines], 54, 740, 13, 9),
  ].join('\n'))];

  const pageCount = pageStreams.length;
  const fontObjectNumber = 3 + pageCount;
  const contentObjectStart = fontObjectNumber + 1;
  const pageRefs = pageStreams.map((_, index) => `${3 + index} 0 R`);
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageCount} >>`,
  ];
  for (let index = 0; index < pageStreams.length; index += 1) {
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectStart + index} 0 R >>`);
  }
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  for (const stream of pageStreams) objects.push(`<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`);

  let pdf = '%PDF-1.4\n%SFI\n';
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'ascii');
}

export function sha256Hex(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}
