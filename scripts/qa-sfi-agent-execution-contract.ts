import assert from 'node:assert/strict';
import { CrossImpactAgent } from '../src/lib/sfi/cognitive-runtime/agents/crossImpact';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '../src/lib/sfi/cognitive-runtime/convergedRegistry';
import {
  SFI_EXECUTION_CONTRACT_VERSION,
  executionContractForAgent,
  listExecutionContracts,
  normalizeExecutionRequest,
  validateExecutionRequest,
} from '../src/lib/sfi/cognitive-runtime/executionContracts';
import {
  SFI_EXECUTION_RECORD_VERSION,
  deriveExecutionEpistemicState,
  deriveExecutionWorkState,
  projectExecutionRecordFromEvent,
} from '../src/lib/sfi/cognitive-runtime/executionRecords';
import type { KernelContext } from '../src/lib/sfi/cognitive-runtime/kernelContext';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

const contracts = listExecutionContracts();
const registeredIds = [...new Set(SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map((agent) => agent.id))].sort();
const contractIds = [...new Set(contracts.map((contract) => contract.agentId))].sort();

assert.deepEqual(contractIds, registeredIds, 'every registered cognitive agent must resolve to exactly one execution contract');
assert.equal(contracts.length, registeredIds.length, 'execution contract catalog must not duplicate agent ids');

for (const contract of contracts) {
  assert.equal(contract.version, SFI_EXECUTION_CONTRACT_VERSION, `${contract.agentId}: contract version mismatch`);
  assert.ok(contract.purpose.trim().length > 0, `${contract.agentId}: purpose required`);
  assert.ok(contract.minTargets >= 1, `${contract.agentId}: minTargets must be >= 1`);
  assert.ok(contract.maxTargets >= contract.minTargets, `${contract.agentId}: maxTargets must be >= minTargets`);
  assert.ok(contract.allowedTargetKinds.length > 0, `${contract.agentId}: target kinds required`);
  assert.ok(contract.allowedAnchorKinds.includes('ANALYSIS_SESSION'), `${contract.agentId}: analysis session anchor must be available`);
  assert.ok(contract.requestedOutputs.length > 0, `${contract.agentId}: output classes required`);
  assert.ok(contract.forbiddenClaims.length > 0, `${contract.agentId}: at least one explicit epistemic/authority boundary required`);
}

const crossImpact = executionContractForAgent('cross_impact');
assert.ok(crossImpact, 'cross_impact contract missing');
assert.equal(crossImpact.minTargets, 2, 'cross_impact must require at least two targets');

const crossOne = normalizeExecutionRequest('cross_impact', {
  purpose: 'Evaluate coupling without asserting causality.',
  anchors: [{ kind: 'ANALYSIS_SESSION', id: 'analysis:test-one' }],
  targets: [{ kind: 'NODE', id: 'node-a' }],
  direction: 'EXPLORE',
}, 'run-test-one');
const crossOneValidation = validateExecutionRequest(crossImpact, crossOne);
assert.equal(crossOneValidation.ok, false, 'cross_impact must reject a one-target request');
assert.ok(crossOneValidation.errors.includes('minimum_targets_required:2'));

const crossTwo = normalizeExecutionRequest('cross_impact', {
  purpose: 'Evaluate coupling between A and B without converting association into causality.',
  anchors: [{ kind: 'ANALYSIS_SESSION', id: 'analysis:test-two' }],
  targets: [
    { kind: 'NODE', id: 'node-a' },
    { kind: 'NODE', id: 'node-b' },
  ],
  direction: 'BIDIRECTIONAL',
  timeRange: { from: '2026-07-01', to: '2026-07-31', timezone: 'America/Mexico_City' },
}, 'run-test-two');
const crossTwoValidation = validateExecutionRequest(crossImpact, crossTwo);
assert.equal(crossTwoValidation.ok, true, `cross_impact valid multi-target request rejected: ${crossTwoValidation.errors.join(',')}`);

