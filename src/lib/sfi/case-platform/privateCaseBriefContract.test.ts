import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSfiCaseCoverBrief, renderPrivateCaseBriefPdf, sha256Hex } from './privateCaseBriefContract';

const evidence = (id: string, version: string | null = null, hash: string | null = null) => ({ id, version, hash });

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

test('private brief renderer emits deterministic PDF and preserves international text without question-mark loss', () => {
  const refs = [evidence('evidence:a', 'v1', 'sha256:abc')];
  const coverBrief = buildSfiCaseCoverBrief({ caseId: 'CASE-001', sourceEvidenceRefs: refs });
  const input = {
    caseId: 'CASE-001',
    version: '20260909000100123-abcd1234',
    subject: 'Decisión pública — México / 王',
    scope: 'Reconstrucción bounded: señal, fricción y continuidad.',
    generatedAt: '2026-09-09T06:20:00.000Z',
    evidenceRefs: refs,
    coverBrief,
  };
  const first = renderPrivateCaseBriefPdf(input);
  const second = renderPrivateCaseBriefPdf(input);
  const raw = first.toString('ascii');
  assert.ok(first.byteLength > 1200);
  assert.equal(first.subarray(0, 8).toString('ascii'), '%PDF-1.4');
  assert.match(first.subarray(-32).toString('ascii'), /%%EOF/);
  assert.match(raw, /WinAnsiEncoding/);
  assert.match(raw, /<U\+738B>/, 'non-WinAnsi characters must preserve their Unicode code point visibly');
  assert.doesNotMatch(raw, /Decisi\?n|M\?xico|Reconstrucci\?n/);
  assert.equal(sha256Hex(first), sha256Hex(second));
  assert.equal(first.equals(second), true);
});

test('detail renderer paginates long evidence lineage instead of clipping it', () => {
  const refs = Array.from({ length: 140 }, (_, index) => evidence(`evidence:${String(index).padStart(3, '0')}`, `v${index}`, `hash-${index}`));
  const coverBrief = buildSfiCaseCoverBrief({ caseId: 'CASE-LONG', sourceEvidenceRefs: refs });
  const pdf = renderPrivateCaseBriefPdf({
    caseId: 'CASE-LONG',
    version: '20260909000100123-long',
    subject: 'Long evidence case',
    scope: 'A deliberately long detail section that must continue across multiple pages.',
    generatedAt: '2026-09-09T06:20:00.000Z',
    evidenceRefs: refs,
    coverBrief,
  });
  const raw = pdf.toString('ascii');
  const count = Number(raw.match(/\/Count (\d+)/)?.[1] ?? '0');
  assert.ok(count >= 5, `expected multi-page PDF, got ${count} pages`);
  assert.match(raw, /evidence:139@v139#hash-139/);
  assert.match(raw, /Publication requires separate human\/governance authorization/);
});
