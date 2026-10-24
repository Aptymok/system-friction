import assert from 'node:assert/strict';
import { createKernelContext } from '../src/lib/sfi/cognitive-runtime/createKernelContext';
import { runCognitiveAgent } from '../src/lib/sfi/cognitive-runtime/runtimeAgentExecutor';

const agentId = 'temporal_resolver';
function context() {
  const ctx = createKernelContext('isolated-c07-cycle', 'isolated-c07-logbook', 'SFI_TASK_CREATED');
  ctx.metadata = {
    executionId: 'isolated-c07-execution',
    missionId: 'SFI-C06:temporal_resolver',
    actorId: 'isolated-authenticated-test',
    executionRequestSource: 'ROOT_MANUAL',
    executionRequest: {
      purpose: 'Check chronology from authorized sources',
      targets: [{kind: 'CASE', id: 'isolated-case'}],
      anchors: [{kind: 'CASE', id: 'isolated-case'}],
    },
  };
  return ctx;
}

async function run() {
  let executedCalls = 0;
  let durableCalls = 0;
  const result = await runCognitiveAgent(agentId, context(), {
    executeAgent: (_agentId, ctx) => {
      executedCalls += 1;
      return ctx;
    },
    recordExecutionEvent: async (id, name, payload) => {
      durableCalls += 1;
      assert.equal(id, agentId);
      assert.ok(name === 'SFI_AGENT_EXECUTED' || name === 'SFI_AGENT_SKIPPED');
      const p = payload as Record<string, any>;
      assert.equal(p.executionId, 'isolated-c07-execution');
      assert.equal(p.metadata?.refs?.missionId, 'SFI-C06:temporal_resolver');
      return {
        id: 'isolated-persisted-event-001',
        eventType: name,
        agentId: id,
        payload,
        createdAt: '2026-10-24T00:00:00.000Z',
      };
    },
  });
  assert.equal(durableCalls, 1);
  assert.equal(result.receipt?.eventId, 'isolated-persisted-event-001');
  assert.equal(result.receipt?.acknowledgement, 'PERSISTED');
  assert.equal(result.receipt?.eventName, result.executed ? 'SFI_AGENT_EXECUTED' : 'SFI_AGENT_SKIPPED');
  assert.ok(executedCalls === 0 || executedCalls === 1);

  await assert.rejects(runCognitiveAgent(agentId, context(), {
    executeAgent: (_agentId, ctx) => ctx,
    recordExecutionEvent: async () => { throw new Error('atomic-append-unavailable'); },
  }), /atomic-append-unavailable/, 'a failed acknowledgement cannot return a completed agent run');

  console.log(JSON.stringify({
    pass: 'C07_RUNTIME_RECEIPT_LINK',
    agentId,
    durableCalls,
    returnedExactAcknowledgement: true,
    missingPersistenceFailsClosed: true,
    liveDatabaseTouched: false,
    realAgentActivationClaimed: false,
    returnObserved: false,
  }));
}
run().catch(e=>{console.error(e);process.exitCode=1});
