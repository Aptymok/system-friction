import 'server-only';

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
