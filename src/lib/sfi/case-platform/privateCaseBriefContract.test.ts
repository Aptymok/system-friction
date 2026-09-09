import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSfiCaseCoverBrief,
  renderPrivateCaseBriefPdf,
  requiredPrivateCaseBriefCodePoints,
  sha256Hex,
  type PrivateCaseBriefRenderInput,
} from './privateCaseBriefContract';
import { parseUnifontHex, type SfiUnifontGlyph } from './unifontType3';

const evidence = (id: string, version: string | null = null, hash: string | null = null) => ({ id, version, hash });

function fixtureGlyphs(input: PrivateCaseBriefRenderInput) {
  const glyphs = new Map<number, SfiUnifontGlyph>();
  for (const codePoint of requiredPrivateCaseBriefCodePoints(input)) {
    const width: 8 | 16 = codePoint > 0xff ? 16 : 8;
    const mask = width === 8 ? 0xff : 0xffff;
    const rows = codePoint === 0x20
      ? Array.from({ length: 16 }, () => 0)
      : Array.from({ length: 16 }, (_, row) => ((codePoint * (row + 3)) ^ (0x5a5a >>> (row % 4))) & mask);
    glyphs.set(codePoint, { codePoint, width, rows });
  }
  return glyphs;
}

test('cover brief preserves complete evidence identity and remains evidence-bounded', () => {
  const brief = buildSfiCaseCoverBrief({
    caseId: 'CASE-001',
    sourceEvidenceRefs: [
      evidence('evidence:b', 'v2', 'hash-b'),
      evidence('evidence:a', 'v1', 'hash-a'),
      evidence('evidence:a', 'v1', 'hash-a'),
    ],
  });
  assert.deepEqual(brief.sourceEvidenceRefs, [
    evidence('evidence:a', 'v1', 'hash-a'),
    evidence('evidence:b', 'v2', 'hash-b'),
  ]);
  assert.equal(brief.externalImageGenerated, false);
  assert.equal(brief.provider, null);
  assert.equal(brief.approvalRequired, true);
  assert.equal(brief.publicationState, 'PRIVATE_DRAFT');
  assert.equal(brief.visibleTextAllowed, false);
  assert.match(brief.prompt, /evidence:a@v1#hash-a/);
  assert.match(brief.prompt, /Do not render the reference identifiers as visible text/);
});

test('no-evidence cover brief refuses case-specific invention', () => {
  const brief = buildSfiCaseCoverBrief({ caseId: 'CASE-EMPTY', sourceEvidenceRefs: [] });
  assert.match(brief.prompt, /do not invent actor, place, company, rupture, outcome or logo/i);
});

test('Unifont parser preserves requested glyph identities across scripts', () => {
  const requested = new Set([0x738b, 0x0416, 0x0639]);
  const source = [
    `0416:${'18'.repeat(16)}`,
    `0639:${'3C'.repeat(16)}`,
    `738B:${'0180'.repeat(16)}`,
  ].join('\n');
  const parsed = parseUnifontHex(source, requested);
  assert.equal(parsed.get(0x738b)?.width, 16);
  assert.equal(parsed.get(0x0416)?.width, 8);
  assert.equal(parsed.get(0x0639)?.rows.length, 16);
});

test('private brief renderer emits deterministic Type3 PDF with authored Unicode ToUnicode mappings', () => {
  const refs = [evidence('evidence:a', 'v1', 'sha256:abc')];
  const coverBrief = buildSfiCaseCoverBrief({ caseId: 'CASE-001', sourceEvidenceRefs: refs });
  const input: PrivateCaseBriefRenderInput = {
    caseId: 'CASE-001',
    version: '20260909000100123-abcd1234',
    subject: 'Decisión pública — México / 王 / Ж / ع',
    scope: 'Reconstrucción bounded: señal, fricción y continuidad.',
    generatedAt: '2026-09-09T06:20:00.000Z',
    evidenceRefs: refs,
    coverBrief,
  };
  const glyphs = fixtureGlyphs(input);
  const first = renderPrivateCaseBriefPdf(input, glyphs);
  const second = renderPrivateCaseBriefPdf(input, glyphs);
  const raw = first.toString('ascii');
  assert.ok(first.byteLength > 1200);
  assert.equal(first.subarray(0, 8).toString('ascii'), '%PDF-1.4');
  assert.match(first.subarray(-32).toString('ascii'), /%%EOF/);
  assert.match(raw, /\/Subtype \/Type3/);
  assert.match(raw, /\/ToUnicode/);
  assert.match(raw, /<[0-9A-F]{2}> <738B>/, 'Chinese authored code point must have a real ToUnicode mapping');
  assert.match(raw, /<[0-9A-F]{2}> <0416>/, 'Cyrillic authored code point must have a real ToUnicode mapping');
  assert.match(raw, /<[0-9A-F]{2}> <0639>/, 'Arabic authored code point must have a real ToUnicode mapping');
  assert.doesNotMatch(raw, /<U\+[0-9A-F]+>/, 'code-point escape notation is not a glyph');
  assert.equal(sha256Hex(first), sha256Hex(second));
  assert.equal(first.equals(second), true);
});

test('detail renderer paginates long evidence lineage instead of clipping it', () => {
  const refs = Array.from({ length: 140 }, (_, index) => evidence(`evidence:${String(index).padStart(3, '0')}`, `v${index}`, `hash-${index}`));
  const coverBrief = buildSfiCaseCoverBrief({ caseId: 'CASE-LONG', sourceEvidenceRefs: refs });
  const input: PrivateCaseBriefRenderInput = {
    caseId: 'CASE-LONG',
    version: '20260909000100123-long',
    subject: 'Long evidence case',
    scope: 'A deliberately long detail section that must continue across multiple pages.',
    generatedAt: '2026-09-09T06:20:00.000Z',
    evidenceRefs: refs,
    coverBrief,
  };
  const pdf = renderPrivateCaseBriefPdf(input, fixtureGlyphs(input));
  const raw = pdf.toString('ascii');
  const count = Number(raw.match(/\/Count (\d+)/)?.[1] ?? '0');
  assert.ok(count >= 5, `expected multi-page PDF, got ${count} pages`);
  assert.match(raw, /\/ToUnicode/);
  assert.doesNotMatch(raw, /<U\+/);
});
