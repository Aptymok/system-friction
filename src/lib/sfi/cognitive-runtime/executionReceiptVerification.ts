/**
 * C07: independent persisted event readback must match the exact runtime
 * acknowledgement and mission lineage. These checks do not grant authority,
 * certify an external outcome or promote records to evidence.
 */
type Row = Record<string, unknown>;
export type ExpectedCognitiveReceipt = {
  eventId: string;
  executionId: string;
  logbookId: string;
  agentId: string;
  missionId: string | null;
  executed: boolean;
};
export type CognitiveReceiptVerification =
  | { ok: true; status: 'READ_BACK_CONFIRMED'; eventId: string; hash: string }
  | { ok: false; status: 'READ_BACK_REJECTED'; reason: string };

function row(value: unknown): Row {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Row : {};
}
function validString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
export function verifyCognitiveExecutionReceipt(
  observed: unknown,
  expected: ExpectedCognitiveReceipt,
): CognitiveReceiptVerification {
  const event = row(observed);
  const payload = row(event.payload);
  const metadata = row(payload.metadata);
  const refs = row(metadata.refs);
  const source = row(event.source);
  const expectedEvent = expected.executed ? 'SFI_AGENT_EXECUTED' : 'SFI_AGENT_SKIPPED';

  if (!validString(expected.eventId) || !validString(expected.executionId)
    || !validString(expected.logbookId) || !validString(expected.agentId)) {
    return { ok: false, status: 'READ_BACK_REJECTED', reason: 'EXPECTED_IDENTITY_INVALID' };
  }
  if (event.event_id !== expected.eventId) {
    return { ok: false, status: 'READ_BACK_REJECTED', reason: 'EVENT_ID_MISMATCH' };
  }
  if (event.event_name !== expectedEvent) {
    return { ok: false, status: 'READ_BACK_REJECTED', reason: 'EVENT_STATUS_MISMATCH' };
  }
  if (event.logbook_id !== expected.logbookId) {
    return { ok: false, status: 'READ_BACK_REJECTED', reason: 'LOGBOOK_ID_MISMATCH' };
  }
  if (source.sourceId !== expected.agentId) {
    return { ok: false, status: 'READ_BACK_REJECTED', reason: 'AGENT_ID_MISMATCH' };
  }
  if (payload.executionId !== expected.executionId) {
    return { ok: false, status: 'READ_BACK_REJECTED', reason: 'EXECUTION_ID_MISMATCH' };
  }
  if ((refs.missionId ?? null) !== expected.missionId) {
    return { ok: false, status: 'READ_BACK_REJECTED', reason: 'MISSION_ID_MISMATCH' };
  }
  if (!validString(event.hash_self)) {
    return { ok: false, status: 'READ_BACK_REJECTED', reason: 'PERSISTED_HASH_MISSING' };
  }
  return {
    ok: true, status: 'READ_BACK_CONFIRMED',
    eventId: expected.eventId, hash: event.hash_self,
  };
}
