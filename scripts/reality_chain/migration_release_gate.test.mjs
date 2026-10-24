import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assessRealityChainMigrationRelease } from './migration_release_gate.mjs';

function eligible() {
  return {
    evaluatedAt: '2026-10-24T16:20:00.000Z',
    rootStatus: {
      observedAt: '2026-10-24T16:19:00.000Z',
      dataPlane: { mode: 'PRIMARY', primaryMirrorCertified: true, primaryErrorCode: null },
      primaryMirrorCertificate: { certified: true, verifiedAt: '2026-10-24T16:19:00.000Z' },
      journal: { pending: 0, conflicts: 0, protectedPending: 0 },
      primaryOutbox: { pending: 0, conflicts: 0 },
    },
    providers: {
      supabase: { baseCaseTablesPresent: true, columnsCompatible: true },
      neon: { baseCaseTablesPresent: true, columnsCompatible: true },
    },
    isolatedTests: { migration: true, atomicity: true, twoSessionConcurrency: true, replicationReplay: true, caseParentRevisionReplay: true, caseRowDigestParity: true },
    explicitHumanApproval: true,
  };
}
test('all independent preconditions produce only an advisory readiness result', () => {
  const result = assessRealityChainMigrationRelease(eligible());
  assert.equal(result.readyForHumanReviewedRelease, true);
  assert.equal(result.blockers.length, 0);
  assert.match(result.boundary, /ADVISORY_ONLY/);
});
test('real recovery-like conditions are blocked even with empty queues', () => {
  const input = eligible();
  input.rootStatus.dataPlane = { mode: 'RECOVERY', primaryMirrorCertified: false, primaryErrorCode: 'SUPABASE_TRANSPORT_UNAVAILABLE' };
  input.rootStatus.primaryMirrorCertificate.certified = false;
  const result = assessRealityChainMigrationRelease(input);
  assert.equal(result.readyForHumanReviewedRelease, false);
  for (const expected of ['DATA_PLANE_NOT_PRIMARY', 'MIRROR_NOT_CERTIFIED', 'PRIMARY_TRANSPORT_ERROR']) {
    assert.ok(result.blockers.includes(expected));
  }
});
test('old receipts cannot authorize release', () => {
  const input = eligible();
  input.rootStatus.primaryMirrorCertificate.verifiedAt = '2026-10-24T15:00:00.000Z';
  assert.ok(assessRealityChainMigrationRelease(input).blockers.includes('CURRENT_INDEPENDENT_STATUS_REQUIRED'));
});
test('missing checks and authorization fail closed', () => {
  const input = eligible();
  delete input.providers.neon;
  input.isolatedTests.twoSessionConcurrency = false;
  input.isolatedTests.replicationReplay = false;
  input.explicitHumanApproval = false;
  const blockers = assessRealityChainMigrationRelease(input).blockers;
  assert.ok(blockers.includes('PROVIDER_SCHEMA_PRECHECK_MISSING'));
  assert.ok(blockers.includes('ISOLATED_RELEASE_TESTS_INCOMPLETE'));
  assert.ok(blockers.includes('HUMAN_PRODUCTION_APPROVAL_REQUIRED'));
});
test('unknown queue counts and future-dated receipts never pass', () => {
  const input = eligible();
  input.rootStatus.journal.pending = undefined;
  input.rootStatus.observedAt = '2026-10-24T16:25:00.000Z';
  const blockers = assessRealityChainMigrationRelease(input).blockers;
  assert.ok(blockers.includes('JOURNAL_NOT_CLEAN'));
  assert.ok(blockers.includes('CURRENT_INDEPENDENT_STATUS_REQUIRED'));
});

test('trigger-disabled replay cannot pass with missing parent revision or case digest parity', () => {
  const input = eligible();
  input.isolatedTests.caseParentRevisionReplay = false;
  assert.ok(assessRealityChainMigrationRelease(input).blockers.includes('CASE_REVISION_REPLAY_PARITY_UNVERIFIED'));
  input.isolatedTests.caseParentRevisionReplay = true;
  input.isolatedTests.caseRowDigestParity = false;
  assert.ok(assessRealityChainMigrationRelease(input).blockers.includes('CASE_REVISION_REPLAY_PARITY_UNVERIFIED'));
});
