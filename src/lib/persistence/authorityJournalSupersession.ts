import 'server-only';

import { continuityDatabase } from '@/lib/sfi/continuityPostgres';
import { readPrimaryAuthorityRow } from '@/lib/persistence/dataPlaneRpc';

type AuthorityTable = 'profiles' | 'sfi_account_access_grants';
type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as RecordValue : {};
}

function normalize(value: unknown, field?: string): unknown {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'string' && field?.endsWith('_at')) {
      const timestamp = Date.parse(value);
      if (Number.isFinite(timestamp)) return new Date(timestamp).toISOString();
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => normalize(item));
  const result: RecordValue = {};
  for (const key of Object.keys(value as RecordValue).sort()) {
    result[key] = normalize((value as RecordValue)[key], key);
  }
  return result;
}

function semanticProjection(table: AuthorityTable, row: RecordValue) {
  const projected = { ...row };
  delete projected.created_at;
  delete projected.updated_at;
  if (table === 'profiles') delete projected.last_seen_at;
  if (table === 'sfi_account_access_grants') delete projected.last_invite_error;
  return JSON.stringify(normalize(projected));
}

function historicalAuthoritySafe(
  table: AuthorityTable,
  current: RecordValue,
  historical: RecordValue,
  rowId: string,
) {
  if (String(current.email ?? '').toLowerCase() !== String(historical.email ?? '').toLowerCase()) return false;
  if (String(current.email ?? '').trim().length < 5) return false;
  if (table === 'profiles') {
    return String(current.user_id ?? '') === rowId
      && String(historical.user_id ?? '') === rowId
      && current.role === historical.role
      && JSON.stringify(normalize(current.module_access)) === JSON.stringify(normalize(historical.module_access));
  }
  const rank: Record<string, number> = { PENDING: 1, INVITED: 2, ACTIVE: 3 };
  const former = String(historical.status ?? '');
  const now = String(current.status ?? '');
  return String(current.id ?? '') === rowId
    && String(historical.id ?? '') === rowId
    && (!historical.user_id || historical.user_id === current.user_id)
    && historical.access_class === current.access_class
    && Boolean(rank[former] && rank[now] && rank[former] <= rank[now]);
}

/**
 * Reconcile obsolete, identity-bound journal images ONLY after independently
 * reading Supabase PRIMARY and Neon continuity and comparing every current
 * authority-bearing field. Timestamp-only and last-invite-error drift can be
 * superseded, not marked REPLAYED. Original journal payload and before image
 * are retained. Mismatched identity, role, scope or live grant state stays gated.
 */
