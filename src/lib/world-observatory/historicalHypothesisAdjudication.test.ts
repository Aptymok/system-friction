import { strict as assert } from 'node:assert';
import test from 'node:test';
import {
  buildLegacyFrozenSignals,
  classifyLegacyFrozenSignals,
} from './historicalHypothesisAdjudication';

const signals = buildLegacyFrozenSignals({
  expectedSignals: ['Event A occurs', 'Event B occurs'],
  contradictionSignals: ['Event C occurs'],
});

test('legacy frozen signals validate only when every expected signal is evidence-backed', () => {
  const result = classifyLegacyFrozenSignals({
    ...signals,
    criterionResults: [
      { criterionId: 'legacy-expected-1', verdict: 'SATISFIED', evidenceIds: ['e1'], reason: 'observed' },
      { criterionId: 'legacy-expected-2', verdict: 'SATISFIED', evidenceIds: ['e2'], reason: 'observed' },
      { criterionId: 'legacy-contradiction-1', verdict: 'NOT_SATISFIED', evidenceIds: [], reason: 'not observed' },
    ],
  });
  assert.equal(result.classification, 'VALIDATED');
  assert.equal(result.decisive, true);
});

test('legacy frozen signals are contradicted by evidence-backed frozen contradiction', () => {
  const result = classifyLegacyFrozenSignals({
    ...signals,
    criterionResults: [
      { criterionId: 'legacy-contradiction-1', verdict: 'SATISFIED', evidenceIds: ['e3'], reason: 'observed' },
    ],
  });
  assert.equal(result.classification, 'CONTRADICTED');
  assert.equal(result.decisive, true);
});

test('legacy frozen signals allow partial validation without inventing criteria', () => {
  const result = classifyLegacyFrozenSignals({
    ...signals,
    criterionResults: [
      { criterionId: 'legacy-expected-1', verdict: 'SATISFIED', evidenceIds: ['e1'], reason: 'observed' },
      { criterionId: 'legacy-expected-2', verdict: 'NOT_DETERMINABLE', evidenceIds: [], reason: 'coverage insufficient' },
    ],
  });
  assert.equal(result.classification, 'PARTIALLY_VALIDATED');
  assert.equal(result.decisive, false);
});

test('a satisfied verdict without evidence cannot decide a legacy hypothesis', () => {
  const result = classifyLegacyFrozenSignals({
    ...signals,
    criterionResults: [
      { criterionId: 'legacy-expected-1', verdict: 'SATISFIED', evidenceIds: [], reason: 'unsupported' },
      { criterionId: 'legacy-expected-2', verdict: 'SATISFIED', evidenceIds: [], reason: 'unsupported' },
    ],
  });
  assert.equal(result.classification, 'INCONCLUSIVE');
  assert.equal(result.decisive, false);
});
