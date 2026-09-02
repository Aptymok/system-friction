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

console.log(JSON.stringify({
  ok: true,
  contractVersion: SFI_EXECUTION_CONTRACT_VERSION,
  registeredAgents: registeredIds.length,
  executionContracts: contracts.length,
  crossImpactMinimumTargets: crossImpact.minTargets,
  crossImpactSyntheticCouplingRemoved: crossState.couplingIndex === null,
  legacyAdapterObserved: legacy.legacyCompatibilityUsed,
}, null, 2));
