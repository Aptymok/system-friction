import 'server-only';

import { readDataPlaneState, journalBacklog } from '@/lib/persistence/dataPlaneContinuityStore';
import { readPrimaryOutboxStatus } from '@/lib/persistence/primaryMirror';
import { recoverPrimaryDataPlane } from '@/lib/persistence/continuityRecovery';

/**
 * A single bounded recovery authority for the existing SFI two-plane system.
 * It never bypasses the journal, chooses a winner for divergent records,
 * erases a conflict, or promotes the primary on an unverified fingerprint.
 */
export async function readDataPlaneReconciliationStatus() {
  const [state, journal, mirrorResult] = await Promise.all([
    readDataPlaneState(),
    journalBacklog(),
    readPrimaryOutboxStatus()
      .then((status) => ({ ok: true as const, status }))
      .catch((error) => ({
        ok: false as const,
        error: error instanceof Error ? error.message.slice(0,400) : String(error).slice(0,400),
      })),
  ]);

  const mirror = mirrorResult.ok ? mirrorResult.status : null;
  const blocker = state.mode === 'PRIMARY'
    ? 'PRIMARY_ALREADY_ACTIVE'
    : !mirrorResult.ok
      ? 'PRIMARY_OUTBOX_UNAVAILABLE'
      : (mirror!.pending > 0 || mirror!.conflicts > 0)
        ? 'PRIMARY_OUTBOX_RECONCILIATION_REQUIRED'
        : journal.conflicts > 0
          ? 'CONTINUITY_JOURNAL_CONFLICT_REQUIRES_REVIEW'
          : null;

  return {
    observedAt: new Date().toISOString(),
    dataPlane: {
      mode: state.mode,
      epoch: state.epoch,
      primaryLastOkAt: state.primary_last_ok_at,
      primaryErrorCode: state.primary_error_code,
      primaryMirrorCertified: state.primary_mirror_certified,
      primaryMirrorBacklog: state.primary_mirror_backlog,
    },
    journal: {
      pending: journal.pending,
      conflicts: journal.conflicts,
    },
    primaryOutbox: mirror,
    primaryOutboxError: mirrorResult.ok ? null : mirrorResult.error,
    safeRecoveryEligible: blocker === null,
    blocker,
    scheduling: {
      source: '.github/workflows/sfi-continuity-hourly.yml',
      timesUtc: ['HH:15', 'HH:45'],
      manual: 'SFI ROOT data_plane_emergency / recover_once',
    },
    boundary: 'Monitoring and replay are separate. No forced primary switch, conflict deletion, credential change, or automatic authority elevation.',
  };
}

export async function attemptBoundedDataPlaneReconciliation(maxTransactions: number) {
  const before = await readDataPlaneReconciliationStatus();
  if (!before.safeRecoveryEligible) {
    return {
      ok: true as const,
      attempted: false as const,
      outcome: 'BLOCKED_BY_SAFETY_GATE' as const,
      before,
      after: before,
    };
  }

  // Reuse the existing journal replay, mirror reconciliation and fingerprint
  // gates. Even a manual ROOT emergency request cannot override these gates.
  const limit = Math.max(1, Math.min(32, Math.floor(maxTransactions)));
  const recovery = await recoverPrimaryDataPlane({ maxTransactions: limit });
  const after = await readDataPlaneReconciliationStatus();
  return {
    ok: recovery.ok === true,
    attempted: true as const,
    outcome: recovery.ok && recovery.recovered
      ? 'PRIMARY_RECOVERED' as const
      : recovery.ok
        ? 'RECOVERY_NOOP' as const
        : 'RECOVERY_NOT_COMPLETE' as const,
    recovery,
    before,
    after,
  };
}
