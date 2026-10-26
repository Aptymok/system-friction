import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMihmObservationCoverage } from './foundationObservationCoverage';
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
