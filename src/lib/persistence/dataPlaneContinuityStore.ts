import 'server-only';

import { continuityDatabase } from '@/lib/sfi/continuityPostgres';

export type SfiDataPlaneMode = 'PRIMARY' | 'CONTINUITY' | 'RECOVERY';

export type SfiDataPlaneState = {
  id: string;
  mode: SfiDataPlaneMode;
  epoch: string;
  primary_last_ok_at: string | null;
  primary_last_error_at: string | null;
  continuity_entered_at: string | null;
  recovery_started_at: string | null;
  last_transition_at: string;
  primary_error_code: string | null;
  baseline_certified_at: string | null;
  baseline_fingerprint_version: string | null;
  primary_mirror_certified: boolean;
  primary_mirror_verified_at: string | null;
  primary_mirror_last_source_txid: string | null;
  primary_mirror_backlog: number;
  primary_mirror_last_error: string | null;
};

function stateRow(value: unknown): SfiDataPlaneState | null {
  return value && typeof value === 'object' ? value as SfiDataPlaneState : null;
}

export async function readDataPlaneState(): Promise<SfiDataPlaneState> {
  const sql = continuityDatabase();
  const rows = await sql`
    select id, mode, epoch::text, primary_last_ok_at::text, primary_last_error_at::text,
           continuity_entered_at::text, recovery_started_at::text,
           last_transition_at::text, primary_error_code,
           baseline_certified_at::text, baseline_fingerprint_version,
           primary_mirror_certified, primary_mirror_verified_at::text,
           primary_mirror_last_source_txid::text, primary_mirror_backlog,
           primary_mirror_last_error
    from sfi_data_plane_state
    where id = 'institution'
    limit 1
  `;
  const state = stateRow(rows[0]);
  if (!state) throw new Error('SFI_DATA_PLANE_STATE_MISSING');
  return state;
}

export async function enterContinuityMode(errorCode: string): Promise<SfiDataPlaneState> {
  const existing = await readDataPlaneState();
  if (existing.mode !== 'PRIMARY') return existing;

  const sql = continuityDatabase();
  const rows = await sql`
    update sfi_data_plane_state
    set mode = 'CONTINUITY',
        epoch = case when mode = 'PRIMARY' then gen_random_uuid() else epoch end,
        continuity_entered_at = case when mode = 'PRIMARY' then now() else continuity_entered_at end,
        recovery_started_at = null,
        primary_last_error_at = now(),
        primary_error_code = ${errorCode},
        last_transition_at = case when mode = 'PRIMARY' then now() else last_transition_at end,
        updated_at = now()
    where id = 'institution'
      and mode = 'PRIMARY'
      and baseline_certified_at is not null
      and primary_mirror_certified = true
      and primary_mirror_backlog = 0
      and primary_mirror_verified_at > now() - interval '2 hours'
    returning id, mode, epoch::text, primary_last_ok_at::text, primary_last_error_at::text,
              continuity_entered_at::text, recovery_started_at::text,
              last_transition_at::text, primary_error_code,
              baseline_certified_at::text, baseline_fingerprint_version,
              primary_mirror_certified, primary_mirror_verified_at::text,
              primary_mirror_last_source_txid::text, primary_mirror_backlog,
              primary_mirror_last_error
  `;
  const state = stateRow(rows[0]);
  if (!state) {
    const current = await readDataPlaneState();
    if (current.mode !== 'PRIMARY') return current;
    throw new Error('SFI_DATA_PLANE_CONTINUITY_NOT_CERTIFIED');
  }
  return state;
}

export async function markPrimaryHealthy() {
  const sql = continuityDatabase();
  await sql`
    update sfi_data_plane_state
    set primary_last_ok_at = now(), primary_error_code = null, updated_at = now()
    where id = 'institution'
  `;
}

export async function enterRecoveryMode(): Promise<SfiDataPlaneState> {
  const sql = continuityDatabase();
  const rows = await sql`
    update sfi_data_plane_state
    set mode = 'RECOVERY',
        recovery_started_at = coalesce(recovery_started_at, now()),
        last_transition_at = case when mode <> 'RECOVERY' then now() else last_transition_at end,
        updated_at = now()
    where id = 'institution' and mode <> 'PRIMARY'
    returning id, mode, epoch::text, primary_last_ok_at::text, primary_last_error_at::text,
              continuity_entered_at::text, recovery_started_at::text,
              last_transition_at::text, primary_error_code,
              baseline_certified_at::text, baseline_fingerprint_version,
              primary_mirror_certified, primary_mirror_verified_at::text,
              primary_mirror_last_source_txid::text, primary_mirror_backlog,
              primary_mirror_last_error
  `;
  return stateRow(rows[0]) ?? readDataPlaneState();
}

