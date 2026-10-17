import 'server-only';

import { readDataPlaneState, journalBacklog } from '@/lib/persistence/dataPlaneContinuityStore';
import { readPrimaryOutboxStatus, flushPrimaryMirror } from '@/lib/persistence/primaryMirror';
import { replayVerifiedSourceObservations } from '@/lib/persistence/verifiedObservationReplay';
import { recoverPrimaryDataPlane } from '@/lib/persistence/continuityRecovery';
import { continuityDatabase } from '@/lib/sfi/continuityPostgres';
import { reconcileSupersededAuthorityJournal } from '@/lib/persistence/authorityJournalSupersession';

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

  const journalRows = await continuityDatabase()`
    select table_name, status, count(*)::int as entries,
           min(created_at)::text as oldest_at,
           sum(count(*)) filter (where table_name in ('profiles','sfi_account_access_grants','sfi_tenant_members','action_proposals') and status in ('PENDING','REPLAYING')) over () as protected_pending
    from public.sfi_data_plane_write_journal
    where status in ('PENDING', 'REPLAYING', 'CONFLICT')
    group by table_name, status
    order by count(*) desc
    limit 30
  `;
  const pendingByTable = journalRows.map((value) => ({
    table: String(value.table_name),
    state: String(value.status),
    entries: Number(value.entries),
    oldestAt: String(value.oldest_at),
  }));

  const protectedPending = Number(journalRows[0]?.protected_pending ?? 0);
  const mirror = mirrorResult.ok ? mirrorResult.status : null;
  const blocker = state.mode === 'PRIMARY'
    ? 'PRIMARY_ALREADY_ACTIVE'
    : !mirrorResult.ok
      ? 'PRIMARY_OUTBOX_UNAVAILABLE'
      : (mirror!.pending > 0 || mirror!.conflicts > 0)
        ? 'PRIMARY_OUTBOX_RECONCILIATION_REQUIRED'
        : journal.conflicts > 0
          ? 'CONTINUITY_JOURNAL_CONFLICT_REQUIRES_REVIEW'
          : protectedPending > 0
            ? 'MEM003_PROTECTED_AUTHORITY_RECONCILIATION_REQUIRED'
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
      protectedPending,
      pendingByTable,
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
  // Already PRIMARY is not a recovery blocker for continuing forward mirror
  // delivery. Reuse the same 2/hour OIDC-authorized reconciliation endpoint;
  // never reopen RECOVERY, elevate authority, erase journal history, or mint
  // certification when any independent mirror gate remains unresolved.
  if (before.dataPlane.mode === 'PRIMARY') {
    const conflict = before.journal.pending > 0
      || before.journal.conflicts > 0
      || before.journal.protectedPending > 0
      || (before.primaryOutbox?.conflicts ?? 0) > 0
      || before.primaryOutboxError !== null;
    if (conflict) {
      return {
        ok: false as const,
        attempted: false as const,
        outcome: 'PRIMARY_MIRROR_REQUIRES_REVIEW' as const,
        primaryMirror: null,
        authoritySupersession: null,
        before,
        after: before,
      };
    }

    const limit = Math.max(1, Math.min(8, Number.isFinite(maxTransactions) ? Math.floor(maxTransactions) : 8));
    const primaryMirror = await flushPrimaryMirror({ maxTransactions: limit });
    const after = await readDataPlaneReconciliationStatus();
    return {
      ok: primaryMirror.ok === true && primaryMirror.certified === true,
      attempted: true as const,
      outcome: primaryMirror.ok && primaryMirror.certified
        ? 'PRIMARY_MIRROR_CERTIFIED' as const
        : primaryMirror.conflict
          ? 'PRIMARY_MIRROR_CONFLICT' as const
          : 'PRIMARY_MIRROR_PENDING' as const,
      primaryMirror,
      authoritySupersession: null,
      before,
      after,
    };
  }

  // Reconcile only authority records whose current identity, role, grants and
  // scopes agree independently on both providers. No relaxed security gate:
  // a mismatched authority record still blocks recovery.
  const authoritySupersession = await reconcileSupersededAuthorityJournal({
    maxEntries: 12,
  }).catch(() => ({
    checked: 0, superseded: 0, protectedMismatches: 0,
    primaryUnavailable: true, primaryPromoted: false,
    credentialsModified: false, authorityModified: false,
    policy: 'Unable to verify primary independently; no source row was modified',
  }));
  if (!before.safeRecoveryEligible) {
    // The global recovery gate remains closed. Only the pre-existing,
    // insert-only verified source-observation lane may make incremental
    // progress; it cannot change authority, clear conflicts or promote PRIMARY.
    const canCopy = before.dataPlane.mode !== 'PRIMARY'
      && before.journal.pending > 0
      && before.blocker !== 'PRIMARY_OUTBOX_UNAVAILABLE';
    const copyLimit = Math.max(1, Math.min(12, Number.isFinite(maxTransactions) ? Math.floor(maxTransactions) : 8));
    const verifiedSourceReplay = canCopy
      ? await replayVerifiedSourceObservations({ maxEntries: copyLimit })
      : null;
    const after = canCopy ? await readDataPlaneReconciliationStatus() : before;
    const progress = Number(verifiedSourceReplay?.recovered ?? 0) + Number(verifiedSourceReplay?.alreadyApplied ?? 0);
    return {
      ok: verifiedSourceReplay?.ok !== false,
      attempted: verifiedSourceReplay?.attempted === true,
      outcome: verifiedSourceReplay?.ok === false
        ? 'VERIFIED_SOURCE_REPLAY_PARTIAL_OR_FAILED' as const
        : progress > 0
          ? 'VERIFIED_SOURCE_REPLAY_PROGRESS' as const
          : 'BLOCKED_BY_SAFETY_GATE' as const,
      verifiedSourceReplay,
      authoritySupersession,
      before,
      after,
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
    authoritySupersession,
    before,
    after,
  };
}
