import assert from 'node:assert/strict';
import { canonicalizeEvidenceRows } from '../src/lib/evidence/canonicalEvidence';

const hash = 'a'.repeat(64);
const canonical = canonicalizeEvidenceRows([
  {
    id: 'root-1',
    evidence_hash: hash,
    title: 'Evidence A',
    evidence_type: 'document',
    payload: { metadata: { module: 'atlas', evidenceKey: 'evidence-a', epistemicClass: 'IMPORTED_PROVENANCE' } },
    created_at: '2026-08-09T00:00:00Z',
  },
], [
  {
    id: 'ledger-1',
    evidence_hash: hash,
    module: 'atlas',
    evidence_kind: 'longitudinal_report',
    source_name: 'Evidence A',
    public_summary: { title: 'Evidence A', evidenceKey: 'evidence-a', epistemicClass: 'IMPORTED_PROVENANCE' },
    trust_level: 'provenance_observed',
    trust_score: 1,
    observed_at: '2026-08-09T00:00:00Z',
    created_at: '2026-08-09T00:00:01Z',
  },
]);

assert.equal(canonical.length, 1, 'ROOT + ledger persistence must resolve to one evidence object');
assert.equal(canonical[0].nodeId, `evidence:${hash.slice(0, 24)}`);
assert.ok(canonical[0].provenance.includes('root_evidence_entries'));
assert.ok(canonical[0].provenance.includes('sfi_evidence_ledger'));
assert.equal(canonical[0].module, 'atlas');

console.log(JSON.stringify({
  ok: true,
  invariant: 'one evidence hash = one canonical evidence object',
  canonicalObjects: canonical.length,
  nodeId: canonical[0].nodeId,
  provenance: canonical[0].provenance,
}, null, 2));
