import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDecisionTransferEvaluation,
  evaluateCounterfactualProbes,
  evaluateDecisionHoldout,
  evaluateOperationPromotion,
  type CounterfactualProbe,
  type DecisionReconstruction,
  type DecisionTrace,
  type OperationOccurrence,
} from './decisionTransfer';

const expected: DecisionTrace[] = [
  {
    traceId: 't-technical',
    domain: 'technical',
    disposition: 'REQUEST_EVIDENCE',
    operations: ['EVIDENCE_BEFORE_INFERENCE', 'PRESERVE_REVERSIBILITY'],
    relevantVariables: ['source_integrity', 'missing_evidence'],
    rejectedConditions: ['do_not_close_without_source'],
    whatWouldChangeDecision: ['verified_source_arrives'],
    evidenceRefs: ['e:1'],
    epistemicClass: 'OBSERVED',
  },
  {
    traceId: 't-editorial',
    domain: 'editorial',
    disposition: 'PROPOSE',
    operations: ['EVIDENCE_BEFORE_INFERENCE', 'PRESERVE_REVERSIBILITY'],
    relevantVariables: ['source_integrity', 'scope'],
    rejectedConditions: ['do_not_mutate_canon'],
    whatWouldChangeDecision: ['scope_expands_to_canon'],
    evidenceRefs: ['e:2'],
    epistemicClass: 'VERIFIED_CONTRAST',
  },
  {
    traceId: 't-relational',
    domain: 'relational',
    disposition: 'WITHHOLD',
    operations: ['EVIDENCE_BEFORE_INFERENCE', 'DO_NOT_INTERRUPT_WITHOUT_MATERIAL_CHANGE'],
    relevantVariables: ['novelty', 'materiality'],
    rejectedConditions: ['do_not_surface_nonmaterial_state'],
    whatWouldChangeDecision: ['material_change_detected'],
    evidenceRefs: ['e:3'],
    epistemicClass: 'OBSERVED',
  },
  {
    traceId: 't-institutional',
    domain: 'institutional',
    disposition: 'ESCALATE',
    operations: ['EVIDENCE_BEFORE_INFERENCE', 'ESCALATE_RESERVED_AUTHORITY'],
    relevantVariables: ['authority_scope', 'reversibility'],
    rejectedConditions: ['do_not_self_authorize'],
    whatWouldChangeDecision: ['founder_approval'],
    evidenceRefs: ['e:4'],
    epistemicClass: 'VERIFIED_CONTRAST',
  },
];

const predictions: DecisionReconstruction[] = [
  {
    traceId: 't-technical',
    disposition: 'REQUEST_EVIDENCE',
    operations: ['EVIDENCE_BEFORE_INFERENCE', 'PRESERVE_REVERSIBILITY'],
    relevantVariables: ['source_integrity', 'missing_evidence'],
    rejectedConditions: ['do_not_close_without_source'],
    whatWouldChangeDecision: ['verified_source_arrives'],
  },
  {
    traceId: 't-editorial',
    disposition: 'PROPOSE',
    operations: ['EVIDENCE_BEFORE_INFERENCE', 'PRESERVE_REVERSIBILITY'],
    relevantVariables: ['source_integrity', 'scope'],
    rejectedConditions: ['do_not_mutate_canon'],
    whatWouldChangeDecision: ['scope_expands_to_canon'],
  },
  {
    traceId: 't-relational',
    disposition: 'WITHHOLD',
    operations: ['EVIDENCE_BEFORE_INFERENCE', 'DO_NOT_INTERRUPT_WITHOUT_MATERIAL_CHANGE'],
    relevantVariables: ['novelty', 'materiality'],
    rejectedConditions: ['do_not_surface_nonmaterial_state'],
    whatWouldChangeDecision: ['material_change_detected'],
  },
  {
    traceId: 't-institutional',
    disposition: 'ESCALATE',
    operations: ['EVIDENCE_BEFORE_INFERENCE', 'ESCALATE_RESERVED_AUTHORITY'],
    relevantVariables: ['authority_scope', 'reversibility'],
    rejectedConditions: ['do_not_self_authorize'],
    whatWouldChangeDecision: ['founder_approval'],
  },
];

test('holdout evaluates decision outcome and internal operation structure separately', () => {
  const result = evaluateDecisionHoldout({ expected, predicted: predictions });
  assert.equal(result.traceCount, 4);
  assert.equal(result.predictedCount, 4);
  assert.equal(result.decisionAccuracy, 1);
  assert.equal(result.meanStructuralFidelity, 1);
  assert.equal(result.byDomain.technical.decisionAccuracy, 1);
  assert.equal(result.byDomain.institutional.meanStructuralFidelity, 1);
});

test('missing reconstruction is penalized instead of silently removed from the denominator', () => {
  const result = evaluateDecisionHoldout({ expected, predicted: predictions.slice(0, 3) });
  assert.deepEqual(result.missingTraceIds, ['t-institutional']);
  assert.equal(result.decisionAccuracy, 0.75);
  assert.ok(result.meanStructuralFidelity < 1);
});

