import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveLiveMirrorCertification, type MirrorCertificationInput } from './primaryMirrorCertification';

const snapshot: MirrorCertificationInput = {
  mode: 'PRIMARY', recordedCertified: true, recordedBacklog: 0,
  verifiedAt: '2026-10-18T02:24:46.925Z',
  observedAt: '2026-10-18T02:53:15.330Z',
  outbox: { pending: 0, conflicts: 0 },
  journal: { pending: 0, conflicts: 0, protectedPending: 0 },
};
test('fully observed fresh historical receipt with zero live pending is certified AS OF READ', () => {
  const result = deriveLiveMirrorCertification(snapshot);
  assert.equal(result.certified, true);
  assert.equal(result.reason, 'CERTIFIED_AS_OF_READ');
  assert.equal(result.readConsistency, 'INDEPENDENT_NON_ATOMIC_PLANE_READS');
});
test('reported SFI_ROOT discrepancy: Neon certified but 13 new primary writes fails closed', () => {
  const result = deriveLiveMirrorCertification({ ...snapshot, outbox: { pending: 13, conflicts: 0 } });
  assert.equal(result.certified, false);
  assert.equal(result.reason, 'OUTBOX_PENDING');
  assert.equal(result.recordedCertified, true);
  assert.equal(result.primaryPendingAtRead, 13);
});
test('unavailable outbox, including expired or revoked credentials, cannot certify', () => {
  const result = deriveLiveMirrorCertification({ ...snapshot, outbox: null });
  assert.equal(result.certified, false);
  assert.equal(result.reason, 'OUTBOX_UNAVAILABLE');
});
test('conflicts, protected journal backlog and RECOVERY always block certification', () => {
  assert.equal(deriveLiveMirrorCertification({ ...snapshot, outbox: { pending: 0, conflicts: 1 } }).reason, 'OUTBOX_CONFLICT');
  assert.equal(deriveLiveMirrorCertification({ ...snapshot, journal: { pending: 0, conflicts: 0, protectedPending: 1 } }).reason, 'JOURNAL_NOT_CLEAN');
  assert.equal(deriveLiveMirrorCertification({ ...snapshot, mode: 'RECOVERY' }).reason, 'NOT_PRIMARY');
});
test('old, missing or future verification timestamps are not fresh proof', () => {
  assert.equal(deriveLiveMirrorCertification({ ...snapshot, observedAt: '2026-10-18T04:24:47.925Z' }).reason, 'VERIFICATION_STALE');
  assert.equal(deriveLiveMirrorCertification({ ...snapshot, verifiedAt: null }).reason, 'VERIFICATION_TIMESTAMP_MISSING');
  assert.equal(deriveLiveMirrorCertification({ ...snapshot, observedAt: '2026-10-18T02:00:00Z' }).reason, 'VERIFICATION_STALE');
});
test('Neon has not certified, or stores a nonzero backlog, even if primary currently has none', () => {
  assert.equal(deriveLiveMirrorCertification({ ...snapshot, recordedCertified: false }).reason, 'NEON_NOT_CERTIFIED');
  assert.equal(deriveLiveMirrorCertification({ ...snapshot, recordedBacklog: 1 }).reason, 'NEON_RECORDED_BACKLOG');
});

test('never declare current parity when a newly pending source transaction postdates a verified Neon receipt', () => {
  const state = deriveLiveMirrorCertification({
    ...snapshot,
    verifiedAt: '2026-10-18T02:24:46.925Z',
    observedAt: '2026-10-18T02:44:48.012Z',
    outbox: { pending: 2, conflicts: 0 },
  });
  assert.equal(state.certified, false);
  assert.equal(state.reason, 'OUTBOX_PENDING');
  assert.equal(state.readConsistency, 'INDEPENDENT_NON_ATOMIC_PLANE_READS');
  assert.equal(state.primaryPendingAtRead, 2);
});
