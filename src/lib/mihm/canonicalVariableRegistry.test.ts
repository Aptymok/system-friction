import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertCanonicalVariable,
  resolveCanonicalVariable,
} from './canonicalVariableRegistry';

test('canonical variables resolve directly', () => {
  assert.equal(assertCanonicalVariable('PHI_H'), 'PHI_H');
  assert.equal(assertCanonicalVariable('wsi'), 'WSI');
});

test('unambiguous aliases redirect automatically', () => {
  assert.equal(resolveCanonicalVariable('PHI_SYSTEMIC').canonicalId, 'PHI_S');
  assert.equal(resolveCanonicalVariable('PHI_PERSONAL').canonicalId, 'PHI_H');
});

test('PHI_SF requires context', () => {
  assert.equal(resolveCanonicalVariable('PHI_SF').canonicalId, null);
  assert.equal(resolveCanonicalVariable('PHI_SF', { objectType: 'ARTIFACT' }).canonicalId, 'PHI_S');
  assert.equal(resolveCanonicalVariable('PHI_SF', { objectType: 'SFI_INSTITUTION' }).canonicalId, 'PHI_SFI');
});

test('unknown and prohibited identifiers fail closed', () => {
  assert.equal(resolveCanonicalVariable('invented_metric').aliasClass, 'UNKNOWN');
  assert.equal(resolveCanonicalVariable('GLOBAL_PHI').aliasClass, 'PROHIBITED');
  assert.throws(() => assertCanonicalVariable('invented_metric'), /mihm_variable_not_canonical/);
});
