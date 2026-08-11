import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalizeEvidenceRows } from './canonicalEvidence';

test('same evidence hash across ROOT and ledger becomes one canonical object', () => {
  const hash = 'a'.repeat(64);
  const objects = canonicalizeEvidenceRows([
    {
      id: 'root-1',
      evidence_hash: hash,
      title: 'Canonical object',
      evidence_type: 'document',
      payload: { metadata: { module: 'atlas', evidenceKey: 'atlas-1', epistemicClass: 'IMPORTED_PROVENANCE' } },
      created_at: '2026-08-09T00:00:00Z',
    },
  ], [
    {
      id: 'ledger-1',
      evidence_hash: hash,
      module: 'atlas',
      evidence_kind: 'longitudinal_report',
      source_name: 'SFI',
      public_summary: { title: 'Canonical object', evidenceKey: 'atlas-1', epistemicClass: 'IMPORTED_PROVENANCE' },
      trust_level: 'provenance_observed',
      trust_score: 1,
      observed_at: '2026-08-09T00:00:00Z',
      created_at: '2026-08-09T00:00:01Z',
    },
  ]);

  assert.equal(objects.length, 1);
  assert.equal(objects[0].nodeId, `evidence:${hash.slice(0, 24)}`);
  assert.deepEqual(objects[0].rootEvidenceIds, ['root-1']);
  assert.deepEqual(objects[0].ledgerEvidenceIds, ['ledger-1']);
  assert.deepEqual(objects[0].provenance.sort(), ['root_evidence_entries', 'sfi_evidence_ledger'].sort());
  assert.equal(objects[0].module, 'atlas');
});

test('different evidence hashes remain distinct canonical objects', () => {
  const objects = canonicalizeEvidenceRows([
    { id: 'root-1', evidence_hash: '1'.repeat(64), title: 'One', payload: {}, created_at: '2026-08-01T00:00:00Z' },
    { id: 'root-2', evidence_hash: '2'.repeat(64), title: 'Two', payload: {}, created_at: '2026-08-02T00:00:00Z' },
  ], []);
  assert.equal(objects.length, 2);
  assert.notEqual(objects[0].nodeId, objects[1].nodeId);
});

test('persistence duplication does not increase evidence object count', () => {
  const hash = 'f'.repeat(64);
  const objects = canonicalizeEvidenceRows(
    [
      { id: 'root-1', evidence_hash: hash, title: 'Object', payload: {}, created_at: '2026-08-01T00:00:00Z' },
      { id: 'root-2', evidence_hash: hash, title: 'Object', payload: {}, created_at: '2026-08-01T00:00:00Z' },
    ],
    [
      { id: 'ledger-1', evidence_hash: hash, source_name: 'Object', public_summary: {}, trust_score: 1, created_at: '2026-08-01T00:00:00Z' },
    ],
  );
  assert.equal(objects.length, 1);
  assert.equal(objects[0].rootEvidenceIds.length, 2);
  assert.equal(objects[0].ledgerEvidenceIds.length, 1);
});
