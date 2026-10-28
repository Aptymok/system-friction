import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateMihmFoundationMissingness } from './mihmFoundationDiagnostic';

test('MIHM G1 detects null-vs-zero observational equivalence in current reduced math', () => {
  const result = evaluateMihmFoundationMissingness();
  assert.equal(result.epistemicClass, 'SIMULATED');
  assert.equal(result.validationLevel, 'SIMULATION');
  assert.equal(result.measuredSystemClaim, false);
  assert.equal(result.observations.nullVsZeroIdentical, true);
  assert.equal(result.observations.guardedMissingAbstains, true);
  assert.equal(result.observations.guardedSyntheticZeroAbstains, true);
  assert.equal(result.observations.guardedEmptyAbstains, true);
  assert.equal(result.outputs.gatedResearchCandidate.missing.decision, 'ABSTAIN');
  assert.equal(result.outputs.gatedResearchCandidate.measuredZeroSynthetic.decision, 'ABSTAIN');
  assert.equal(result.outputs.gatedResearchCandidate.empty.decision, 'ABSTAIN');
  assert.equal(result.outputs.gatedResearchCandidate.canonicalPhiCalculated, false);
  assert.equal(result.outputs.gatedResearchCandidate.sourceProvenanceVerified, false);
  assert.equal(result.observations.nullInputsExplicitlyWarned, false);
  assert.equal(result.observations.measuredCoverage, 2 / 3);
  assert.ok(Math.abs(result.observations.meanZeroImputed - (1.4 / 3)) < 1e-12);
  assert.ok(Math.abs(result.observations.meanAvailableCase - 0.7) < 1e-12);
  assert.equal(result.observations.noNodesProducesNumericContinuity, true);
  assert.equal(result.observations.controlNumericPerturbationChangesOutput, true);
  assert.equal(result.outputs.null.vector.continuity, result.outputs.explicitZero.vector.continuity);
  assert.equal(result.decision, 'ABSTAIN_FROM_EMPIRICAL_HOMEOSTASIS_CLAIM');
});

test('MIHM G1 is repeatable and does not invent canonical Phi or observed-world results', () => {
  const first = evaluateMihmFoundationMissingness();
  const second = evaluateMihmFoundationMissingness();
  assert.deepEqual(first, second);
  assert.equal(first.outputs.null.vector.phi, first.outputs.null.vector.continuity); // legacy alias only
  assert.ok(first.limitations.some((x) => x.includes('not canonical Phi')));
  assert.ok(first.limitations.some((x) => x.includes('No real-world homeostasis')));
});
