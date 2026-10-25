import 'server-only';
import { assertCrossProviderReplicationRetired } from '@/lib/persistence/replicationRetirementPolicy';

import { mintSfiDataPlaneServiceJwt } from '@/lib/persistence/dataPlaneIdentity';
import { sfiNeonDataApiUrl } from '@/lib/persistence/dataPlaneConfig';
import { normalizeSupabaseUrl } from '@/runtime/supabase/url';

type JsonRecord = Record<string, unknown>;

async function jsonResponse(response: Response, label: string) {
  const text = await response.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const error = new Error(`${label}:${response.status}:${typeof body === 'string' ? body.slice(0, 1200) : JSON.stringify(body).slice(0, 1200)}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return body;
}

function primaryCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SFI_PRIMARY_RPC_NOT_CONFIGURED');
  return { url: normalizeSupabaseUrl(url).replace(/\/$/, ''), key };
}

export async function postPrimaryDataPlaneRpc<T = unknown>(name: string, body: JsonRecord = {}): Promise<T> {
  assertCrossProviderReplicationRetired(name);
  const { url, key } = primaryCredentials();
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'X-Client-Info': 'sfi-data-plane-primary-rpc',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  return await jsonResponse(response, `SFI_PRIMARY_RPC_${name}`) as T;
}

export async function postNeonDataPlaneRpc<T = unknown>(name: string, body: JsonRecord = {}): Promise<T> {
  assertCrossProviderReplicationRetired(name);
  const response = await fetch(`${sfiNeonDataApiUrl()}/rpc/${name}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mintSfiDataPlaneServiceJwt()}`,
      'Content-Type': 'application/json',
      'X-Client-Info': 'sfi-data-plane-neon-rpc',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  return await jsonResponse(response, `SFI_NEON_RPC_${name}`) as T;
}


/**
 * Read ONLY bounded cognitive execution receipts from the authoritative primary
 * ledger. The global continuity fetch can redirect ordinary reads to an older
 * Neon snapshot; that is not evidence that a recent PRIMARY C07 job did not run.
 *
 * This read cannot mutate, replicate, approve, or trigger execution. Failure
 * is explicit: callers must not silently report zero observed executions.
 */
export async function readPrimaryCognitiveExecutionEvents(): Promise<Array<Record<string, unknown>>> {
  const { url, key } = primaryCredentials();
  const query = new URLSearchParams({
    select: 'event_id,event_name,epistemic_class,confidence,occurred_at,created_at,source',
    event_name: 'eq.SFI_AGENT_EXECUTED',
    order: 'occurred_at.desc',
    limit: '168',
  });
  const response = await fetch(`${url}/rest/v1/epistemic_events?${query.toString()}`, {
    method: 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'X-Client-Info': 'sfi-primary-cognitive-execution-read',
    },
    cache: 'no-store',
  });
  const body = await jsonResponse(response, 'SFI_PRIMARY_COGNITIVE_EXECUTION_READ');
  if (!Array.isArray(body)) throw new Error('SFI_PRIMARY_COGNITIVE_EXECUTIONS_INVALID_RESPONSE');
  return body.filter((value): value is Record<string, unknown> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && value.event_name === 'SFI_AGENT_EXECUTED');
}

/**
 * Owner-scoped C07 UI callers can independently verify one exact execution
 * event against the primary receipt. This function does not establish owner
 * access by itself: it MUST be called only after the owner-job predicate.
 * Never fall back to a stale Neon continuity record to certify completion.
 */
export async function readPrimaryCognitiveExecutionReceipt(eventId: string): Promise<Record<string, unknown> | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId))
    throw new Error('SFI_C07_RECEIPT_INVALID_EVENT_ID');
  const { url, key } = primaryCredentials();
  const query = new URLSearchParams({
    select: 'event_id,event_name,hash_self,source,payload',
    event_id: `eq.${eventId}`,
    limit: '1',
  });
  const response = await fetch(`${url}/rest/v1/epistemic_events?${query.toString()}`, {
    method: 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'X-Client-Info': 'sfi-c07-owner-receipt-primary-read',
    },
    cache: 'no-store',
  });
  const body = await jsonResponse(response, 'SFI_PRIMARY_C07_RECEIPT_READ');
  if (!Array.isArray(body) || body.length > 1) throw new Error('SFI_PRIMARY_C07_RECEIPT_RESPONSE_INVALID');
  const item = body[0];
  return item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : null;
}

/**
 * Direct, credentialed primary read for governed recovery of ONLY existing
 * institutional grants and profiles. Never falls back to Neon: a fallback
 * would compare Neon against itself and falsely certify convergence.
 */
export async function readPrimaryAuthorityRow(
  table: 'profiles' | 'sfi_account_access_grants',
  rowId: string,
): Promise<Record<string, unknown> | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rowId))
    throw new Error('SFI_AUTHORITY_RECONCILIATION_INVALID_ROW_ID');
  const { url, key } = primaryCredentials();
  const selector = table === 'profiles' ? 'user_id' : 'id';
  const query = new URLSearchParams({ select: '*', [selector]: `eq.${rowId}`, limit: '1' });
  const response = await fetch(`${url}/rest/v1/${table}?${query.toString()}`, {
    method: 'GET',
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      'X-Client-Info': 'sfi-governed-authority-reconciliation-primary-direct',
    },
    cache: 'no-store',
  });
  const rows = await jsonResponse(response, 'SFI_PRIMARY_AUTHORITY_DIRECT_READ');
  if (!Array.isArray(rows)) throw new Error('SFI_PRIMARY_AUTHORITY_INVALID_RESPONSE');
  return rows.length === 1 && rows[0] && typeof rows[0] === 'object' ? rows[0] : null;
}

/**
 * Exact scoped primary read for a single tenant membership. No fallback.
 * Never query by email, role alone, or an unchecked user-supplied URL.
 */
export async function readPrimaryTenantMembershipRow(
  tenantId: string,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(tenantId) || !uuid.test(userId))
    throw new Error('SFI_TENANT_MEMBERSHIP_RECONCILIATION_INVALID_ID');
  const { url, key } = primaryCredentials();
  const query = new URLSearchParams({
    select: '*', tenant_id: `eq.${tenantId}`, user_id: `eq.${userId}`, limit: '2',
  });
  const response = await fetch(`${url}/rest/v1/sfi_tenant_members?${query.toString()}`, {
    method: 'GET',
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      'X-Client-Info': 'sfi-protected-tenant-membership-primary-direct',
    },
    cache: 'no-store',
  });
  const rows = await jsonResponse(response, 'SFI_PRIMARY_TENANT_MEMBER_DIRECT_READ');
  if (!Array.isArray(rows) || rows.length > 1) throw new Error('SFI_TENANT_MEMBER_PRIMARY_AMBIGUOUS');
  return rows.length === 1 && rows[0] && typeof rows[0] === 'object' ? rows[0] : null;
}

export async function probePrimaryDataPlane() {
  const { url, key } = primaryCredentials();
  const response = await fetch(`${url}/rest/v1/profiles?select=user_id&limit=1`, {
    method: 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'X-Client-Info': 'sfi-data-plane-primary-probe',
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return { ok: false as const, status: response.status, error: text.slice(0, 1200) };
  }
  return { ok: true as const, status: response.status };
}

export async function probeNeonDataPlane() {
  const response = await fetch(`${sfiNeonDataApiUrl()}/profiles?select=user_id&limit=1`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${mintSfiDataPlaneServiceJwt()}`,
      'X-Client-Info': 'sfi-data-plane-neon-probe',
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const error = (await response.text().catch(() => '')).slice(0, 1200);
    const normalized = error.toLowerCase();
    return {
      ok: false as const,
      status: response.status,
      error,
      errorCode: (response.status === 401 || response.status === 403) && normalized.includes('jwk not found')
        ? 'SFI_NEON_DATA_API_JWKS_MISMATCH'
        : `HTTP_${response.status}`,
    };
  }
  return { ok: true as const, status: response.status, errorCode: null };
}

export async function probePrimaryStoragePlane() {
  const { url, key } = primaryCredentials();
  const response = await fetch(`${url}/storage/v1/bucket/field-evidence`, {
    method: 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'X-Client-Info': 'sfi-storage-primary-probe',
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const error = (await response.text().catch(() => '')).slice(0, 1200);
    const normalized = error.toLowerCase();
    return {
      ok: false as const,
      status: response.status,
      error,
      errorCode: normalized.includes('exceed_egress_quota') || normalized.includes('service for this project is restricted')
        ? 'SUPABASE_STORAGE_SERVICE_RESTRICTED'
        : `HTTP_${response.status}`,
    };
  }
  return { ok: true as const, status: response.status, errorCode: null };
}
