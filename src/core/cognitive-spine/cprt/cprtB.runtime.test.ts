import assert from 'node:assert/strict';
import test from 'node:test';

import { MetaOrchestratorAgent } from '../../agents/metaOrchestrator';
import type { KernelContext } from '../../contracts';
import { COGNITIVE_TWIN_CONTRACT_VERSION } from '../../cognitive-twin/contract';
import { materializeCognitiveSnapshot } from '../projector/cognitiveStateProjector';
import { buildRuntimeCognitiveSpineProjection } from '../runtime/kernelProjection';
import { buildCognitiveContextConsumptionTrace } from '../trace/consumptionTrace';
import { cprtAProjectionInputA } from './fixture';

function runtimeSnapshot() {
  const input = cprtAProjectionInputA();
  input.records.push(
    {
      ref: 'MEM-001',
      kind: 'MEMORY',
      recordedAt: '2026-08-16T07:10:00.000Z',
      sourceHash: '1'.repeat(64),
      visibilityProfiles: ['RUNTIME_GENERAL_CONTEXT_V1'],
      debtType: 'VERIFICATION',
    },
    {
      ref: 'DEC-001',
      kind: 'DECISION',
      recordedAt: '2026-08-16T07:11:00.000Z',
      sourceHash: '2'.repeat(64),
      visibilityProfiles: ['RUNTIME_GENERAL_CONTEXT_V1'],
    },
  );
  input.projectionProfile = 'RUNTIME_GENERAL_CONTEXT_V1';
  return materializeCognitiveSnapshot(input, {
    snapshotId: 'CT-RUNTIME-FIXTURE',
    createdAt: '2026-08-16T07:30:00.000Z',
  });
}

function twinContext() {
  return {
    contractVersion: COGNITIVE_TWIN_CONTRACT_VERSION,
    memory: [{
      key: 'MEM-001',
      type: 'RULE_CANDIDATE',
      status: 'CANDIDATE',
      content: { rule: 'request more evidence under uncertainty' },
      evidenceRefs: ['EVID-001'],
      version: 'fixture-v1',
    }],
    decisions: [{
      id: 'DEC-001',
      situation: 'verification debt present',
      correctState: 'REQUEST_EVIDENCE',
      generalRule: 'Do not promote uncertainty by repetition.',
      requiredEvidence: ['independent observation'],
      evidenceRefs: ['EVID-001'],
    }],
    warnings: [],
  };
}

function baseKernelContext(metadata: Record<string, unknown> = {}): KernelContext {
  return {
    trace: {
      logbookId: 'CPRT-B-RUNTIME',
      correlationId: 'CPRT-B-RUNTIME-001',
      initiatedBy: 'CPRT-B',
      createdAt: '2026-08-16T07:30:00.000Z',
    },
    input: { fixture: true },
    taskId: 'CPRT-B-RUNTIME-TASK',
    currentEvent: 'CPRT_B_RUNTIME_FIXTURE',
    evidence: [{
      id: 'EVID-OBSERVED-001',
      source: 'fixture:observed',
      confidence: 1,
      payload: { observed: true },
    }],
    hypotheses: [{
      id: 'H-FIXTURE-001',
      statement: 'A bounded prior context may alter verification planning.',
      confidence: 0.5,
    }],
    contradictions: [],
    simulations: [],
    risks: [],
    opportunities: [],
    predictions: [],
    metadata,
  };
}

test('CPRT-B Runtime: one sealed snapshot reconstructs available and consumed state', () => {
  const snapshot = runtimeSnapshot();
  const trace = buildCognitiveContextConsumptionTrace({
    executionId: 'CPRT-B-RUNTIME-001',
    ctSnapshotAvailable: snapshot.snapshotId,
    ctSnapshotHashAvailable: snapshot.snapshotHash,
    ctSnapshotConsumed: true,
    consumedSnapshotId: snapshot.snapshotId,
    consumedSnapshotHash: snapshot.snapshotHash,
    projectionProfile: snapshot.semanticPayload.projectionProfile,
    profileVersion: '1.0',
    consumptionReason: 'CPRT-B runtime fixture',
    recordedAt: '2026-08-16T07:30:00.000Z',
  });
  const projection = buildRuntimeCognitiveSpineProjection({
    snapshot,
    trace,
    cognitiveTwinContext: twinContext(),
  });

  assert.equal(projection.snapshotId, 'CT-RUNTIME-FIXTURE');
  assert.equal(projection.ctSnapshotConsumed, true);
  assert.deepEqual(projection.memoryRefs, ['MEM-001']);
  assert.deepEqual(projection.decisionRefs, ['DEC-001']);
  assert.equal(projection.verificationDebt.absolute, 2);
  assert.equal(projection.cognitiveTwinContext?.memory.length, 1);
  assert.equal(projection.cognitiveTwinContext?.decisions.length, 1);
});

