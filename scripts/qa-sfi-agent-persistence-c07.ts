import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { persistSFIEvent } from '../src/lib/sfi/cognitive-runtime/eventPersistence';
import type { SFIEvent } from '../src/lib/sfi/cognitive-runtime/eventBus';

async function verify(): Promise<void> {
  const event: SFIEvent = {
    id: 'c07-isolated-receipt-001',
    type: 'SFI_AGENT_EXECUTED',
    agentId: 'temporal_resolver',
    timestamp: '2026-10-24T00:00:00.000Z',
    payload: { executionId: 'isolated-c07', logbookId: 'c07-isolated-no-db' },
  };
  let appendCalls = 0;
  const receipt = await persistSFIEvent(event, async (input) => {
    appendCalls += 1;
    assert.equal(input.eventId, event.id);
    assert.equal(input.eventName, event.type);
    assert.equal(input.logbookId, 'c07-isolated-no-db');
    return { ok: true as const, data: { event_id: event.id } };
  });
  assert.equal(appendCalls, 1);
  assert.equal(receipt.id, event.id);
  assert.equal(receipt.agentId, event.agentId);
  assert.equal(receipt.eventType, 'SFI_AGENT_EXECUTED');

  await assert.rejects(
    persistSFIEvent(event, async () => ({
      ok: false as const,
      error: 'epistemic_atomic_append_failed',
    })),
    /SFI_EVENT_PERSISTENCE_FAILED:epistemic_atomic_append_failed/,
    'a failed write must never produce a persisted receipt',
  );
  await assert.rejects(
    persistSFIEvent(event, async () => ({
      ok: true as const,
      data: { event_id: 'unexpected-other-event' },
    })),
    /SFI_EVENT_PERSISTENCE_RECEIPT_MISMATCH/,
    'an acknowledgement for a different event must fail closed',
  );
  await assert.rejects(
    persistSFIEvent(event, async () => {
      throw new Error('database-unavailable');
    }),
    /database-unavailable/,
    'a transport failure must not be interpreted as successful persistence',
  );

  const repository = readFileSync('src/infrastructure/events/cognitiveRuntimeEventRepository.ts', 'utf8');
  const persistedIndex = repository.indexOf('await persistSFIEvent(event)');
  const publishedIndex = repository.indexOf('emitSFIEvent(event)');
  assert.ok(persistedIndex !== -1 && publishedIndex > persistedIndex,
    'in-process consumers must only be notified after durable acknowledgement');

  console.log(JSON.stringify({
    pass: 'C07_DURABLE_AGENT_EVENT_ACKNOWLEDGEMENT',
    cases: ['ack_identity', 'write_denied', 'wrong_receipt', 'transport_failure', 'persist_before_broadcast'],
    isolated: true,
    liveDatabaseTouched: false,
    agentExecutionClaimed: false,
    returnObserved: false,
  }));
}

verify().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
