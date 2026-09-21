import type { SfiDataPlaneState } from '@/lib/persistence/dataPlaneContinuityStore';

const FAILOVER_STATUSES = new Set([502, 503, 504, 521, 522, 523, 524]);
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
let cachedState: { value: SfiDataPlaneState; expiresAt: number } | null = null;

function continuityDataApiUrl() {
  const value = (process.env.SFI_NEON_DATA_API_URL || '').trim().replace(/\/$/, '');
  return value || null;
}

function normalizedOrigin(value: string) {
  return new URL(value).origin;
}

async function stateSnapshot() {
  if (cachedState && cachedState.expiresAt > Date.now()) return cachedState.value;
  try {
    const { readDataPlaneState } = await import('@/lib/persistence/dataPlaneContinuityStore');
    const value = await readDataPlaneState();
    cachedState = { value, expiresAt: Date.now() + 1500 };
    return value;
  } catch {
    return null;
  }
}

function cacheState(value: SfiDataPlaneState) {
  cachedState = { value, expiresAt: Date.now() + 1500 };
}

async function restrictedPrimary(response: Response) {
  if (FAILOVER_STATUSES.has(response.status)) return { unavailable: true, deterministic: false, code: `HTTP_${response.status}` };
  if (response.status < 400) return { unavailable: false, deterministic: false, code: null };

  const body = await response.clone().text().catch(() => '');
  const text = body.toLowerCase();
  const deterministic =
    text.includes('exceed_egress_quota')
    || text.includes('service for this project is restricted')
    || text.includes('project is paused')
    || text.includes('project has been paused');

  return {
    unavailable: deterministic,
    deterministic,
    code: deterministic ? 'SUPABASE_SERVICE_RESTRICTED' : null,
  };
}

async function continuityFetch(request: Request, state: SfiDataPlaneState) {
  const base = continuityDataApiUrl();
  if (!base) throw new Error('SFI_NEON_DATA_API_URL_NOT_CONFIGURED');

  const source = new URL(request.url);
  const targetBase = new URL(base);
  const suffix = source.pathname.replace(/^\/rest\/v1/, '');
  const target = new URL(`${targetBase.pathname.replace(/\/$/, '')}${suffix}${source.search}`, targetBase.origin);

  const headers = new Headers(request.headers);
  headers.delete('apikey');
  headers.delete('authorization');
  const { mintSfiDataPlaneServiceJwt } = await import('@/lib/persistence/dataPlaneIdentity');
  headers.set('Authorization', `Bearer ${mintSfiDataPlaneServiceJwt()}`);
  headers.set('X-SFI-Data-Plane', state.mode);
  headers.set('X-SFI-Data-Plane-Epoch', state.epoch);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
    redirect: request.redirect,
  };
  if (!READ_METHODS.has(request.method.toUpperCase())) {
    init.body = await request.clone().arrayBuffer();
  }

  const response = await fetch(target, init);
  if (!response.ok && response.status >= 500) {
    console.error('SFI_CONTINUITY_DATA_API_ERROR', {
      status: response.status,
      method: request.method,
      path: source.pathname,
    });
  }
  return response;
}

export function createSfiDataPlaneFetch(primarySupabaseUrl: string): typeof fetch {
  const primaryOrigin = normalizedOrigin(primarySupabaseUrl);

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);

    if (url.origin !== primaryOrigin || !url.pathname.startsWith('/rest/v1/')) {
      return fetch(request);
    }

    const continuityUrl = continuityDataApiUrl();
    const snapshot = continuityUrl ? await stateSnapshot() : null;
    if (snapshot && snapshot.mode !== 'PRIMARY') {
      return continuityFetch(request, snapshot);
    }

    let primaryResponse: Response;
    try {
      primaryResponse = await fetch(request.clone());
    } catch (error) {
      if (!continuityUrl) throw error;
      const { enterContinuityMode } = await import('@/lib/persistence/dataPlaneContinuityStore');
      const transition = await enterContinuityMode('SUPABASE_TRANSPORT_UNAVAILABLE');
      cacheState(transition);

      // A lost response to a mutation is ambiguous: the primary may have committed.
      // Never replay the same mutation on the continuity plane automatically.
      if (!READ_METHODS.has(request.method.toUpperCase())) throw error;
      return continuityFetch(request, transition);
    }

    const failure = await restrictedPrimary(primaryResponse);
    if (!failure.unavailable || !continuityUrl) return primaryResponse;

    const { enterContinuityMode } = await import('@/lib/persistence/dataPlaneContinuityStore');
    const transition = await enterContinuityMode(failure.code || 'SUPABASE_PRIMARY_UNAVAILABLE');
    cacheState(transition);

    // Provider-level deterministic rejection is safe to retry because the
    // primary explicitly refused the operation before SFI accepted it.
    if (failure.deterministic || READ_METHODS.has(request.method.toUpperCase())) {
      return continuityFetch(request, transition);
    }

    // Transient 5xx on a mutation is ambiguous. Switch subsequent traffic to
    // continuity but return the original response for this one operation.
    return primaryResponse;
  };
}