export async function completeRecoveryMode(): Promise<SfiDataPlaneState> {
  const sql = continuityDatabase();
  const rows = await sql`
    update sfi_data_plane_state
    set mode = 'PRIMARY', primary_last_ok_at = now(), primary_last_error_at = null,
        recovery_started_at = null, primary_error_code = null,
        last_transition_at = now(), updated_at = now()
    where id = 'institution'
      and not exists (
        select 1 from sfi_data_plane_write_journal
        where status in ('PENDING','REPLAYING','CONFLICT')
      )
    returning id, mode, epoch::text, primary_last_ok_at::text, primary_last_error_at::text,
              continuity_entered_at::text, recovery_started_at::text,
              last_transition_at::text, primary_error_code,
              baseline_certified_at::text, baseline_fingerprint_version,
              primary_mirror_certified, primary_mirror_verified_at::text,
              primary_mirror_last_source_txid::text, primary_mirror_backlog,
              primary_mirror_last_error
  `;
  const state = stateRow(rows[0]);
  if (!state) throw new Error('SFI_DATA_PLANE_RECOVERY_COMPLETION_FAILED');
  return state;
}

export type SfiDataPlaneJournalEntry = {
  sequence: number;
  operation_id: string;
  epoch: string;
  source_txid: string;
  table_name: string;
  operation: 'UPSERT' | 'DELETE';
  row_data: Record<string, unknown>;
  before_data: Record<string, unknown> | null;
  status: 'PENDING' | 'REPLAYING' | 'REPLAYED' | 'CONFLICT';
  replay_attempts: number;
  last_error: string | null;
};

export type SfiDataPlaneJournalBatch = {
  epoch: string;
  sourceTxid: string;
  entries: SfiDataPlaneJournalEntry[];
};

export async function claimPendingJournalBatch(): Promise<SfiDataPlaneJournalBatch | null> {
  const sql = continuityDatabase();
  return sql.begin(async (tx) => {
    const lockRows = await tx`select pg_try_advisory_xact_lock(hashtext('sfi_data_plane_recovery')) as locked`;
    if (lockRows[0]?.locked !== true) return null;

    const head = await tx`
      select epoch::text, source_txid::text
      from sfi_data_plane_write_journal
      where status = 'PENDING'
         or (status = 'REPLAYING' and updated_at < now() - interval '5 minutes')
      order by sequence asc
      limit 1
    `;
    const epoch = typeof head[0]?.epoch === 'string' ? head[0].epoch : null;
    const sourceTxid = typeof head[0]?.source_txid === 'string' ? head[0].source_txid : null;
    if (!epoch || !sourceTxid) return null;

    const rows = await tx`
      update sfi_data_plane_write_journal
      set status = 'REPLAYING',
          replay_attempts = replay_attempts + 1,
          updated_at = now()
      where epoch = ${epoch}::uuid
        and source_txid = ${sourceTxid}::bigint
        and (
          status = 'PENDING'
          or (status = 'REPLAYING' and updated_at < now() - interval '5 minutes')
        )
      returning sequence, operation_id::text, epoch::text, source_txid::text,
                table_name, operation, row_data, before_data, status, replay_attempts, last_error
    `;
    return { epoch, sourceTxid, entries: rows as unknown as SfiDataPlaneJournalEntry[] };
  });
}

async function updateBatchStatus(
  entries: SfiDataPlaneJournalEntry[],
  status: 'PENDING' | 'REPLAYED' | 'CONFLICT',
  error: string | null,
) {
  if (!entries.length) return;
  const sql = continuityDatabase();
  const ids = entries.map((entry) => entry.operation_id);
  await sql`
    update sfi_data_plane_write_journal
    set status = ${status},
        replayed_at = case when ${status} = 'REPLAYED' then now() else replayed_at end,
        last_error = ${error ? error.slice(0, 4000) : null},
        updated_at = now()
    where operation_id = any(${ids}::uuid[])
  `;
}

export function markJournalBatchReplayed(entries: SfiDataPlaneJournalEntry[]) {
  return updateBatchStatus(entries, 'REPLAYED', null);
}

export function markJournalBatchConflict(entries: SfiDataPlaneJournalEntry[], message: string) {
  return updateBatchStatus(entries, 'CONFLICT', message);
}

export function releaseJournalBatchForRetry(entries: SfiDataPlaneJournalEntry[], message: string) {
  return updateBatchStatus(entries, 'PENDING', message);
}

export async function journalBacklog() {
  const sql = continuityDatabase();
  const rows = await sql`
    select count(*) filter (where status in ('PENDING','REPLAYING'))::int as pending,
           count(*) filter (where status = 'CONFLICT')::int as conflicts
    from sfi_data_plane_write_journal
  `;
  const value = rows[0] as { pending?: number; conflicts?: number } | undefined;
  return { pending: Number(value?.pending ?? 0), conflicts: Number(value?.conflicts ?? 0) };
}
