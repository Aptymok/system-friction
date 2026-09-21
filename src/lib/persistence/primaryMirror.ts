import 'server-only';

import { postNeonDataPlaneRpc, postPrimaryDataPlaneRpc } from '@/lib/persistence/dataPlaneRpc';

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
  const maxTransactions = Math.max(1, Math.min(input.maxTransactions ?? 8, 32));
  let mirroredTransactions = 0;
  let mirroredRows = 0;

  try {
    for (let index = 0; index < maxTransactions; index += 1) {
      const batch = await postPrimaryDataPlaneRpc<ClaimedBatch>('sfi_claim_primary_outbox_batch_v1');
      if (!batch || batch.empty || !batch.sourceTxid || !Array.isArray(batch.entries) || batch.entries.length === 0) break;

      try {
        await postNeonDataPlaneRpc('sfi_apply_primary_mirror_batch_v1', {
          p_source_txid: batch.sourceTxid,
          p_entries: batch.entries,
        });
        await acknowledge(batch.entries, 'MIRRORED');
        mirroredTransactions += 1;
        mirroredRows += batch.entries.length;
      } catch (error) {
        const detail = message(error);
        if (detail.includes('SFI_PRIMARY_MIRROR_CONFLICT')) {
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
    const certified = status.pending === 0 && status.conflicts === 0;
    await setPrimaryMirrorCertification(
      certified,
      status.pending,
      certified ? null : `PRIMARY_OUTBOX_PENDING_OR_CONFLICT:pending=${status.pending}:conflicts=${status.conflicts}`,
    );

    return { ok: certified, conflict: status.conflicts > 0, status, mirroredTransactions, mirroredRows };
  } catch (error) {
    const detail = message(error);
    await setPrimaryMirrorCertification(false, 1, detail).catch(() => null);
    return { ok: false as const, conflict: false as const, error: detail, mirroredTransactions, mirroredRows };
  }
}


export async function invalidatePrimaryMirrorCertification(error: string) {
  return setPrimaryMirrorCertification(false, 1, error).catch(() => null);
}
