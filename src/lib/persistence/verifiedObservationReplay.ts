import 'server-only';

import { continuityDatabase } from '@/lib/sfi/continuityPostgres';
import { postPrimaryDataPlaneRpc, probePrimaryDataPlane } from '@/lib/persistence/dataPlaneRpc';
import { readDataPlaneState } from '@/lib/persistence/dataPlaneContinuityStore';

/**
 * Incremental, insert-only recovery for immutable observed source records.
 * This is not a state switch or general journal conflict override.
 * Only exact source image, single-row primary RPC, and durable journal receipt count.
 */
export async function replayVerifiedSourceObservations(input: { maxEntries?: number } = {}) {
  const requested = Number(input.maxEntries ?? 12);
  const limit = Number.isFinite(requested) ? Math.max(1, Math.min(20, Math.floor(requested))) : 12;
  const state = await readDataPlaneState();
  if (state.mode === 'PRIMARY') {
    return { ok: true, attempted: false, reason: 'PRIMARY_ALREADY_ACTIVE', recovered: 0, alreadyApplied: 0, conflicts: 0 };
  }
  const probe = await probePrimaryDataPlane();
  if (!probe.ok) {
    return { ok: false, attempted: false, reason: 'PRIMARY_TRANSPORT_UNAVAILABLE', recovered: 0, alreadyApplied: 0, conflicts: 0, primaryHttpStatus: probe.status };
  }

  const sql = continuityDatabase();
  const candidates = await sql`
    select j.operation_id::text as operation_id,
           j.epoch::text as epoch,
           j.source_txid::text as source_txid,
           j.table_name, j.operation, j.row_data, j.before_data
    from public.sfi_data_plane_write_journal j
    join public.world_source_observations o on o.id::text = j.row_data->>'id'
    where j.status = 'PENDING'
      and j.table_name = 'world_source_observations'
      and j.operation = 'UPSERT'
      and j.before_data is null
      and j.row_data = to_jsonb(o)
    order by j.sequence asc
    limit ${limit}
  `;

  let recovered = 0, alreadyApplied = 0, conflicts = 0;
  const failures: Array<{ type: string; reason: string }> = [];

  for (const entry of candidates) {
    const operationId = String(entry.operation_id);
    const epoch = String(entry.epoch);
    const sourceTxid = String(entry.source_txid);
    const rowData = entry.row_data as Record<string, unknown>;

    // Re-check source freshness just before each remote write.
    const current = await sql`
      select 1 as matching
      from public.sfi_data_plane_write_journal j
      join public.world_source_observations o on o.id::text = j.row_data->>'id'
      where j.operation_id = ${operationId}::uuid
        and j.status = 'PENDING'
        and j.row_data = to_jsonb(o)
        and j.before_data is null
      limit 1
    `;
    if (!current.length) {
      failures.push({ type: 'SOURCE_CHANGED', reason: 'Source no longer matches the historical insert image' });
      continue;
    }
    try {
      const result = await postPrimaryDataPlaneRpc<{ ok?: boolean; applied?: number; alreadyApplied?: number }>(
        'sfi_apply_continuity_batch_v1',
        { p_epoch: epoch, p_source_txid: sourceTxid, p_entries: [{
          operation_id: operationId, table_name: 'world_source_observations',
          operation: 'UPSERT', row_data: rowData, before_data: null,
        }] },
      );
      if (result?.ok !== true || Number(result.applied ?? 0) + Number(result.alreadyApplied ?? 0) !== 1) {
        failures.push({ type: 'PRIMARY_RETURN_NOT_CONFIRMED', reason: 'Canonical RPC did not confirm one applied or already-applied record' });
        break;
      }
      // Mark REPLAYED only after the canonical primary operation returned success.
      const acknowledged = await sql`
        update public.sfi_data_plane_write_journal
        set status='REPLAYED', replayed_at=now(), last_error=null, updated_at=now()
        where operation_id=${operationId}::uuid and status='PENDING'
          and table_name='world_source_observations'
          and operation='UPSERT'
          and before_data is null
        returning operation_id
      `;
      if (!acknowledged.length) {
        failures.push({ type: 'JOURNAL_ACK_UNCERTAIN', reason: 'Primary accepted record but continuity acknowledgement was not committed; primary RPC is idempotent' });
        break;
      }
      recovered += Number(result.applied ?? 0);
      alreadyApplied += Number(result.alreadyApplied ?? 0);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (/SFI_CONTINUITY_(INSERT_)?CONFLICT/.test(msg)) {
        conflicts++;
        failures.push({ type: 'PRIMARY_ROW_CONFLICT', reason: 'Primary row differs. No overwrite; journal retained' });
        continue;
      }
      failures.push({ type: 'TRANSPORT_OR_RPC_FAILURE', reason: 'Recovery halted; primary or RPC rejected the operation' });
      break;
    }
  }
  const remainingRows = await sql`
    select count(*)::int as pending
    from public.sfi_data_plane_write_journal
    where status='PENDING'
      and table_name='world_source_observations'
  `;
  return {
    ok: failures.length === 0,
    attempted: candidates.length > 0,
    selected: candidates.length,
    recovered,
    alreadyApplied,
    conflicts,
    failures,
    remainingSourceObservations: Number(remainingRows[0]?.pending ?? 0),
    dataPlaneSwitched: false,
    journalConflictOverride: false,
    primaryOutboxConflictOverride: false,
    boundary: 'Only immutable source rows with exact current image; canonical primary RPC validates existence and never overwrites a divergent insert. State promotion remains governed by the existing full recovery gate.',
  };
}
