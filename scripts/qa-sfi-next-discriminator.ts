import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectNextDiscriminatingTest, type HypothesisTestCandidate } from '../src/lib/sfi/hypothesisNextStep';

const testContract = {
  contract: 'SFI-HYPOTHESIS-TEST-1.0',
  horizonHours: 48,
  horizonBasis: 'Prospective observation window, starting after recorded preregistration.',
  minimumEvidenceCount: 1,
  minimumSourceFamilies: 1,
  expectedCriteria: [{
    id: 'support', signal: 'Verifiable dated source supports hypothesis',
    operator: 'PRESENCE', threshold: null, required: true,
    minimumObservations: 1, sourceFamilies: ['original_document'],
  }],
  contradictionCriteria: [{
    id: 'refute', signal: 'Verifiable dated source contradicts hypothesis',
    operator: 'PRESENCE', threshold: null, required: true,
    minimumObservations: 1, sourceFamilies: ['original_document'],
  }],
};
const common = {
  statement: 'Proposed test; not an observation',
  sourceRefs: ['original_document_pending_acquisition'],
  testContract,
  estimatedDurationHours: 2,
  estimatedCostUnits: 0,
  estimatedRisk: 0.05,
  observationMode: 'READ_ONLY' as const,
};
const candidates: HypothesisTestCandidate[] = [
  { ...common, hypothesisId: 'H1', rivalHypothesisId: 'H2', priorPlausibility: 0.9, estimatedDiscrimination: 0.3 },
  { ...common, hypothesisId: 'H2', rivalHypothesisId: 'H1', priorPlausibility: 0.15, estimatedDiscrimination: 0.9 },
  { ...common, hypothesisId: 'H3', rivalHypothesisId: 'H1', priorPlausibility: 0.1, estimatedDiscrimination: 1,
    estimatedCostUnits: 1 },
  { ...common, hypothesisId: 'H4', rivalHypothesisId: 'H1', priorPlausibility: 0.2, estimatedDiscrimination: 1,
    estimatedRisk: 0.5 },
  { ...common, hypothesisId: 'H5', rivalHypothesisId: 'H1', priorPlausibility: 0.3, estimatedDiscrimination: 1,
    testContract: { ...testContract, expectedCriteria: [] } },
];
const result=selectNextDiscriminatingTest(candidates);
assert.equal(result.state,'PROPOSED_NOT_AUTHORIZED');
assert.equal(result.selected?.hypothesisId,'H2',
  'a low-plausibility but discriminating falsifiable hypothesis should be selected when safe');
assert.equal(result.selected?.testContract.contract,'SFI-HYPOTHESIS-TEST-1.0');
assert.equal(result.rejected.length,3);
assert.equal(selectNextDiscriminatingTest([...candidates].reverse()).selected?.hypothesisId,'H2');
assert.equal(selectNextDiscriminatingTest([]).state,'NO_ELIGIBLE_TEST');
assert.equal(selectNextDiscriminatingTest(candidates.map(c=>({...c,observationMode:'INTERVENE' as any}))).state,'NO_ELIGIBLE_TEST');
assert.equal(selectNextDiscriminatingTest(candidates.map(c=>({...c,sourceRefs:[]}))).state,'NO_ELIGIBLE_TEST');
const universal = readFileSync('src/lib/sfi/universalSignalCycle.ts','utf8');
assert.match(universal, /SFI_RESUME_OBJECTIVE_CHANGE_REQUIRES_AUTHORITY/);
assert.match(universal, /SFI_RESUME_TENANT_MISMATCH/);
assert.match(universal, /SFI_RESUME_OBJECT_MISMATCH/);
assert.match(universal, /input = \{ \.\.\.input, objective: originalObjective \?\? undefined \}/);
assert.match(universal, /nextDiscriminatingTest, declaredTarget/);
assert.match(universal, /SFI_UNIVERSAL_CYCLE_OPEN_PERSISTENCE_FAILED/);
assert.match(universal, /SFI_UNIVERSAL_CYCLE_RESULT_PERSISTENCE_FAILED/);
console.log(JSON.stringify({
  pass:'SFI_NEXT_DISCRIMINATOR_OBSERVATIONAL_SELECTION',
  selected:'H2', rejected:3, purpose:'FALSIFICATION_NOT_TRUTH',
  estimatesCalibrated:false, providerCalls:0, realEvidenceAccepted:false,
  caseObjectiveModified:false, externalReturnObserved:false,
}));
