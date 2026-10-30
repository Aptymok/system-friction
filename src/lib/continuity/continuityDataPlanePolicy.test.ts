import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectContinuityDataPlane } from './continuityDataPlanePolicy';

const healthy = {
  scheduledEgressEnabled: true,
  continuityConfigured: true,
  primaryPhysicalOk: true,
  primaryContinuityStateReadable: true,
  legacyNeonMode: 'RECOVERY' as const,
};

test('retired Neon RECOVERY state cannot override a healthy canonical primary when scheduled egress is authorized', () => {
  assert.equal(selectContinuityDataPlane(healthy), 'SUPABASE');
});

test('cost-restricted scheduling never unlocks primary writes even if primary is healthy', () => {
  assert.equal(selectContinuityDataPlane({ ...healthy, scheduledEgressEnabled: false }), 'NEON');
});

test('primary physical outage retains read-only continuity fallback', () => {
  assert.equal(selectContinuityDataPlane({ ...healthy, primaryPhysicalOk: false }), 'NEON');
});

test('primary continuity authority read failure cannot trigger primary writes', () => {
  assert.equal(selectContinuityDataPlane({ ...healthy, primaryContinuityStateReadable: false }), 'NEON');
});

test('primary is preferred without Neon when its health and continuity authority are observed', () => {
  assert.equal(selectContinuityDataPlane({ ...healthy, continuityConfigured: false, legacyNeonMode: null }), 'SUPABASE');
});

test('no configured fallback and unavailable primary stays on original fail-closed error path', () => {
  assert.equal(selectContinuityDataPlane({ ...healthy, continuityConfigured: false, primaryPhysicalOk: false, legacyNeonMode: null }), 'SUPABASE');
});
