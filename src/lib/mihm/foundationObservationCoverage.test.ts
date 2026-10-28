import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMihmObservationCoverage, evaluateReducedMihmResearchInput } from './foundationObservationCoverage';
import type { ReducedMihmInput } from '../../../packages/mihm-core/src';

function fixture(values: Array<number | null>, nti: Array<number | null>): ReducedMihmInput {
  return {
    observedAt: '2026-10-11T00:00:00.000Z',
    campo: {
      confidence: 0.9, sourceState: 'observed',
      nodes: values.map((value, i) => ({ type: 'fixture-' + i, weight: 0.5, value, nti: nti[i], simulated: true })),
    },
    graph: { sourceState: 'observed', nodes: values.map((_, i) => i), edges: [] },
  };
}

test('missing values and explicit measured zero remain distinct', () => {
  const missing = assessMihmObservationCoverage(fixture([0.8, 0.6, null], [0.2, 0.4, null]));
  const zero = assessMihmObservationCoverage(fixture([0.8, 0.6, 0], [0.2, 0.4, 0]));
  assert.equal(missing.valueCoverage, 2 / 3);
  assert.equal(missing.ntiCoverage, 2 / 3);
  assert.equal(missing.completeCaseValueMean, 0.7);
  assert.ok(Math.abs((missing.zeroImputedValueMean ?? 0) - 1.4 / 3) < 1e-12);
  assert.equal(missing.explicitZeroValues, 0);
  assert.equal(missing.readiness, 'PARTIAL_MEASUREMENT');
  assert.equal(missing.missingZeroConflationRisk, true);
  assert.equal(zero.valueCoverage, 1);
  assert.equal(zero.explicitZeroValues, 1);
  assert.equal(zero.readiness, 'MEASURED_INPUTS_ONLY');
  assert.equal(zero.missingZeroConflationRisk, false);
  assert.equal(missing.canonicalPhiCalculated, false);
  assert.equal(missing.empiricalHomeostasisClaimed, false);
});

test('empty readings abstain rather than fabricate a measured zero', () => {
  const result = assessMihmObservationCoverage(fixture([], []));
  assert.equal(result.valueCoverage, null);
  assert.equal(result.ntiCoverage, null);
  assert.equal(result.completeCaseValueMean, null);
  assert.equal(result.zeroImputedValueMean, null);
  assert.equal(result.readiness, 'NO_MEASURED_NODES');
  assert.equal(result.missingZeroConflationRisk, true);
  assert.ok(result.warnings.includes('empty_kernel_numeric_default_is_not_measurement'));
});

test('rejects out-of-range measurements instead of silently clamping', () => {
  assert.throws(() => assessMihmObservationCoverage(fixture([1.2], [0.2])), /MIHM_OBSERVATION_INVALID_VALUE/);
  assert.throws(() => assessMihmObservationCoverage(fixture([0.2], [Number.NaN])), /MIHM_OBSERVATION_INVALID_NTI/);
});

test('source flag does not override missingness or synthetic provenance', () => {
  const result = assessMihmObservationCoverage(fixture([null, 0], [0.1, null]));
  assert.equal(result.readiness, 'PARTIAL_MEASUREMENT');
  assert.ok(result.warnings.includes('value_missing_not_zero'));
  assert.ok(result.warnings.includes('simulated_inputs_present'));
  assert.ok(result.warnings.includes('graph_edge_weights_do_not_establish_provenance_or_viability'));
});

test('marginal coverage cannot conceal zero jointly measured nodes', () => {
  const result = assessMihmObservationCoverage(fixture([0.8, null], [null, 0.6]));
  assert.equal(result.valueCoverage, 0.5);
  assert.equal(result.ntiCoverage, 0.5);
  assert.equal(result.pairedObservedNodes, 0);
  assert.equal(result.pairedCoverage, 0);
  assert.equal(result.pairedValueMean, null);
  assert.equal(result.pairedNtiMean, null);
  assert.equal(result.jointReadiness, 'NO_PAIRED_MEASUREMENTS');
  assert.ok(result.warnings.includes('no_joint_value_nti_observation'));
  assert.equal(result.empiricalHomeostasisClaimed, false);
});

