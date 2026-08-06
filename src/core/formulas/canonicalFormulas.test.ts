import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculatePhiSfi,
  calculatePsiMoph,
  calculateCField,
  calculateDM,
  resolveRegime,
  getCanonicalFormulaRegistry,
} from './canonicalFormulas';

test('calculatePhiSfi uses the canonical bounded formula', () => {
  const result = calculatePhiSfi(0.8, 0.7, 0.2, 0.05);
  assert.equal(result, (0.8 * 0.7) / (1 + 0.2) + 0.05);
  assert.equal(calculatePhiSfi(4, 4, 0, 1), 1);
});

test('calculatePsiMoph uses the specialized bounded formula', () => {
  const result = calculatePsiMoph(0.8, 0.7, 0.2, 0.01, 0.2);
  const expected = ((1 / (0.8 + 0.1)) * 0.7 * (1 / (0.2 + 0.1)) + 0.01 - 0.15 * 0.2) / 12;
  assert.ok(Math.abs(result - expected) < 1e-9);
});

test('resolveRegime uses canonical Phi-only fallback thresholds', () => {
  assert.equal(resolveRegime(0.7), 'HOMEOSTATIC');
  assert.equal(resolveRegime(0.45), 'CRITICAL');
  assert.equal(resolveRegime(0.2), 'ENTROPIC');
});

test('formula registry exposes the institutional and method-scoped formulas', () => {
  const definitions = getCanonicalFormulaRegistry();
  assert.ok(definitions.some((formula) => formula.id === 'phi_sfi'));
  assert.ok(definitions.some((formula) => formula.id === 'phi_h'));
  assert.ok(definitions.some((formula) => formula.id === 'w_10'));
});

test('secondary formulas remain bounded', () => {
  assert.equal(calculateCField(9, -3, 2), 0.65);
  assert.equal(calculateDM(0, 100), 0);
});
