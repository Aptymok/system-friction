import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTINUITY_CAPABILITIES, SAFE_ABSENCE_RULES } from './contracts';

test('continuity capability identifiers are unique', () => {
  const ids = CONTINUITY_CAPABILITIES.map((capability) => capability.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('founder absence blocks reserved authority', () => {
  assert.equal(SAFE_ABSENCE_RULES.mayPublish, false);
  assert.equal(SAFE_ABSENCE_RULES.mayChangeCanon, false);
  assert.equal(SAFE_ABSENCE_RULES.mayChangeFormula, false);
  assert.equal(SAFE_ABSENCE_RULES.mayGrantRootAccess, false);
  assert.equal(SAFE_ABSENCE_RULES.mayExecuteIrreversibleExternalAction, false);
});

test('all A3 capabilities are blocked in founder absence', () => {
  for (const capability of CONTINUITY_CAPABILITIES.filter((item) => item.autonomyLevel === 'A3')) {
    assert.equal(capability.allowedInFounderAbsence, false, capability.id);
  }
});

test('critical observational capabilities remain available', () => {
  const required = ['world_vector', 'scorefriction', 'mihm', 'evidence'];
  for (const id of required) {
    const capability = CONTINUITY_CAPABILITIES.find((item) => item.id === id);
    assert.ok(capability, id);
    assert.equal(capability.allowedInFounderAbsence, true, id);
  }
});
