import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assessCaseRevisionReplayBatch, assessCaseMirrorDelivery } from './verify_replay_batch.mjs';

function parent(revision = 2, previous = 1, opts = {}) {
  return {
    table_name: 'sfi_cases', operation: 'UPSERT', source_txid: '101',
    row_data: { id: 'case-a', closure_revision: revision, updated_at: '2026-10-24T11:20:00Z' },
    before_data: previous === null ? null : { id: 'case-a', closure_revision: previous },
    ...opts,
  };
}
function child(table_name = 'sfi_case_objects', opts = {}) {
  return {
    table_name, operation: 'UPSERT', source_txid: '101',
    row_data: { id: 'record-a', case_id: 'case-a', tenant_id: 'tenant-a' },
    before_data: null,
    ...opts,
  };
}
test('complete source transaction with a case revision snapshot is ready for isolated replay', () => {
  assert.deepEqual(assessCaseRevisionReplayBatch([child(), parent()], { requireTouchedCase: true }), {
    validated: true, blockers: [], caseCount: 1,
  });
});
test('child without its parent snapshot is blocked even if the queue is empty', () => {
  const result = assessCaseRevisionReplayBatch([child()]);
  assert.equal(result.validated, false);
  assert.ok(result.blockers.includes('REPLAY_PARENT_REVISION_SNAPSHOT_MISSING'));
});
test('one case updated twice in a single source transaction is valid', () => {
  const result = assessCaseRevisionReplayBatch([
    child(), parent(3, 2), parent(2, 1),
  ]);
  assert.equal(result.validated, true);
});
test('duplicate or malformed parent revisions cannot claim replay correctness', () => {
  const result = assessCaseRevisionReplayBatch([child(), parent(2, 1), parent(2, 1)]);
  assert.ok(result.blockers.includes('REPLAY_PARENT_REVISION_AMBIGUOUS'));
  const missingRevision = assessCaseRevisionReplayBatch([child(), parent(null, 1)]);
  assert.equal(missingRevision.validated, false);
  assert.ok(missingRevision.blockers.includes('REPLAY_PARENT_REVISION_INVALID'));
});
test('unchanged parent revision after a child mutation is blocked', () => {
  const result = assessCaseRevisionReplayBatch([child(), parent(1, 1)]);
  assert.ok(result.blockers.includes('REPLAY_PARENT_REVISION_NOT_ADVANCED'));
});
test('mixed source transactions and incomplete rows are blocked', () => {
  const result = assessCaseRevisionReplayBatch([
    child('sfi_case_reports', { source_txid: '200' }), parent(),
  ]);
  assert.ok(result.blockers.includes('REPLAY_TRANSACTION_MIXED'));
  const malformed = assessCaseRevisionReplayBatch([
    child('sfi_case_objects', { row_data: {} }),
  ]);
  assert.ok(malformed.blockers.includes('REPLAY_CASE_ID_MISSING'));
});
test('all four case-child write surfaces are checked', () => {
  for (const table of ['sfi_case_objects', 'sfi_case_reports', 'sfi_case_action_proposals', 'sfi_case_action_decisions']) {
    const result = assessCaseRevisionReplayBatch([child(table)]);
    assert.ok(result.blockers.includes('REPLAY_PARENT_REVISION_SNAPSHOT_MISSING'), table);
  }
});
test('empty and case-unrelated batches never claim a case-replay test', () => {
  assert.equal(assessCaseRevisionReplayBatch([]).validated, false);
  const result = assessCaseRevisionReplayBatch([{
    table_name: 'other_table', operation: 'UPSERT', source_txid: '101', row_data: { id: 'other' },
  }], { requireTouchedCase: true });
  assert.ok(result.blockers.includes('REPLAY_CASE_CHILD_REQUIRED'));
});

test('legacy case batches remain compatible before the closure migration activates', () => {
  const oldBatch = [child()];
  assert.deepEqual(assessCaseMirrorDelivery(oldBatch), {
    allowed: true, enforced: false, blockers: [], caseCount: 0,
  });
});
test('unrelated data-plane tables never require a case parent revision', () => {
  const batch = [{ table_name: 'sfi_studio_objects', operation: 'UPSERT',
    source_txid: '101', row_data: { id: 'studio-1' } }];
  assert.equal(assessCaseMirrorDelivery(batch, { strict: true }).allowed, true);
  assert.equal(assessCaseMirrorDelivery(batch, { strict: true }).enforced, false);
});
test('migrated parent snapshot automatically enables the case replay gate', () => {
  const correct = assessCaseMirrorDelivery([child(), parent()]);
  assert.equal(correct.allowed, true);
  assert.equal(correct.enforced, true);
  const stale = assessCaseMirrorDelivery([child(), parent(1, 1)]);
  assert.equal(stale.allowed, false);
  assert.ok(stale.blockers.includes('REPLAY_PARENT_REVISION_NOT_ADVANCED'));
});
test('explicit activation prevents silent child replay with missing parent', () => {
  const blocked = assessCaseMirrorDelivery([child()], { strict: true });
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.blockers.includes('REPLAY_PARENT_REVISION_SNAPSHOT_MISSING'));
});
test('empty replay batches fail closed even in legacy mode', () => {
  assert.equal(assessCaseMirrorDelivery([]).allowed, false);
});
