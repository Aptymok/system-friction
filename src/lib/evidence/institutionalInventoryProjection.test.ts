import test from 'node:test';
import assert from 'node:assert/strict';
import {
  projectRootEvidence, projectLedgerEvidence, projectOperationalEvent,
} from './institutionalInventoryProjection';

test('ROOT capture is not a verified claim and does not leak payload', () => {
  const item = projectRootEvidence({
    id: 'root-a', title: 'Document captured', evidence_type: 'document',
    evidence_hash: 'hash1', created_at: '2026-10-21T06:00:00Z',
    content: 'PRIVATE CASE TEXT', actor_id: 'PRIVATE_ACTOR',
    payload: { secret: 'PRIVATE_SENSITIVE_CONTENT' },
  });
  assert.equal(item.admission, 'ROOT_CAPTURED_UNVERIFIED_CLAIMS');
  assert.equal(item.source, 'root_evidence_entries');
  assert.equal(item.contentHash, 'hash1');
  assert.ok(!JSON.stringify(item).includes('PRIVATE_'));
});

test('institutional ledger is recorded, not automatically verified', () => {
  const item = projectLedgerEvidence({
    id: 'ledger-a', source_name: 'Operational continuity',
    evidence_kind: 'operational_state', observed_at: '2026-10-21T06:00:00Z',
    public_summary: { secret: 'PRIVATE_SUMMARY' },
  });
  assert.equal(item.admission, 'LEDGER_RECORDED_CHECK_STATUS');
  assert.equal(item.kind, 'operational_state');
  assert.ok(!JSON.stringify(item).includes('PRIVATE_'));
});

test('an observed event remains a non-admitted operational trace', () => {
  const item = projectOperationalEvent({
    event_id: 'evt-a', event_name: 'SFI_AGENT_EXECUTED', epistemic_class: 'observed',
    occurred_at: '2026-10-21T06:00:00Z', actor_id: 'PRIVATE_ACTOR',
    source: { id: 'PRIVATE_REFERENCE' }, payload: { customer: 'PRIVATE_CUSTOMER' },
  });
  assert.equal(item.epistemicClass, 'observed');
  assert.equal(item.admission, 'EVENT_NOT_ADMITTED');
  assert.equal(item.contentHash, null);
  assert.ok(!JSON.stringify(item).includes('PRIVATE_'));
});

test('missing metadata remains missing rather than fabricating an evidence id or timestamp', () => {
  const item = projectOperationalEvent({ event_name: 'UNKNOWN_EVENT' });
  assert.equal(item.ref, '');
  assert.equal(item.recordedAt, null);
  assert.equal(item.admission, 'EVENT_NOT_ADMITTED');
});
