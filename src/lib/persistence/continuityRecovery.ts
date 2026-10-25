import 'server-only';

import {
  claimPendingJournalBatch,
  completeRecoveryMode,
  enterRecoveryMode,
  journalBacklog,
  markJournalBatchConflict,
  markJournalBatchReplayed,
  releaseJournalBatchForRetry,
  readDataPlaneState,
} from '@/lib/persistence/dataPlaneContinuityStore';
import { flushPrimaryMirror } from '@/lib/persistence/primaryMirror';
import { currentAuthorityParityVerified } from '@/lib/persistence/authorityJournalSupersession';
import { postNeonDataPlaneRpc, postPrimaryDataPlaneRpc, probePrimaryDataPlane } from '@/lib/persistence/dataPlaneRpc';
import { comparePagedFingerprints, type FingerprintRow } from './pagedFingerprint';

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function fingerprintsMatch() {
  // v2-equivalent per-table checks, transported in bounded RPC pages because
  // the legacy all-table RPC exceeds the primary HTTP statement timeout.
  // Both providers must enumerate the same 161+ tables in the same order;
  // any missing table, digest mismatch or RPC failure blocks certification.
  return comparePagedFingerprints(
    (afterTable, limit) => postPrimaryDataPlaneRpc<FingerprintRow[]>('sfi_data_plane_fingerprint_page_v1', {
      p_after_table: afterTable, p_limit: limit,
    }),
    (afterTable, limit) => postNeonDataPlaneRpc<FingerprintRow[]>('sfi_data_plane_fingerprint_page_v1', {
      p_after_table: afterTable, p_limit: limit,
    }),
    { minimumTableCount: 161, verifyProtectedTable: currentAuthorityParityVerified },
  );
}

export async function recoverPrimaryDataPlane(input: { maxTransactions?: number } = {}) {
  void input;
  return { ok: false as const, recovered: false as const, attempted: false as const,
    reason: 'SFI_REPLICATION_RETIRED_BY_FOUNDER' as const };

  const current = await readDataPlaneState();
  if (current.mode === 'PRIMARY') return { ok: true as const, recovered: false as const, reason: 'PRIMARY_ALREADY_ACTIVE' };

  const probe = await probePrimaryDataPlane();
  if (!probe.ok) return { ok: false as const, recovered: false as const, reason: 'PRIMARY_STILL_UNAVAILABLE', probe };

  await enterRecoveryMode();

  const preFailoverMirror = await flushPrimaryMirror({ maxTransactions: 16 });
  if (!preFailoverMirror.ok) {
    return { ok: false as const, recovered: false as const, reason: 'PRIMARY_OUTBOX_RECONCILIATION_BLOCKED', mirror: preFailoverMirror };
  }

  const maxTransactions = Math.max(1, Math.min(input.maxTransactions ?? 16, 64));
  let replayedTransactions = 0;
  let replayedRows = 0;

  for (let index = 0; index < maxTransactions; index += 1) {
    const batch = await claimPendingJournalBatch();
    if (!batch || !batch.entries.length) break;
    try {
      await postPrimaryDataPlaneRpc('sfi_apply_continuity_batch_v1', {
        p_epoch: batch.epoch,
        p_source_txid: batch.sourceTxid,
        p_entries: batch.entries.map((entry) => ({
          operation_id: entry.operation_id,
          table_name: entry.table_name,
          operation: entry.operation,
          row_data: entry.row_data,
          before_data: entry.before_data,
        })),
      });
      await markJournalBatchReplayed(batch.entries);
      replayedTransactions += 1;
      replayedRows += batch.entries.length;
    } catch (error) {
      const detail = message(error);
      if (detail.includes('SFI_CONTINUITY_CONFLICT') || detail.includes('SFI_CONTINUITY_INSERT_CONFLICT')) {
        await markJournalBatchConflict(batch.entries, detail);
        return { ok: false as const, recovered: false as const, reason: 'CONTINUITY_REPLAY_CONFLICT', error: detail, replayedTransactions, replayedRows };
      }
      await releaseJournalBatchForRetry(batch.entries, detail);
      return { ok: false as const, recovered: false as const, reason: 'CONTINUITY_REPLAY_RETRY_REQUIRED', error: detail, replayedTransactions, replayedRows };
    }
  }

  const backlog = await journalBacklog();
  if (backlog.pending > 0 || backlog.conflicts > 0) {
    return { ok: false as const, recovered: false as const, reason: 'CONTINUITY_JOURNAL_NOT_EMPTY', backlog, replayedTransactions, replayedRows };
  }

  if (!await fingerprintsMatch()) {
    return { ok: false as const, recovered: false as const, reason: 'POST_RECOVERY_FINGERPRINT_MISMATCH', replayedTransactions, replayedRows };
  }

  const state = await completeRecoveryMode();
  await postNeonDataPlaneRpc('sfi_set_primary_mirror_certification_v1', {
    p_certified: true,
    p_backlog: 0,
    p_error: null,
  });

  return { ok: true as const, recovered: true as const, state, replayedTransactions, replayedRows };
}