const crossContext: KernelContext = {
  cycleId: 'cycle-cross-impact-qa',
  logbookId: 'logbook-cross-impact-qa',
  currentEvent: 'SFI_ROOT_MANUAL_AGENT_REQUESTED',
  evidence: [
    { id: 'target:NODE:node-a', source: 'ROOT_MANUAL_TARGET_CONTEXT', confidence: 1, payload: { epistemicClass: 'record', targetId: 'node-a' } },
    { id: 'target:NODE:node-b', source: 'ROOT_MANUAL_TARGET_CONTEXT', confidence: 1, payload: { epistemicClass: 'record', targetId: 'node-b' } },
  ],
  hypotheses: [],
  contradictions: [],
  simulations: [],
  predictions: [],
  risks: [],
  opportunities: [],
  metadata: {
    executionRequest: {
      targets: [
        { kind: 'NODE', id: 'node-a', title: 'Node A' },
        { kind: 'NODE', id: 'node-b', title: 'Node B' },
      ],
      direction: 'BIDIRECTIONAL',
      timeRange: { from: '2026-07-01', to: '2026-07-31', timezone: 'America/Mexico_City' },
    },
  },
};
CrossImpactAgent(crossContext);
const crossState = record(crossContext.metadata.crossImpact);
assert.equal(crossState.variables, 2, 'cross_impact must use explicit target identities as variables');
assert.equal(crossState.candidatePairCount, 1, 'two explicit targets must produce exactly one candidate pair');
assert.equal(crossState.couplingIndex, null, 'cross_impact must not manufacture a coupling index from target/source counts');
assert.equal(crossState.interactionDensity, null, 'cross_impact must keep unobserved interaction density missing');
assert.equal(crossState.measurementStatus, 'NOT_OBSERVED', 'cross_impact must expose that numeric coupling was not observed');

const evidenceHunter = executionContractForAgent('evidence_hunter');
assert.ok(evidenceHunter, 'evidence_hunter contract missing');
const legacy = normalizeExecutionRequest('evidence_hunter', {
  targetKind: 'CASE',
  targetId: 'case-legacy',
  instruction: 'Find source candidates relevant to the declared discrepancy.',
  url: 'https://example.org/source',
}, 'run-legacy');
const legacyValidation = validateExecutionRequest(evidenceHunter, legacy);
assert.equal(legacyValidation.ok, true, `legacy request must normalize into the canonical contract: ${legacyValidation.errors.join(',')}`);
assert.equal(legacy.legacyCompatibilityUsed, true, 'legacy compatibility use must be observable');
assert.equal(legacy.anchors[0]?.kind, 'ANALYSIS_SESSION', 'legacy requests must receive an explicit lineage anchor');
assert.ok(legacyValidation.warnings.includes('legacy_single_target_request_normalized'));

const invalidKind = normalizeExecutionRequest('cross_impact', {
  purpose: 'Invalid kind test',
  anchors: [{ kind: 'ANALYSIS_SESSION', id: 'analysis:invalid-kind' }],
  targets: [
    { kind: 'CASE', id: 'case-a' },
    { kind: 'NODE', id: 'node-b' },
  ],
}, 'run-invalid-kind');
const invalidKindValidation = validateExecutionRequest(crossImpact, invalidKind);
assert.equal(invalidKindValidation.ok, false, 'cross_impact must reject target kinds outside its contract');
assert.ok(invalidKindValidation.errors.includes('target_kind_not_allowed:CASE'));

// M1: reconstruct one exact run from the existing canonical epistemic event payload.
const executionEvent = {
  event_id: 'evt-run-98f2',
  event_name: 'SFI_AGENT_EXECUTED',
  occurred_at: '2026-09-02T14:31:00.000Z',
  source: { sourceId: 'cross_impact', sourceType: 'runtime' },
  payload: {
    executionId: 'RUN-98F2',
    executionContractVersion: SFI_EXECUTION_CONTRACT_VERSION,
    requestSource: 'ROOT_MANUAL',
    requestedBy: 'root-user',
    purpose: 'Evaluate possible A↔F transfer without asserting causality.',
    anchors: [{ kind: 'CASE', id: 'MAI-017', title: 'MAI 017' }],
    targets: [{ kind: 'NODE', id: 'A', title: 'Node A' }, { kind: 'NODE', id: 'F', title: 'Node F' }],
    epistemicBoundary: 'Context is not automatically evidence.',
    evidenceBefore: 47,
    evidenceAfter: 47,
    aiGovernancePolicyId: 'SFI-AIMS-2026-08',
    aiGovernance: { disposition: 'ALLOW_ANALYSIS_ONLY', risk: 'MEDIUM', reasons: ['simulation_must_remain_labeled'] },
    llmProvider: 'openai',
    llmModel: 'gpt-test',
    deterministicError: null,
    llmError: null,
    metadata: {
      refs: {
        contextCoverage: {
          llm: {
            evidenceAvailable: 47,
            evidenceDelivered: 6,
            hypothesesAvailable: 8,
            hypothesesDelivered: 5,
            contradictionsAvailable: 2,
            contradictionsDelivered: 2,
            promptSourceCharacters: 9000,
            promptCharacters: 6000,
            maxPromptCharacters: 6000,
            promptBounded: true,
          },
        },
      },
      agentInsight: {
        epistemicClass: 'INFERENCE',
        status: 'COMPLETE',
        summary: 'Possible transfer A → F.',
        observations: ['Six evidence objects were delivered to the bounded projection.'],
        hypotheses: ['A may transfer risk into F.'],
        contradictions: [],
        missingEvidence: ['41 available evidence objects were not delivered in this bounded run.'],
        recommendations: ['Expand context before treating the analysis as integral.'],
        confidence: 0.71,
        generatedAt: '2026-09-02T14:31:03.000Z',
      },
      llmRuntime: {
        observedInputTokens: null,
        observedOutputTokens: null,
        observedProviderCost: null,
      },
    },
  },
};

