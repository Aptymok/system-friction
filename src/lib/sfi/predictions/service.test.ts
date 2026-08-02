import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizePredictionCreatedByForStorage } from './service';

test('normalizePredictionCreatedByForStorage accepts a canonical UUID', () => {
  const uuid = '123e4567-e89b-42d3-a456-426614174000';
  assert.equal(normalizePredictionCreatedByForStorage(uuid), uuid);
});

test('normalizePredictionCreatedByForStorage rejects non-UUID strings without throwing', () => {
  assert.equal(normalizePredictionCreatedByForStorage('copilot-runtime'), null);
  assert.equal(normalizePredictionCreatedByForStorage(''), null);
});
