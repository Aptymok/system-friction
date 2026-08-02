import assert from 'node:assert/strict';

import { CanonicalPipelineRunner, type PipelinePersistence } from '../src/core/runtime/pipeline';
import { canonicalAgents } from '../src/core/agents';
import { evaluateMemoryPolicy } from '../src/core/memory/memoryPolicyValidator';

class TestPersistence implements PipelinePersistence {
  async persist(event: Parameters<PipelinePersistence['persist']>[0]) {
    const isFinal = event.eventName === 'sfi.pipeline.execution.completed';
    return {
      eventName: event.eventName,
      agentId: event.agentId,
      persisted: true,
      epistemicEventId: `TEST_EVENT_${crypto.randomUUID()}`,
      memoryPromotion: {
        promoted: isFinal,
        reason: isFinal
          ? 'test_policy_accepts_completed_execution'
          : 'test_policy_denies_non_final_runtime_events',
        policySourceId: 'qa-sfi-core-runtime',
      },
      error: null,
    };
  }
}

function findAgent(result: Awaited<ReturnType<CanonicalPipelineRunner['run']>>, agentId: string) {
  const agent = result.agentResults.find((item) => item.agentId === agentId);
  assert.ok(agent, `${agentId} did not run`);
  return agent;
}

function trajectoryEvidence(result: Awaited<ReturnType<CanonicalPipelineRunner['run']>>) {
  return result.evidence.filter((item) => item.source === 'TrajectoryAgent');
}