test('joint means use only nodes with both measured dimensions', () => {
  const result = assessMihmObservationCoverage(fixture([0.8, 0.2, null], [0.4, null, 0.9]));
  assert.equal(result.pairedObservedNodes, 1);
  assert.equal(result.pairedCoverage, 1 / 3);
  assert.equal(result.pairedValueMean, 0.8);
  assert.equal(result.pairedNtiMean, 0.4);
  assert.equal(result.jointReadiness, 'PARTIAL_PAIRED_MEASUREMENTS');
  assert.ok(result.warnings.includes('joint_measurement_coverage_incomplete'));
});

test('complete numeric pairs are not by themselves verified empirical evidence', () => {
  const result = assessMihmObservationCoverage(fixture([0, 1], [1, 0]));
  assert.equal(result.pairedObservedNodes, 2);
  assert.equal(result.pairedCoverage, 1);
  assert.equal(result.jointReadiness, 'PAIRED_INPUTS_ONLY');
  assert.ok(result.warnings.includes('simulated_inputs_present'));
  assert.equal(result.canonicalPhiCalculated, false);
  assert.equal(result.empiricalHomeostasisClaimed, false);
});


test('gated adapter abstains on null readings, unlike legacy numeric default', () => {
  const { evaluateReducedMihmResearchInput } = requireGated();
  const input = fixture([0.8, 0.6, null], [0.2, 0.4, null]);
  input.campo.nodes.forEach((n) => { n.simulated = false; });
  const reading = evaluateReducedMihmResearchInput(input);
  assert.equal(reading.decision, 'ABSTAIN');
  assert.equal(reading.legacyDiagnostic, null);
  assert.ok(reading.reasons.includes('MISSING_OR_UNPAIRED_NODE_MEASUREMENTS'));
  assert.equal(reading.canonicalPhiCalculated, false);
  assert.equal(reading.empiricalHomeostasisClaimed, false);
});

test('gated adapter keeps measured zero distinct and permits ONLY legacy diagnostic', () => {
  const { evaluateReducedMihmResearchInput } = requireGated();
  const input = fixture([0, 0.6], [0, 0.4]);
  input.campo.nodes.forEach((n) => { n.simulated = false; });
  const reading = evaluateReducedMihmResearchInput(input);
  assert.equal(reading.decision, 'LEGACY_DIAGNOSTIC_ONLY');
  assert.equal(reading.coverage.explicitZeroValues, 1);
  assert.equal(reading.coverage.explicitZeroNti, 1);
  assert.equal(reading.legacyDiagnostic?.metricContract.canonicalPhi, false);
  assert.equal(reading.sourceProvenanceVerified, false);
  assert.equal(reading.realWorldInterventionAuthorized, false);
});

test('gated adapter refuses synthetic, unobserved and structurally mismatched inputs', () => {
  const { evaluateReducedMihmResearchInput } = requireGated();
  const synthetic = evaluateReducedMihmResearchInput(fixture([0.4], [0.8]));
  assert.equal(synthetic.decision, 'ABSTAIN');
  assert.ok(synthetic.reasons.includes('SIMULATED_INPUTS_NOT_EMPIRICAL'));
  const mismatched = fixture([0.4], [0.8]);
  mismatched.campo.nodes[0].simulated = false;
  mismatched.graph.nodes = [];
  mismatched.graph.sourceState = 'degraded';
  const result = evaluateReducedMihmResearchInput(mismatched);
  assert.ok(result.reasons.includes('GRAPH_NODE_COUNT_MISMATCH'));
  assert.ok(result.reasons.includes('GRAPH_SOURCE_NOT_OBSERVED'));
  assert.equal(result.legacyDiagnostic, null);
});

test('gated adapter rejects invalid metadata without silent clamping', () => {
  const { evaluateReducedMihmResearchInput } = requireGated();
  const input = fixture([0.4], [0.8]);
  input.campo.nodes[0].simulated = false;
  input.campo.confidence = 1.4;
  input.observedAt = 'invalid-time';
  input.campo.nodes[0].weight = -1;
  const result = evaluateReducedMihmResearchInput(input);
  assert.equal(result.decision, 'ABSTAIN');
  assert.ok(result.reasons.includes('CAMPO_CONFIDENCE_INVALID'));
  assert.ok(result.reasons.includes('NODE_WEIGHT_INVALID'));
  assert.ok(result.reasons.includes('OBSERVATION_TIMESTAMP_INVALID'));
});

function requireGated() {
  return { evaluateReducedMihmResearchInput };
}
