import assert from 'node:assert/strict';
import {
  verifyCognitiveExecutionReceipt,
  type ExpectedCognitiveReceipt,
} from '../src/lib/sfi/cognitive-runtime/executionReceiptVerification';

const expected: ExpectedCognitiveReceipt = {
  eventId: 'event-1',
  executionId: 'execution-1',
  logbookId: 'root_manual:execution-1',
  agentId: 'temporal_resolver',
  missionId: 'SFI-C06:temporal_resolver',
  executed: true,
};
const event = {
  event_id: expected.eventId,
  event_name: 'SFI_AGENT_EXECUTED',
  logbook_id: expected.logbookId,
  source: { sourceId: expected.agentId, sourceType: 'runtime' },
  payload: {
    executionId: expected.executionId,
    metadata: { refs: { missionId: expected.missionId } },
  },
  hash_self: 'observed-hash-placeholder-for-isolated-validation',
};

assert.deepEqual(verifyCognitiveExecutionReceipt(event, expected), {
  ok: true, status: 'READ_BACK_CONFIRMED', eventId: 'event-1',
  hash: 'observed-hash-placeholder-for-isolated-validation',
});
const failures: Array<[string, object, ExpectedCognitiveReceipt, string]> = [
  ['missing row', {}, expected, 'EVENT_ID_MISMATCH'],
  ['different event id', { ...event, event_id: 'another-event' }, expected, 'EVENT_ID_MISMATCH'],
  ['skipped instead of executed', { ...event, event_name: 'SFI_AGENT_SKIPPED' }, expected, 'EVENT_STATUS_MISMATCH'],
  ['cross-logbook', { ...event, logbook_id: 'another-logbook' }, expected, 'LOGBOOK_ID_MISMATCH'],
  ['other agent', { ...event, source: { sourceId: 'risk_agent' } }, expected, 'AGENT_ID_MISMATCH'],
  ['other execution', { ...event, payload: { ...event.payload, executionId: 'other' } }, expected, 'EXECUTION_ID_MISMATCH'],
  ['other mission', { ...event, payload: { ...event.payload, metadata: { refs: { missionId: 'SFI-C06:risk_agent' } } } }, expected, 'MISSION_ID_MISMATCH'],
  ['no stored hash', { ...event, hash_self: '' }, expected, 'PERSISTED_HASH_MISSING'],
  ['missing expected id', event, { ...expected, executionId: '' }, 'EXPECTED_IDENTITY_INVALID'],
];
for (const [name, observed, expectation, reason] of failures) {
  assert.deepEqual(verifyCognitiveExecutionReceipt(observed, expectation), {
    ok: false, status: 'READ_BACK_REJECTED', reason,
  }, name);
}
const skipped = {
  ...event, event_name: 'SFI_AGENT_SKIPPED',
};
assert.equal(verifyCognitiveExecutionReceipt(skipped, { ...expected, executed: false }).ok, true);
assert.equal(verifyCognitiveExecutionReceipt(event, { ...expected, executed: false }).ok, false);

console.log(JSON.stringify({
  pass: 'C07_INDEPENDENT_RECEIPT_READBACK_VALIDATOR',
  checks: failures.length + 3,
  testKind: 'ISOLATED_PURE_VERIFICATION',
  liveDatabaseTouched: false,
  runtimeExecutionPerformed: false,
  returnObserved: false,
}));