const executionRecord = projectExecutionRecordFromEvent(executionEvent);
assert.ok(executionRecord, 'canonical execution event must project into an execution record');
assert.equal(executionRecord.recordVersion, SFI_EXECUTION_RECORD_VERSION);
assert.equal(executionRecord.executionId, 'RUN-98F2');
assert.equal(executionRecord.agentId, 'cross_impact');
assert.equal(executionRecord.targets.length, 2, 'execution record must preserve multi-target scope');
assert.equal(executionRecord.anchors[0]?.id, 'MAI-017', 'execution record must preserve context anchor');
assert.equal(executionRecord.interpretation.epistemicClass, 'INFERENCE', 'LLM interpretation must remain inference');
assert.equal(executionRecord.interpretation.summary, 'Possible transfer A → F.');
assert.equal(executionRecord.contextCoverage.evidenceAvailable, 47);
assert.equal(executionRecord.contextCoverage.evidenceDelivered, 6);
assert.equal(executionRecord.contextCoverage.partial, true, 'bounded context must remain visibly partial');
assert.equal(executionRecord.authority, 'ANALYSIS_ONLY', 'governance disposition must remain distinct from work state');
assert.equal(executionRecord.telemetry.provider.observation, 'OBSERVED');
assert.equal(executionRecord.telemetry.inputTokens.observation, 'NOT_OBSERVED', 'unreported token usage must not be estimated');
assert.equal(executionRecord.telemetry.providerCost.observation, 'NOT_OBSERVED', 'unreported provider cost must not be estimated');
assert.equal(deriveExecutionWorkState(executionRecord), 'COMPLETE', 'completed run state must be derived from the concrete execution event');
assert.equal(deriveExecutionEpistemicState(executionRecord), 'PARTIAL', 'bounded/missing evidence must derive PARTIAL rather than SUFFICIENT');
assert.equal(projectExecutionRecordFromEvent({ event_name: 'SFI_TASK_CREATED' }), null, 'non-execution events must not masquerade as execution records');

const blockedRecord = projectExecutionRecordFromEvent({
  event_id: 'evt-blocked',
  event_name: 'SFI_AGENT_SKIPPED',
  occurred_at: '2026-09-02T14:40:00.000Z',
  source: { sourceId: 'risk_agent' },
  payload: {
    executionId: 'RUN-BLOCKED',
    aiGovernance: { disposition: 'BLOCK', risk: 'HIGH', reasons: ['external_effect_requires_governed_authority'] },
    deterministicError: 'AI_GOVERNANCE_BLOCK:external_effect_requires_governed_authority',
  },
});
assert.ok(blockedRecord);
assert.equal(blockedRecord.authority, 'BLOCKED');
assert.equal(deriveExecutionWorkState(blockedRecord), 'NOT_OBSERVED', 'governance block must not be mislabeled as a failed execution');

console.log(JSON.stringify({
  ok: true,
  contractVersion: SFI_EXECUTION_CONTRACT_VERSION,
  executionRecordVersion: SFI_EXECUTION_RECORD_VERSION,
  registeredAgents: registeredIds.length,
  executionContracts: contracts.length,
  crossImpactMinimumTargets: crossImpact.minTargets,
  crossImpactSyntheticCouplingRemoved: crossState.couplingIndex === null,
  executionRecordPreservesLineage: executionRecord.executionId === 'RUN-98F2',
  boundedContextRemainsPartial: executionRecord.contextCoverage.partial === true,
  unobservedCostRemainsMissing: executionRecord.telemetry.providerCost.observation === 'NOT_OBSERVED',
  legacyAdapterObserved: legacy.legacyCompatibilityUsed,
}, null, 2));
