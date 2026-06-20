import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

export const INSECURE_LOCAL_TLS_ALLOWED = process.env.SFI_ALLOW_INSECURE_LOCAL_TLS === 'true';

function loadLocalEnv() {
  for (const file of ['.env.local', '.env']) {
    const envPath = path.join(process.cwd(), file);
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  }
}

loadLocalEnv();

if (INSECURE_LOCAL_TLS_ALLOWED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export function normalizeSupabaseUrl(value) {
  return new URL(value).origin;
}

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
  return createClient(normalizeSupabaseUrl(url), key, { auth: { persistSession: false } });
}

export function classifyDbError(error) {
  const message = String(error?.message ?? error ?? '').trim();
  const lower = message.toLowerCase();
  const code = String(error?.code ?? '').trim();
  const status = Number(error?.status ?? 0);

  if (!message) return { category: 'unknown', detail: 'unknown_error' };
  if (
    lower.includes('self-signed certificate') ||
    lower.includes('unable to verify the first certificate') ||
    lower.includes('certificate') ||
    lower.includes('tls')
  ) {
    return {
      category: 'TLS',
      detail: message,
      local_insecure_tls_allowed: INSECURE_LOCAL_TLS_ALLOWED,
    };
  }
  if (status === 401 || status === 403 || lower.includes('jwt') || lower.includes('api key') || lower.includes('invalid key')) {
    return { category: 'credentials', detail: message, code: code || null, status: status || null };
  }
  if (code === '42P01' || lower.includes('does not exist') || lower.includes('schema cache') || lower.includes('not found')) {
    return { category: 'schema_missing', detail: message, code: code || null, status: status || null };
  }
  if (code === '42501' || lower.includes('permission denied') || lower.includes('row-level security')) {
    return { category: 'permissions', detail: message, code: code || null, status: status || null };
  }
  if (
    lower.includes('fetch failed') ||
    lower.includes('timeout') ||
    lower.includes('aborted') ||
    lower.includes('aborterror') ||
    lower.includes('econnreset') ||
    lower.includes('enotfound') ||
    lower.includes('etimedout') ||
    lower.includes('network')
  ) {
    return { category: 'network', detail: message, code: code || null, status: status || null };
  }
  return { category: 'unknown', detail: message, code: code || null, status: status || null };
}

export function objectStatusFromError(error) {
  const classified = classifyDbError(error);
  if (classified.category === 'schema_missing') return 'MISSING_IN_DB';
  if (classified.category === 'permissions') return 'PERMISSION_BLOCKED';
  if (classified.category === 'TLS' || classified.category === 'network' || classified.category === 'credentials') return 'FETCH_BLOCKED';
  return 'FETCH_BLOCKED';
}

export function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export async function countTable(supabase, table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) return { table, exists: false, count: null, error: error.message, error_classification: classifyDbError(error) };
  return { table, exists: true, count: count ?? 0, error: null, error_classification: null };
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
