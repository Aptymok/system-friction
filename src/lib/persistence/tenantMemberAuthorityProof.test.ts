import test from 'node:test';
import assert from 'node:assert/strict';
import { tenantMemberHistoricalParity } from './tenantMemberAuthorityProof';

const primary = {
  tenant_id: '11111111-1111-4111-8111-111111111111',
  user_id: '22222222-2222-4222-8222-222222222222',
  role: 'OPERATOR', status: 'ACTIVE',
  created_at: '2026-10-20T00:00:00Z', updated_at: '2026-10-22T17:41:00Z',
};
const continuity = {
  ...primary,
  created_at: '2026-10-20T00:00:00.000+00:00',
  updated_at: '2026-10-22T17:45:00.000+00:00',
};
const historicalBefore = { ...continuity, updated_at: '2026-10-22T17:42:00Z' };
const historicalAfter = { ...continuity, updated_at: '2026-10-22T17:46:00Z' };

test('timestamp-only historical tenant membership images are eligible for governed supersession', () => {
  assert.equal(tenantMemberHistoricalParity(primary, continuity, historicalBefore, historicalAfter), true);
});

test('status/role changes are material and may not be ignored as timestamp drift', () => {
  for (const key of ['role','status'] as const) {
    const changed = { ...historicalAfter, [key]: key === 'role' ? 'OWNER' : 'SUSPENDED' };
    assert.equal(tenantMemberHistoricalParity(primary, continuity, historicalBefore, changed), false);
  }
});

test('different identity or tenant is never semantically equivalent', () => {
  for (const key of ['user_id','tenant_id'] as const) {
    const changed = { ...continuity, [key]: '33333333-3333-4333-8333-333333333333' };
    assert.equal(tenantMemberHistoricalParity(primary, changed, historicalBefore, historicalAfter), false);
  }
});

test('primary and continuity must agree independently on all nonadministrative fields', () => {
  assert.equal(tenantMemberHistoricalParity({...primary, role:'OWNER'}, continuity, historicalBefore, historicalAfter), false);
  assert.equal(tenantMemberHistoricalParity(primary, {...continuity, status:'REVOKED'}, historicalBefore, historicalAfter), false);
  assert.equal(tenantMemberHistoricalParity(primary, {...continuity, unauthorized_scope:'ROOT'}, historicalBefore, historicalAfter), false);
});

test('missing before image, malformed IDs and unexpected status are fail closed', () => {
  assert.equal(tenantMemberHistoricalParity(primary, continuity, null, historicalAfter), false);
  assert.equal(tenantMemberHistoricalParity({...primary, tenant_id:'invalid'}, continuity, historicalBefore, historicalAfter), false);
  assert.equal(tenantMemberHistoricalParity({...primary, status:'UNRECOGNIZED'}, continuity, historicalBefore, historicalAfter), false);
});

test('a before-image role change is not a metadata-only update', () => {
  assert.equal(tenantMemberHistoricalParity(primary, continuity, {...historicalBefore, role:'OWNER'}, historicalAfter), false);
});