export async function reconcileSupersededAuthorityJournal(input: { maxEntries?: number } = {}) {
  const limit = Math.max(1, Math.min(12, Math.floor(input.maxEntries ?? 8)));
  const sql = continuityDatabase();
  const journal = await sql`
    select operation_id::text, table_name, operation, row_data, status
    from public.sfi_data_plane_write_journal
    where status in ('PENDING','CONFLICT')
      and operation='UPSERT'
      and table_name in ('profiles','sfi_account_access_grants')
    order by sequence asc
    limit ${limit}
  `;
  let superseded = 0, protectedMismatches = 0;
  let primaryUnavailable = false;
  for (const entry of journal) {
    const table = String(entry.table_name) as AuthorityTable;
    const historical = record(entry.row_data);
    const rowId = table === 'profiles' ? historical.user_id : historical.id;
    if (typeof rowId !== 'string') { protectedMismatches++; continue; }

    let primary: RecordValue | null;
    try {
      primary = await readPrimaryAuthorityRow(table, rowId);
    } catch {
      // Do not compare continuity with itself while Supabase is unavailable.
      primaryUnavailable = true;
      break;
    }
    const present = table === 'profiles'
      ? await sql`select to_jsonb(p) as row,
          md5((to_jsonb(p)-'created_at'-'updated_at'-'last_seen_at')::text) as stable_hash
          from public.profiles p where p.user_id = ${rowId}::uuid limit 1`
      : await sql`select to_jsonb(g) as row,
          md5((to_jsonb(g)-'created_at'-'updated_at'-'last_invite_error')::text) as stable_hash
          from public.sfi_account_access_grants g where g.id = ${rowId}::uuid limit 1`;
    const neon = record(present[0]?.row);
    if (!primary || !present.length ||
        semanticProjection(table, primary) !== semanticProjection(table, neon) ||
        !historicalAuthoritySafe(table, neon, historical, rowId)) {
      protectedMismatches++;
      continue;
    }

    const operationId = String(entry.operation_id);
    const stableHash = String(present[0]?.stable_hash || '');
    const archived = table === 'profiles'
      ? await sql`
          update public.sfi_data_plane_write_journal j
          set status='SUPERSEDED_BY_PRIMARY',
              last_error=left(coalesce(nullif(j.last_error,'') || ' | ', '') ||
                'MEM003_SEMANTIC_AUTHORITY_PARITY_VERIFIED:historical_image_preserved;never_replayed',4000),
              updated_at=now()
          where j.operation_id=${operationId}::uuid
            and j.status in ('PENDING','CONFLICT')
            and j.operation='UPSERT' and j.table_name='profiles'
            and j.row_data->>'user_id'=${rowId}
            and exists (select 1 from public.profiles p where p.user_id=${rowId}::uuid
              and md5((to_jsonb(p)-'created_at'-'updated_at'-'last_seen_at')::text)=${stableHash})
          returning j.operation_id
        `
      : await sql`
          update public.sfi_data_plane_write_journal j
          set status='SUPERSEDED_BY_PRIMARY',
              last_error=left(coalesce(nullif(j.last_error,'') || ' | ', '') ||
                'MEM003_SEMANTIC_AUTHORITY_PARITY_VERIFIED:historical_image_preserved;never_replayed',4000),
              updated_at=now()
          where j.operation_id=${operationId}::uuid
            and j.status in ('PENDING','CONFLICT')
            and j.operation='UPSERT' and j.table_name='sfi_account_access_grants'
            and j.row_data->>'id'=${rowId}
            and exists (select 1 from public.sfi_account_access_grants g where g.id=${rowId}::uuid
              and md5((to_jsonb(g)-'created_at'-'updated_at'-'last_invite_error')::text)=${stableHash})
          returning j.operation_id
        `;
    if (archived.length === 1) superseded++;
  }

  return { checked: journal.length, superseded, protectedMismatches, primaryUnavailable,
    primaryPromoted: false, credentialsModified: false, authorityModified: false,
    policy: 'Current authority must match directly across both planes; original history retained' };
}

/**
 * Final certification lane for the two protected tables: tolerate only known
 * administrative metadata drift, NEVER role/grant/identity/scope drift.
 * Every Neon record is checked against the independent Supabase primary
 * before a fingerprint mismatch can be considered semantically equivalent.
 * Count parity is separately required by the global fingerprint gate.
 */
export async function currentAuthorityParityVerified(table: AuthorityTable): Promise<boolean> {
  const sql = continuityDatabase();
  const neonRows = table === 'profiles'
    ? await sql`select to_jsonb(p) as row from public.profiles p order by p.user_id limit 501`
    : await sql`select to_jsonb(g) as row from public.sfi_account_access_grants g order by g.id limit 501`;
  if (neonRows.length > 500) return false; // bounded safety gate, not silent certification

  for (const entry of neonRows) {
    const neon = record(entry.row);
    const rowId = table === 'profiles' ? neon.user_id : neon.id;
    if (typeof rowId !== 'string') return false;
    let primary: RecordValue | null = null;
    try { primary = await readPrimaryAuthorityRow(table, rowId); } catch { return false; }
    if (!primary || semanticProjection(table, primary) !== semanticProjection(table, neon)) return false;
  }
  return true;
}
