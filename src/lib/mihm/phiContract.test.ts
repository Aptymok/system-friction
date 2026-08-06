import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MIHM_PHI_REGISTRY,
  getMihmPhiDefinition,
  normalizePpoiComposite,
  resolveCanonicalPhiSymbol,
  resolveLegacyPhiSf,
  validateMihmPhiRegistry,
} from './phiContract';

test('MIHM exposes one typed Phi for each method and dimension', () => {
  const definitions = Object.values(MIHM_PHI_REGISTRY);
  assert.equal(definitions.length, 5);
  assert.equal(new Set(definitions.map((item) => item.methodId)).size, 5);
  assert.equal(new Set(definitions.map((item) => item.dimension)).size, 5);
  assert.deepEqual(validateMihmPhiRegistry(), []);
});

test('institutional Phi is reserved to SFI institutional method', () => {
  const definition = getMihmPhiDefinition('PHI_SFI');
  assert.equal(definition.methodId, 'SFI_INSTITUTIONAL');
  assert.equal(definition.semanticRole, 'INSTITUTIONAL_HOMEOSTASIS');
});

test('unambiguous legacy symbols resolve without remaining canonical', () => {
  assert.equal(resolveCanonicalPhiSymbol('PHI_PERSONAL'), 'PHI_H');
  assert.equal(resolveCanonicalPhiSymbol('PHI_SYSTEMIC'), 'PHI_S');
  assert.equal(resolveCanonicalPhiSymbol('PHI_PHENOMENOLOGICAL'), 'PHI_F');
  assert.equal(resolveCanonicalPhiSymbol('PHI_WORLD'), 'PHI_W');
});

test('legacy PHI_SF requires object context', () => {
  assert.equal(resolveLegacyPhiSf('ASSET_OR_BOUNDED_SYSTEM'), 'PHI_S');
  assert.equal(resolveLegacyPhiSf('SFI_INSTITUTION'), 'PHI_SFI');
});

test('PPOI composite is normalized from 0-5 to Phi F 0-1', () => {
  assert.equal(normalizePpoiComposite(0), 0);
  assert.equal(normalizePpoiComposite(2.5), 0.5);
  assert.equal(normalizePpoiComposite(5), 1);
  assert.equal(normalizePpoiComposite(8), 1);
});
