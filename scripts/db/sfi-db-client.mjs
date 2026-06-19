import { createClient } from '@supabase/supabase-js';

export function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

export function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export async function countTable(supabase, table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) return { table, exists: false, count: null, error: error.message };
  return { table, exists: true, count: count ?? 0, error: null };
}

export async function readAllRows(supabase, table, pageSize = 1000) {
  const rows = [];
  let from = 0;
  for (;;) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(table).select('*').range(from, to);
    if (error) return { ok: false, rows, error: error.message };
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return { ok: true, rows, error: null };
}

export async function deleteAllRowsByKnownColumns(supabase, table) {
  const attempts = [
    ['id', '___SFI_NEVER_MATCH___'],
    ['created_at', '0001-01-01T00:00:00.000Z'],
    ['observed_at', '0001-01-01T00:00:00.000Z'],
    ['event_type', '___SFI_NEVER_MATCH___'],
    ['scope', '___SFI_NEVER_MATCH___'],
  ];

  const errors = [];
  for (const [column, sentinel] of attempts) {
    const { error } = await supabase.from(table).delete().neq(column, sentinel);
    if (!error) return { ok: true, method: `delete().neq(${column})`, errors };
    errors.push(`${column}: ${error.message}`);
  }
  return { ok: false, method: null, errors };
}

export function safeJsonParse(raw, fallback = null) {
  try { return JSON.parse(raw); } catch { return fallback; }
}