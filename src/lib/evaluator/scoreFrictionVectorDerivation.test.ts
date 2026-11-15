import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveScoreFrictionInputs } from './scoreFrictionVectorDerivation';

const complete = {
  memetic_vector: { persistence: 0.7, affective_charge: 0.4, institutional_bridge: 0.8 },
  semantic_vector: { value: 'observed' },
  platform_vector: { value: 'observed' },
};

test('observed normalized vectors produce finite bounded inputs', () => {
  const result = deriveScoreFrictionInputs(complete);
  assert.ok(result);
  for (const key of ['ihg', 'nti', 'ldi', 'xi'] as const) {
    assert.ok(Number.isFinite(result[key]));
    assert.ok(result[key] >= 0 && result[key] <= 1);
  }
});

test('missing and explicit zero are never conflated', () => {
  const zeros = deriveScoreFrictionInputs({
    memetic_vector: { persistence: 0, affective_charge: 0, institutional_bridge: 0 },
  });
  assert.ok(zeros);
  assert.equal(deriveScoreFrictionInputs({
    memetic_vector: { persistence: 0, affective_charge: 0 },
  }), null);
  assert.equal(deriveScoreFrictionInputs({ memetic_vector: {} }), null);
  assert.equal(deriveScoreFrictionInputs({}), null);
});

test('non-finite and out-of-range measurements abstain', () => {
  for (const bad of [Number.NaN, Infinity, -0.01, 1.01, null, '0']) {
    const result = deriveScoreFrictionInputs({
      memetic_vector: { persistence: bad, affective_charge: 0.5, institutional_bridge: 0.5 },
    });
    assert.equal(result, null);
  }
});

test('derivation does not modify source measurements', () => {
  const source = structuredClone(complete);
  deriveScoreFrictionInputs(complete);
  assert.deepEqual(complete, source);
});
