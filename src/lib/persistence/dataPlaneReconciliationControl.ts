import 'server-only';

import { readDataPlaneState, journalBacklog } from '@/lib/persistence/dataPlaneContinuityStore';
import { readPrimaryOutboxStatus } from '@/lib/persistence/primaryMirror';
import { deriveLiveMirrorCertification } from '@/lib/persistence/primaryMirrorCertification';
import { continuityDatabase } from '@/lib/sfi/continuityPostgres';

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
  const observedAt = new Date().toISOString();
  // Never equate Neon's last certification receipt with *current* parity.
  // Reading the live primary outbox invalidates its effective status when
  // pending writes, conflicts or a stale verification are observed.
  const mirrorCertificate = deriveLiveMirrorCertification({
    mode: state.mode,
    recordedCertified: state.primary_mirror_certified,
    recordedBacklog: Number(state.primary_mirror_backlog ?? 0),
    verifiedAt: state.primary_mirror_verified_at,
    outbox: mirror,
    journal: { pending: journal.pending, conflicts: journal.conflicts, protectedPending },
    observedAt,
  });
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
    observedAt,
    dataPlane: {
      mode: state.mode,
      epoch: state.epoch,
      primaryLastOkAt: state.primary_last_ok_at,
      primaryErrorCode: state.primary_error_code,
      primaryMirrorCertified: mirrorCertificate.certified,
      primaryMirrorRecordedCertified: state.primary_mirror_certified,
      primaryMirrorCertificateReason: mirrorCertificate.reason,
      primaryMirrorVerifiedAt: state.primary_mirror_verified_at,
      primaryMirrorBacklog: mirror?.pending ?? state.primary_mirror_backlog,
    },
    journal: {
      pending: journal.pending,
      conflicts: journal.conflicts,
      protectedPending,
      pendingByTable,
    },
    primaryOutbox: mirror,
    primaryMirrorCertificate: mirrorCertificate,
    primaryOutboxError: mirrorResult.ok ? null : mirrorResult.error,
    safeRecoveryEligible: blocker === null,
    blocker,
    scheduling: {
      source: '.github/workflows/sfi-continuity-hourly.yml',
      timesUtc: ['HH:17'],
      triggerTypes: ['schedule', 'workflow_dispatch', 'workflow_run'],
      manual: 'SFI ROOT data_plane_emergency / recover_once',
    },
    boundary: 'Monitoring and replay are separate. No forced primary switch, conflict deletion, credential change, or automatic authority elevation.',
  };
}

/**
 * Compatibility endpoint for retired replication. Does not read or write
 * either data plane: old backlogs are historical and not operational debt.
 */
export async function attemptBoundedDataPlaneReconciliation(maxTransactions: number) {
  void maxTransactions;
  return {ok:false as const,attempted:false as const,
    outcome:'SFI_REPLICATION_RETIRED_BY_FOUNDER' as const,
    replicationEnabled:false as const,
    primaryMirror:null,authoritySupersession:null,before:null,after:null,
    forcedFailover:false as const};
}
