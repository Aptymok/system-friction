import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.105.4';
import { profileDataset } from './datasetProfile.ts';

const BUCKET = 'field-evidence';
const ATTESTATION_VERSION = 'SFI-INGESTION-ATTESTATION-1.0';
const WRITE_ROLES = new Set(['OWNER', 'ADMIN', 'OPERATOR']);
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Row = Record<string, unknown>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeHash(value: unknown) {
  const hash = text(value).toLowerCase();
  if (!hash) return null;
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('SFI_DATASET_DECLARED_HASH_INVALID');
  return hash;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Row).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stableValue(item)]));
  }
  return value;
}

function canonicalPayload(value: unknown) {
  return JSON.stringify(stableValue(value));
}

async function attest(secret: string, value: unknown) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const message = new TextEncoder().encode(`${ATTESTATION_VERSION}|${canonicalPayload(value)}`);
  const digest = await crypto.subtle.sign('HMAC', key, message);
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ ok: false, error: 'SFI_DATASET_PROFILE_ENV_MISSING' }, 503);

    const authorization = request.headers.get('Authorization') ?? '';
    if (!authorization.startsWith('Bearer ')) return json({ ok: false, error: 'AUTHORIZATION_REQUIRED' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const userResult = await userClient.auth.getUser();
    const user = userResult.data.user;
    if (userResult.error || !user) return json({ ok: false, error: 'AUTHENTICATED_USER_REQUIRED' }, 401);

    const body = await request.json().catch(() => ({})) as Row;
    const caseId = text(body.caseId);
    const storagePath = text(body.storagePath);
    if (!caseId || !storagePath) return json({ ok: false, error: 'CASE_ID_AND_STORAGE_PATH_REQUIRED' }, 400);
    const declaredHash = normalizeHash(body.contentHash);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const caseResult = await admin.from('sfi_cases').select('id,tenant_id').eq('id', caseId).is('deleted_at', null).maybeSingle();
    if (caseResult.error) throw new Error(`SFI_DATASET_CASE_READ_FAILED:${caseResult.error.message}`);
    if (!caseResult.data) return json({ ok: false, error: 'SFI_CASE_NOT_FOUND' }, 404);

    const tenantId = String(caseResult.data.tenant_id ?? '');
    const membership = await admin.from('sfi_tenant_members').select('role,status').eq('tenant_id', tenantId).eq('user_id', user.id).maybeSingle();
    if (membership.error) throw new Error(`SFI_DATASET_MEMBERSHIP_READ_FAILED:${membership.error.message}`);
    if (!membership.data || membership.data.status !== 'ACTIVE') return json({ ok: false, error: 'SFI_TENANT_FORBIDDEN' }, 403);
    const role = String(membership.data.role ?? '');
    if (!WRITE_ROLES.has(role)) return json({ ok: false, error: 'SFI_TENANT_WRITE_FORBIDDEN' }, 403);

    const prefix = `${tenantId}/${caseId}/source/`;
    if (!storagePath.startsWith(prefix) || storagePath.includes('..')) return json({ ok: false, error: 'SFI_SOURCE_STORAGE_PATH_FORBIDDEN' }, 403);

    const download = await admin.storage.from(BUCKET).download(storagePath);
    if (download.error || !download.data) return json({ ok: false, error: 'SFI_DATASET_STORAGE_DOWNLOAD_FAILED', details: download.error?.message ?? 'unknown' }, 404);

    const bytes = new Uint8Array(await download.data.arrayBuffer());
    const filename = text(body.filename) || storagePath.split('/').at(-1) || 'dataset';
    const contentType = text(body.contentType) || download.data.type || 'application/octet-stream';
    const profile = await profileDataset({ filename, contentType, bytes });

    if (declaredHash && declaredHash !== profile.source.contentHash) {
      return json({
        ok: false,
        error: 'SFI_DATASET_CONTENT_HASH_MISMATCH',
        declaredContentHash: declaredHash,
        observedContentHash: profile.source.contentHash,
        epistemicBoundary: 'The material object differs from the client-declared fingerprint. Do not admit the profile to the case until identity is reconciled.',
      }, 409);
    }

    const result = {
      caseId,
      tenantId,
      storagePath,
      profiledByUserId: user.id,
      profiledByRole: role,
      profile,
    };
    const digest = await attest(serviceRoleKey, result);

    return json({
      ok: true,
      result,
      attestation: {
        version: ATTESTATION_VERSION,
        algorithm: 'HMAC-SHA256',
        digest,
      },
      admission: {
        state: 'STRUCTURED_RESULT_PENDING_SFI_ADMISSION',
        instruction: 'Return result + attestation to the SFI Case Platform profile-result endpoint. Profiling does not itself mint accepted evidence or canonical truth.',
      },
      executionBoundary: 'DATA_PLANE_SUPABASE: raw dataset bytes were processed in Supabase and did not traverse Vercel.',
    });
  } catch (error) {
    return json({ ok: false, error: 'SFI_DATASET_PROFILE_FAILED', details: error instanceof Error ? error.message : String(error) }, 500);
  }
});
