import assert from 'node:assert/strict';

import {
  MIHM_PHI_REGISTRY,
  normalizePpoiComposite,
  validateMihmPhiRegistry,
} from '../src/lib/mihm/phiContract';
import { calculateFS, calculatePhiSfi } from '../src/core/formulas/canonicalFormulas';

const definitions = Object.values(MIHM_PHI_REGISTRY);
assert.equal(definitions.length, 5, 'MIHM must expose exactly five canonical Phi instruments');
assert.equal(new Set(definitions.map((item) => item.methodId)).size, 5, 'Each Phi must belong to one method');
assert.equal(new Set(definitions.map((item) => item.dimension)).size, 5, 'Each Phi must belong to one dimension');
assert.deepEqual(validateMihmPhiRegistry(), [], 'MIHM Phi registry must not contain collisions');
assert.equal(normalizePpoiComposite(2.5), 0.5, 'PPOI 0-5 composite must normalize to Phi F 0-1');

const institutionalPhi = calculatePhiSfi(0.7, 0.6, 0.2, 0.03);
assert.ok(institutionalPhi >= 0 && institutionalPhi <= 1, 'Phi SFI must remain bounded');
assert.equal(calculateFS(institutionalPhi), 1 - institutionalPhi, 'F S must be the complement of Phi SFI');

console.log(JSON.stringify({
  ok: true,
  contract: '2026-08-06.mihm-phi.v1',
  symbols: definitions.map((item) => item.symbol),
}, null, 2));