const occurrences: OperationOccurrence[] = [
  ['o1', 'technical', 'OBSERVED', 'SUPPORT', 'e:1'],
  ['o2', 'editorial', 'VERIFIED_CONTRAST', 'SUPPORT', 'e:2'],
  ['o3', 'relational', 'OBSERVED', 'SUPPORT', 'e:3'],
  ['o4', 'institutional', 'VERIFIED_CONTRAST', 'SUPPORT', 'e:4'],
  ['o5', 'scientific', 'OBSERVED', 'SUPPORT', 'e:5'],
  ['o6', 'operational', 'OBSERVED', 'SUPPORT', 'e:6'],
  ['o7', 'technical', 'OBSERVED', 'COUNTEREXAMPLE', 'e:7'],
  ['o8', 'simulated-only', 'SIMULATED', 'SUPPORT', 'sim:1'],
].map(([occurrenceId, domain, epistemicClass, support, evidenceRef]) => ({
  occurrenceId,
  operationKey: 'EVIDENCE_BEFORE_INFERENCE',
  traceId: `trace:${occurrenceId}`,
  domain,
  epistemicClass: epistemicClass as OperationOccurrence['epistemicClass'],
  support: support as OperationOccurrence['support'],
  evidenceRefs: [evidenceRef],
}));

test('cross-domain operation can become a rule candidate but never auto-promotes', () => {
  const result = evaluateOperationPromotion({
    operationKey: 'EVIDENCE_BEFORE_INFERENCE',
    occurrences,
    boundaryProbeCount: 3,
  });
  assert.equal(result.maturity, 'RULE_CANDIDATE');
  assert.equal(result.qualifyingSupportCount, 6);
  assert.equal(result.simulatedOccurrenceCount, 1);
  assert.equal(result.mayAutoPromoteToRule, false);
  assert.ok(result.reasons.includes('simulated_occurrences_excluded_from_promotion_count'));
  assert.ok(result.reasons.includes('rule_promotion_remains_founder_reserved'));
});

test('simulated recurrence alone cannot establish a transferable cognitive pattern', () => {
  const result = evaluateOperationPromotion({
    operationKey: 'SIM_ONLY',
    occurrences: [
      {
        occurrenceId: 's1', operationKey: 'SIM_ONLY', traceId: 's1', domain: 'a',
        support: 'SUPPORT', epistemicClass: 'SIMULATED', evidenceRefs: ['sim:1'],
      },
      {
        occurrenceId: 's2', operationKey: 'SIM_ONLY', traceId: 's2', domain: 'b',
        support: 'SUPPORT', epistemicClass: 'SIMULATED', evidenceRefs: ['sim:2'],
      },
      {
        occurrenceId: 's3', operationKey: 'SIM_ONLY', traceId: 's3', domain: 'c',
        support: 'SUPPORT', epistemicClass: 'SIMULATED', evidenceRefs: ['sim:3'],
      },
    ],
    boundaryProbeCount: 10,
  });
  assert.equal(result.maturity, 'CANDIDATE');
  assert.equal(result.qualifyingSupportCount, 0);
});

const probes: CounterfactualProbe[] = [
  {
    probeId: 'p1', baseTraceId: 't-technical', variableKey: 'source_integrity', direction: 'INCREASE',
    baselineDisposition: 'REQUEST_EVIDENCE', expectedDispositionAfterPerturbation: 'PROPOSE', predictedDispositionAfterPerturbation: 'PROPOSE',
    epistemicClass: 'VERIFIED_CONTRAST', evidenceRefs: ['e:1', 'e:8'],
  },
  {
    probeId: 'p2', baseTraceId: 't-institutional', variableKey: 'authority_scope', direction: 'REPLACE',
    baselineDisposition: 'ESCALATE', expectedDispositionAfterPerturbation: 'PROPOSE', predictedDispositionAfterPerturbation: 'PROPOSE',
    epistemicClass: 'OBSERVED', evidenceRefs: ['e:4', 'e:9'],
  },
  {
    probeId: 'p3', baseTraceId: 't-relational', variableKey: 'materiality', direction: 'INCREASE',
    baselineDisposition: 'WITHHOLD', expectedDispositionAfterPerturbation: 'PROPOSE', predictedDispositionAfterPerturbation: 'PROPOSE',
    epistemicClass: 'SIMULATED', evidenceRefs: ['sim:3'],
  },
  {
    probeId: 'p4', baseTraceId: 't-editorial', variableKey: 'scope', direction: 'INCREASE',
    baselineDisposition: 'PROPOSE', expectedDispositionAfterPerturbation: 'PROPOSE', predictedDispositionAfterPerturbation: 'PROPOSE',
    epistemicClass: 'DERIVED', evidenceRefs: ['e:2'],
  },
];

test('counterfactual evaluation measures decision switching without treating simulation as observation', () => {
  const result = evaluateCounterfactualProbes(probes);
  assert.equal(result.expectedSwitchCount, 3);
  assert.equal(result.detectedSwitchCount, 3);
  assert.equal(result.targetDispositionAccuracy, 1);
  assert.equal(result.falseSwitchRate, 0);
  assert.equal(result.observedOrVerifiedProbeCount, 2);
  assert.equal(result.simulatedProbeCount, 1);
});

test('combined transfer evaluation requires holdout structure, counterfactual fidelity and non-simulated evidence', () => {
  const holdout = evaluateDecisionHoldout({ expected, predicted: predictions });
  const counterfactual = evaluateCounterfactualProbes(probes);
  const promotion = evaluateOperationPromotion({
    operationKey: 'EVIDENCE_BEFORE_INFERENCE',
    occurrences,
    boundaryProbeCount: 3,
  });
  const result = buildDecisionTransferEvaluation({ holdout, counterfactual, promotion });
  assert.equal(result.pass, true);
  assert.equal(result.schemaVersion, 'SFI-CT-DECISION-TRANSFER-1.0');
  assert.equal(result.promotion.mayAutoPromoteToRule, false);
});
