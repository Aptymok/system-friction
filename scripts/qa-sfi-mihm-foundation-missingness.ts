import assert from 'node:assert/strict';
import { computeReducedMihm, type ReducedMihmInput } from '../packages/mihm-core/src/index';

/**
 * G1 diagnostic only. Records current behavior; does not endorse it.
 * The reduced kernel is not canonical Phi and this is synthetic QA, not empirical validation.
 */
const base: ReducedMihmInput = {
  observedAt: '2026-10-11T00:00:00.000Z',
  campo: {
    confidence: 0.9,
    sourceState: 'observed',
    nodes: [
      { type: 'source-a', weight: 0.8, value: 0.8, nti: 0.2, simulated: false },
      { type: 'source-b', weight: 0.7, value: 0.6, nti: 0.4, simulated: false },
      { type: 'source-c', weight: 0.6, value: null, nti: null, simulated: false },
    ],
  },
  graph: {
    sourceState: 'observed',
    nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    edges: [{ weight: 0.5 }, { weight: 0.5 }],
  },
};

const clone = (input: ReducedMihmInput): ReducedMihmInput => JSON.parse(JSON.stringify(input));

const missing = computeReducedMihm(base);
const explicitZeroInput = clone(base);
explicitZeroInput.campo.nodes[2].value = 0;
explicitZeroInput.campo.nodes[2].nti = 0;
const explicitZero = computeReducedMihm(explicitZeroInput);

assert.deepEqual(
  missing,
  explicitZero,
  'Current reduced kernel must exhibit missing/zero observational equivalence (diagnostic regression).',
);

const changedInput = clone(base);
changedInput.campo.nodes[2].value = 1;
changedInput.campo.nodes[2].nti = 1;
const changed = computeReducedMihm(changedInput);
assert.notDeepEqual(
  { ihg: missing.vector.ihg, nti: missing.vector.nti },
  { ihg: changed.vector.ihg, nti: changed.vector.nti },
  'Guard against a vacuous test: numerical inputs should influence the kernel.',
);

const empiricalValues = base.campo.nodes.map((node) => node.value).filter((v): v is number => typeof v === 'number');
const zeroFilledMean = base.campo.nodes.reduce((total, node) => total + (node.value ?? 0), 0) / base.campo.nodes.length;
const observedOnlyMean = empiricalValues.reduce((sum, value) => sum + value, 0) / empiricalValues.length;
assert.ok(Math.abs(zeroFilledMean - 0.4666666666666666) < 1e-12);
assert.ok(Math.abs(observedOnlyMean - 0.7) < 1e-12);

const zeroNodes = clone(base);
zeroNodes.campo.nodes = [];
const noNodes = computeReducedMihm(zeroNodes);
assert.equal(noNodes.sourceIds.length, 0);
assert.equal(noNodes.vector.ihg >= 0, true);
assert.equal(noNodes.metricContract.canonicalPhi, false);

const report = {
  classification: 'SYNTHETIC_QA_ONLY',
  program: 'SFI-MIHM-FOUNDATION-001',
  gate: 'G1',
  currentBehavior: 'MISSING_AND_EXPLICIT_ZERO_INDISTINGUISHABLE_FOR_VALUE_AND_NTI',
  missingAndZeroSameOutput: JSON.stringify(missing) === JSON.stringify(explicitZero),
  knownObservedCoverage: empiricalValues.length / base.campo.nodes.length,
  zeroFilledMean,
  observedOnlyMean,
  kernelContinuity: missing.vector.continuity,
  zeroInputKernelContinuity: explicitZero.vector.continuity,
  nullInputWarnings: missing.warnings,
  nullInputHasExplicitMissingWarning: missing.warnings.some((warning) => warning.includes('null') || warning.includes('missing')),
  emptyNodesProducesNumericalResult: Number.isFinite(noNodes.vector.continuity),
  changeMadeToProduction: false,
  scientificValidation: false,
};
console.log(JSON.stringify(report, null, 2));
console.log('SFI MIHM G1 missing-vs-zero diagnostic QA passed (current issue characterized, not fixed).');