async function main() {
  const runner = new CanonicalPipelineRunner(new TestPersistence());
  const result = await runner.run({
    capabilityId: 'CAPABILITY_CANONICAL_PIPELINE',
    actorId: 'QA_SFI_CORE_RUNTIME',
    actorRole: 'LOCAL_TEST',
    actorType: 'SYSTEM',
    permissions: ['MODEL_EXECUTE'],
    payload: {
      evidence: [{
        id: 'EVIDENCE_QA_001',
        source: 'sfi_phenomena.qa',
        confidence: 0.82,
        payload: {
          text: 'actor institucion comunidad mercado regulacion tecnologia riesgo oportunidad trayectoria inicial',
          timestamp: '2026-08-01T00:00:00.000Z',
        },
      }, {
        id: 'EVIDENCE_QA_002',
        source: 'sfi_phenomena.qa',
        confidence: 0.88,
        payload: {
          text: 'actor institucion comunidad mercado regulacion tecnologia riesgo oportunidad trayectoria cambio observado',
          timestamp: '2026-09-01T00:00:00.000Z',
        },
      }],
      hypotheses: [{
        id: 'HYPOTHESIS_QA_001',
        statement: 'institucion comunidad mercado regulacion tecnologia',
        confidence: 0.74,
      }],
      predictions: [{
        id: 'PREDICTION_QA_001',
        statement: 'institucion comunidad mercado regulacion tecnologia hacia 2026-12-01',
        description: 'Proyeccion temporal verificable para 2026-12-01 sobre institucion comunidad mercado regulacion tecnologia',
        confidence: 0.7,
      }],
    },
  });

  assert.equal(result.initialState.evidenceCount, 2, 'KernelContext initial evidence was not hydrated');
  assert.equal(result.agentResults.length, 17, 'Expected exactly 17 canonical agents');
  assert.equal(canonicalAgents.length, 17, 'canonicalAgents registry must contain 17 agents');
  assert.equal(result.agentResults.every((agent) => agent.trace.logbookId === result.trace.logbookId), true, 'Trace was not preserved');
  assert.equal(result.agentResults.every((agent) => Array.isArray(agent.evidence)), true, 'AgentResult.evidence must be an array');
  assert.equal(result.agentResults.every((agent) => typeof agent.executionTime === 'number'), true, 'AgentResult executionTime missing');
  assert.equal(
    result.evidence.every((item) => item && typeof item === 'object' && typeof item.id === 'string' && typeof item.source === 'string' && typeof item.confidence === 'number' && 'payload' in item),
    true,
    'Structured evidence contract broken'
  );
  assert.equal(JSON.stringify(result).includes('[object Object]'), false, 'Runtime leaked [object Object]');
  assert.equal(result.agentResults.some((agent) => (agent.output as any)?.reason === 'adapter-placeholder'), false, 'Placeholder result leaked');
  assert.equal(
    result.agentResults.some((agent) => agent.status === 'SUCCESS' && (agent.output as any)?.reason === 'executor_ran_without_new_structured_signal_for_current_input'),
    false,
    'Non-operational executor reported SUCCESS'
  );
  assert.equal(result.status, 'COMPLETED', 'Pipeline should complete when no critical agent failed');
  assert.equal(result.events.length >= 19, true, 'Expected persisted runtime events');
  assert.equal(result.events.every((event) => event.persisted === true), true, 'Runtime event did not persist through persistence boundary');
  assert.equal(result.memoryWrites.accepted, 1, 'Only final completed execution should be accepted by test policy');
  assert.equal(result.memoryWrites.rejected >= 18, true, 'Non-final runtime events should be rejected by policy');
  assert.equal(result.coverage.failed, 0, 'No agent should fail in QA fixture');
  assert.equal(result.coverage.agentsExecuted, 17, 'Coverage must reflect 17 executed agents');
  assert.equal(result.finalState.evidenceCount > result.initialState.evidenceCount, true, 'Agents did not generate evidence');
  assert.equal(
    result.agentStates.every((agent) => ['OPERATIONAL', 'BLOCKED', 'FAILED', 'EXECUTABLE'].includes(agent.status)),
    true,
    'Agent audit status invalid'
  );

  const evidenceHunter = findAgent(result, 'AGENT_EVIDENCE_HUNTER');
  assert.equal(evidenceHunter.status, 'SUCCESS', 'Evidence Hunter should be operational when it evaluates covered hypotheses');
  assert.equal(
    (evidenceHunter.output as any)?.reason,
    'evidence_hunter_evaluated_hypotheses_and_found_no_missing_evidence',
    'Evidence Hunter did not report its no-missing-evidence criterion'
  );

  const trajectory = findAgent(result, 'AGENT_TRAJECTORY');
  assert.equal(trajectory.trace.logbookId, result.trace.logbookId, 'Trajectory trace was not preserved');
  assert.equal(trajectory.status, 'SUCCESS', 'Trajectory Agent should be operational with sufficient temporal evidence');
  const trajectoryItems = trajectoryEvidence(result);
  assert.equal(trajectoryItems.length, 1, 'Trajectory Agent should generate exactly one trajectory evidence item');
  const trajectoryPayload = trajectoryItems[0]?.payload as any;
  assert.ok(trajectoryPayload && typeof trajectoryPayload === 'object', 'Trajectory payload must be structured');
  assert.ok(trajectoryPayload.subject, 'Trajectory subject is missing');
  assert.equal(Array.isArray(trajectoryPayload.timeline), true, 'Trajectory timeline missing');
  assert.equal(Array.isArray(trajectoryPayload.projected), true, 'Trajectory projections missing');
  assert.equal(
    trajectoryPayload.timeline.length + trajectoryPayload.projected.length >= 2,
    true,
    'Operational trajectory must contain at least two temporal points'
  );
  assert.equal(trajectoryPayload.evidenceIds.includes('EVIDENCE_QA_001'), true, 'Trajectory did not retain source evidence id');
  assert.equal(trajectoryPayload.evidenceIds.includes('EVIDENCE_QA_002'), true, 'Trajectory did not retain source evidence id');
  assert.equal(JSON.stringify(trajectoryPayload).includes('[object Object]'), false, 'Trajectory payload leaked [object Object]');

  const missingResult = await runner.run({
    capabilityId: 'CAPABILITY_CANONICAL_PIPELINE',
    actorId: 'QA_SFI_CORE_RUNTIME',
    actorRole: 'LOCAL_TEST',
    actorType: 'SYSTEM',
    permissions: ['MODEL_EXECUTE'],
    payload: {},
  });
  const missingTrajectory = findAgent(missingResult, 'AGENT_TRAJECTORY');
  assert.equal(missingTrajectory.status, 'PARTIAL', 'Trajectory Agent must be PARTIAL when temporal signals are missing');
  assert.equal(
    trajectoryEvidence(missingResult).length,
    0,
    'Trajectory Agent must not create synthetic trajectory evidence without temporal evidence'
  );

  const deny = await evaluateMemoryPolicy({
    id: 'TEST_DENY',
    event_id: 'TEST_DENY',
    event_name: 'sfi.pipeline.unknown_event',
    logbook_id: 'TEST_LOGBOOK',
    epistemic_class: 'derived',
    confidence: 0.9,
    payload: {},
    occurred_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    hash_self: 'TEST_HASH',
  });
  assert.equal(deny.shouldWrite, false, 'Memory policy must deny unknown events by default');

  console.log(JSON.stringify({
    ok: true,
    trace: result.trace.logbookId,
    status: result.status,
    agentsExecuted: result.coverage.agentsExecuted,
    operational: result.coverage.operational,
    partial: result.coverage.partial,
    evidenceItems: result.coverage.evidenceItems,
    trajectoryStatus: trajectory.status,
    trajectoryTemporalPoints: trajectoryPayload.timeline.length + trajectoryPayload.projected.length,
    evidenceHunterStatus: evidenceHunter.status,
    missingTrajectoryStatus: missingTrajectory.status,
    persistedEvents: result.events.length,
    memoryAccepted: result.memoryWrites.accepted,
    memoryRejected: result.memoryWrites.rejected,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
