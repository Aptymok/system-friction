import { describe, expect, it } from 'vitest';
import { normalizePredictionCreatedByForStorage } from './service';

describe('normalizePredictionCreatedByForStorage', () => {
  it('accepts a canonical UUID', () => {
    const uuid = '123e4567-e89b-42d3-a456-426614174000';
    expect(normalizePredictionCreatedByForStorage(uuid)).toBe(uuid);
  });

  it('rejects non-UUID strings without throwing', () => {
    expect(normalizePredictionCreatedByForStorage('copilot-runtime')).toBeNull();
    expect(normalizePredictionCreatedByForStorage('')).toBeNull();
  });
});
