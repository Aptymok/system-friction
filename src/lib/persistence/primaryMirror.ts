import 'server-only';

import { postNeonDataPlaneRpc, postPrimaryDataPlaneRpc } from '@/lib/persistence/dataPlaneRpc';
import { journalBacklog, readDataPlaneState } from '@/lib/persistence/dataPlaneContinuityStore';
import { assessCaseMirrorDelivery } from '@/lib/persistence/realityChainReplayBatch.mjs';

type OutboxEntry = {
  operation_id: string;
  source_txid: number | string;
  table_name: string;
  operation: 'UPSERT' | 'DELETE';
  row_data: Record<string, unknown>;
  before_data: Record<string, unknown> | null;
};

type ClaimedBatch = {
  ok: boolean;
  empty: boolean;
  sourceTxid: number | string | null;
  entryCount?: number;
  entries: OutboxEntry[];
};

type OutboxStatus = {
  pending: number | string;
  conflicts: number | string;
  oldestPendingAt?: string | null;
  lastMirroredAt?: string | null;
};

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function setPrimaryMirrorCertification(certified: boolean, backlog: number, error: string | null) {
  return postNeonDataPlaneRpc('sfi_set_primary_mirror_certification_v1', {
    p_certified: certified,
    p_backlog: backlog,
    p_error: error,
  });
}

async function acknowledge(entries: OutboxEntry[], status: 'MIRRORED' | 'CONFLICT' | 'PENDING', error?: string | null) {
  if (!entries.length) return 0;
  return postPrimaryDataPlaneRpc<number>('sfi_ack_primary_outbox_v1', {
    p_operation_ids: entries.map((entry) => entry.operation_id),
    p_status: status,
    p_error: error ?? null,
  });
}

export async function readPrimaryOutboxStatus() {
  const status = await postPrimaryDataPlaneRpc<OutboxStatus>('sfi_primary_outbox_status_v1');
  return {
    pending: Number(status?.pending ?? 0),
    conflicts: Number(status?.conflicts ?? 0),
    oldestPendingAt: status?.oldestPendingAt ?? null,
    lastMirroredAt: status?.lastMirroredAt ?? null,
  };
}

export async function flushPrimaryMirror(input: { maxTransactions?: number } = {}) {
  void input;
  return { ok: true as const, skipped: true as const, certified: false as const,
    reason: 'SFI_REPLICATION_RETIRED_BY_FOUNDER' as const,
    mirroredTransactions: 0, mirroredRows: 0, replicationEnabled: false as const };

  const maxTransactions = Math.max(1, Math.min(input.maxTransactions ?? 8, 32));
  let mirroredTransactions = 0;
  let mirroredRows = 0;

  try {
    for (let index = 0; index < maxTransactions; index += 1) {
      const batch = await postPrimaryDataPlaneRpc<ClaimedBatch>('sfi_claim_primary_outbox_batch_v1');
      if (!batch || batch.empty || !batch.sourceTxid || !Array.isArray(batch.entries) || batch.entries.length === 0) break;

      try {
        // Existing case writes continue in legacy mode. Any migrated parent
        // snapshot or explicitly activated release guard must satisfy the
        // same exact-transaction parent revision gate before Neon receives it.
        const caseReplay = assessCaseMirrorDelivery(batch.entries, {
          strict: process.env.SFI_RC_REPLAY_REQUIRE_PARENT_SNAPSHOT === 'true',
        });
        if (!caseReplay.allowed) {
          throw new Error(`SFI_CASE_REPLAY_PARENT_REVISION_REQUIRED:${caseReplay.blockers.join(',')}`);
        }
        await postNeonDataPlaneRpc('sfi_apply_primary_mirror_batch_v1', {
          p_source_txid: batch.sourceTxid,
          p_entries: batch.entries,
        });
        await acknowledge(batch.entries, 'MIRRORED');
        mirroredTransactions += 1;
        mirroredRows += batch.entries.length;
      } catch (error) {
        const detail = message(error);
        if (detail.includes('SFI_PRIMARY_MIRROR_CONFLICT') || detail.includes('SFI_PRIMARY_MIRROR_INSERT_CONFLICT') || detail.includes('SFI_CASE_REPLAY_PARENT_REVISION_REQUIRED')) {
          await acknowledge(batch.entries, 'CONFLICT', detail).catch(() => null);
          await setPrimaryMirrorCertification(false, batch.entries.length, detail).catch(() => null);
          return { ok: false as const, conflict: true as const, error: detail, mirroredTransactions, mirroredRows };
        }
        await acknowledge(batch.entries, 'PENDING', detail).catch(() => null);
        await setPrimaryMirrorCertification(false, batch.entries.length, detail).catch(() => null);
        return { ok: false as const, conflict: false as const, error: detail, mirroredTransactions, mirroredRows };
      }
    }

    const status = await readPrimaryOutboxStatus();
    const outboxClear = status.pending === 0 && status.conflicts === 0;
    // Mirror drain is not a recovered/certified two-plane state. This remains
    // false throughout RECOVERY, even when PRIMARY -> Neon is fully settled.
    const [plane, journal] = await Promise.all([readDataPlaneState(), journalBacklog()]);
    const certified = outboxClear
      && plane.mode === 'PRIMARY'
      && journal.pending === 0
      && journal.conflicts === 0;
    await setPrimaryMirrorCertification(
      certified,
      status.pending,
      certified
        ? null
        : `SFI_MIRROR_CERTIFICATION_GATED:mode=${plane.mode}:outboxPending=${status.pending}:outboxConflicts=${status.conflicts}:journalPending=${journal.pending}:journalConflicts=${journal.conflicts}`,
    );

    // Preserve the independent outbox result. Recovery must still be able to
    // replay the continuity journal while certification is intentionally false.
    return { ok: outboxClear, certified, conflict: status.conflicts > 0, status, mirroredTransactions, mirroredRows };
  } catch (error) {
    const detail = message(error);
    await setPrimaryMirrorCertification(false, 1, detail).catch(() => null);
    return { ok: false as const, conflict: false as const, error: detail, mirroredTransactions, mirroredRows };
  }
}


export async function invalidatePrimaryMirrorCertification(error: string) {
  return setPrimaryMirrorCertification(false, 1, error).catch(() => null);
}