test('CPRT-B Runtime: available but not consumed snapshot exposes no Twin content', () => {
  const snapshot = runtimeSnapshot();
  const trace = buildCognitiveContextConsumptionTrace({
    executionId: 'CPRT-B-RUNTIME-ABLATION',
    ctSnapshotAvailable: snapshot.snapshotId,
    ctSnapshotHashAvailable: snapshot.snapshotHash,
    ctSnapshotConsumed: false,
    recordedAt: '2026-08-16T07:30:00.000Z',
  });
  const projection = buildRuntimeCognitiveSpineProjection({
    snapshot,
    trace,
    cognitiveTwinContext: twinContext(),
  });

  assert.equal(projection.ctSnapshotAvailable, true);
  assert.equal(projection.ctSnapshotConsumed, false);
  assert.equal(projection.cognitiveTwinContext, null);
});

test('CPRT-B Runtime: CT verification debt changes planning without becoming evidence', async () => {
  const snapshot = runtimeSnapshot();
  const trace = buildCognitiveContextConsumptionTrace({
    executionId: 'CPRT-B-RUNTIME-PLAN',
    ctSnapshotAvailable: snapshot.snapshotId,
    ctSnapshotHashAvailable: snapshot.snapshotHash,
    ctSnapshotConsumed: true,
    consumedSnapshotId: snapshot.snapshotId,
    consumedSnapshotHash: snapshot.snapshotHash,
    projectionProfile: snapshot.semanticPayload.projectionProfile,
    profileVersion: '1.0',
    consumptionReason: 'CPRT-B planning ablation fixture',
    recordedAt: '2026-08-16T07:30:00.000Z',
  });
  const projection = buildRuntimeCognitiveSpineProjection({
    snapshot,
    trace,
    cognitiveTwinContext: twinContext(),
  });

  const withCt = baseKernelContext({ cognitiveSpine: projection });
  const withoutCt = baseKernelContext({});
  const agent = new MetaOrchestratorAgent();

  const withCtResult = await agent.execute(withCt);
  const withoutCtResult = await agent.execute(withoutCt);
  const withPlan = withCtResult.output as { plan: { requiredAgents: string[]; missingInputs: string[] } };
  const withoutPlan = withoutCtResult.output as { plan: { requiredAgents: string[]; missingInputs: string[] } };

  assert.ok(withPlan.plan.requiredAgents.includes('evidence_hunter'));
  assert.ok(withPlan.plan.missingInputs.includes('cognitive_spine_verification_debt'));
  assert.equal(withoutPlan.plan.requiredAgents.includes('evidence_hunter'), false);
  assert.equal(withoutPlan.plan.missingInputs.includes('cognitive_spine_verification_debt'), false);

  const ctEvidenceSources = withCt.evidence
    .map((item) => item.source)
    .filter((source) => /cognitive.?spine|cognitive.?twin|MEM-001|DEC-001/i.test(source));
  assert.deepEqual(ctEvidenceSources, []);
});

test('CPRT-B Runtime: scope remains incomplete beyond execution and preserves gaps', () => {
  const requiredGaps = [
    'proposal_not_produced_by_institutional_cycle',
    'root_action_not_part_of_institutional_cycle',
    'intervention_not_part_of_institutional_cycle',
    'observed_return_not_part_of_institutional_cycle',
    'next_state_transition_not_materialized_in_same_cycle',
  ];

  assert.equal(requiredGaps.length, 5);
  // This fixture deliberately does not declare the global CPRT-B gate passed.
  // The next implementation stage must eliminate these gaps with preserved
  // proposal → ROOT → intervention → return → transition provenance.
});
