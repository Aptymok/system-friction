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

test('calculatePhiSfi uses the canonical formula', () => {
  const result = calculatePhiSfi(0.8, 0.7, 0.2, 0.05);
  assert.equal(result, (0.8 * 0.7) / (1 + 0.2) + 0.05);
});

test('calculatePsiMoph uses the canonical formula', () => {
  const result = calculatePsiMoph(0.8, 0.7, 0.2, 0.01, 0.2);
  const expected = ((1 / (0.8 + 0.1)) * 0.7 * (1 / (0.2 + 0.1)) + 0.01 - 0.15 * 0.2) / 12;
  assert.ok(Math.abs(result - expected) < 1e-9);
});

test('resolveRegime classifies the state correctly', () => {
  assert.equal(resolveRegime(0.7), 'HOMEOSTATIC');
  assert.equal(resolveRegime(0.45), 'TRANSITION');
  assert.equal(resolveRegime(0.2), 'CRITICAL');
});

test('formula registry exposes the canonical formulas', () => {
  const definitions = getCanonicalFormulaRegistry();
  assert.ok(definitions.some((formula) => formula.id === 'phi_sfi'));
  assert.ok(definitions.some((formula) => formula.id === 'w_10'));
});
