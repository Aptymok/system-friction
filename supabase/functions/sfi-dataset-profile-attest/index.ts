import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.105.4';

const BUCKET = 'field-evidence';
const ATTESTATION_VERSION = 'SFI-INGESTION-ATTESTATION-2.0';
const PROFILE_CONTRACT = 'SFI-DATASET-PROFILE-1.0';
const WRITE_ROLES = new Set(['OWNER', 'ADMIN', 'OPERATOR']);
const MAX_PROFILE_JSON_BYTES = 200_000;

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

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeHash(value: unknown) {
  const hash = text(value).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('SFI_DATASET_DECLARED_HASH_INVALID');
  return hash;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Row)
        .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

function canonicalPayload(value: unknown) {
  return JSON.stringify(stableValue(value));
}

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function sha256Text(value: string) {
  return sha256Hex(new TextEncoder().encode(value));
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ ok: false, error: 'SFI_DATASET_ATTEST_ENV_MISSING' }, 503);

    const authorization = request.headers.get('Authorization') ?? '';
    if (!authorization.startsWith('Bearer ')) return json({ ok: false, error: 'AUTHORIZATION_REQUIRED' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const userResult = await userClient.auth.getUser();
    const user = userResult.data.user;
    if (userResult.error || !user) return json({ ok: false, error: 'AUTHENTICATED_USER_REQUIRED' }, 401);

    const body = await request.json().catch(() => ({})) as Row;
    const caseId = text(body.caseId);
    const storagePath = text(body.storagePath);
    const declaredHash = normalizeHash(body.contentHash);
    const suppliedProfile = row(body.profile);

    if (!caseId || !storagePath || !Object.keys(suppliedProfile).length) {
      return json({ ok: false, error: 'CASE_STORAGE_PROFILE_REQUIRED' }, 400);
    }

    if (JSON.stringify(suppliedProfile).length > MAX_PROFILE_JSON_BYTES) {
      return json({ ok: false, error: 'SFI_DATASET_PROFILE_TOO_LARGE', maxBytes: MAX_PROFILE_JSON_BYTES }, 413);
    }

    if (text(suppliedProfile.contract) !== PROFILE_CONTRACT) {
      return json({ ok: false, error: 'SFI_DATASET_PROFILE_CONTRACT_INVALID' }, 400);
    }

    const security = row(suppliedProfile.security);
    if (
      security.formulasEvaluated !== false ||
      security.macrosExecuted !== false ||
      security.externalLinksFollowed !== false ||
      security.rawRowsReturned !== false
    ) {
      return json({ ok: false, error: 'SFI_DATASET_PROFILE_SECURITY_BOUNDARY_INVALID' }, 400);
    }

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

    const signed = await admin.storage.from(BUCKET).createSignedUrl(storagePath, 120);
    if (signed.error || !signed.data?.signedUrl) throw new Error(`SFI_DATASET_SIGNED_READ_FAILED:${signed.error?.message ?? 'unknown'}`);

    const storageResponse = await fetch(signed.data.signedUrl, { method: 'GET' });
    if (!storageResponse.ok) return json({ ok: false, error: 'SFI_DATASET_STORAGE_DOWNLOAD_FAILED', status: storageResponse.status }, 404);

    const bytes = new Uint8Array(await storageResponse.arrayBuffer());
    const observedHash = await sha256Hex(bytes);
    if (observedHash !== declaredHash) {
      return json({ ok: false, error: 'SFI_DATASET_CONTENT_HASH_MISMATCH', declaredContentHash: declaredHash, observedContentHash: observedHash }, 409);
    }

    const suppliedSource = row(suppliedProfile.source);
    const suppliedSize = Number(suppliedSource.size ?? 0);
    if (suppliedSize && suppliedSize !== bytes.byteLength) {
      return json({ ok: false, error: 'SFI_DATASET_PROFILE_SOURCE_SIZE_MISMATCH', profileSize: suppliedSize, observedSize: bytes.byteLength }, 409);
    }

    const profile: Row = {
      ...suppliedProfile,
      source: {
        ...suppliedSource,
        size: bytes.byteLength,
        contentHash: observedHash,
        contentHashBasis: 'SERVER_VERIFIED_SHA256',
      },
      materialVerification: {
        provider: 'SUPABASE_EDGE_FUNCTION',
        worker: 'sfi-dataset-profile-attest',
        serverVerifiedSha256: observedHash,
        rawObjectBytesObserved: bytes.byteLength,
        profileComputationBoundary: 'PROFILE_SUPPLIED_BY_AUTHORIZED_OPERATOR_AND_BOUND_TO_SERVER_VERIFIED_MATERIAL_IDENTITY',
      },
    };

    const observations = row(profile.observations);
    if (Number(observations.totalRows ?? 0) <= 0 || Number(observations.totalAnalyzableRows ?? 0) <= 0) {
      return json({ ok: false, error: 'SFI_DATASET_PROFILE_OBSERVATIONS_INVALID' }, 400);
    }

    const result = {
      caseId,
      tenantId,
      storagePath,
      profiledByUserId: user.id,
      profiledByRole: role,
      profile,
    };

    const resultHash = await sha256Text(canonicalPayload(result));
    const receipt = await admin.from('sfi_ingestion_attestation_receipts').insert({
      case_id: caseId,
      tenant_id: tenantId,
      user_id: user.id,
      storage_path: storagePath,
      content_hash: observedHash,
      result_hash: resultHash,
      attestation_version: ATTESTATION_VERSION,
      metadata: {
        worker: 'sfi-dataset-profile-attest',
        profileContract: PROFILE_CONTRACT,
        materialIdentity: 'SERVER_VERIFIED_SHA256',
      },
    }).select('id,expires_at').single();
    if (receipt.error || !receipt.data) throw new Error(`SFI_DATASET_ATTESTATION_RECEIPT_CREATE_FAILED:${receipt.error?.message ?? 'unknown'}`);

    return json({
      ok: true,
      result,
      attestation: {
        version: ATTESTATION_VERSION,
        algorithm: 'SUPABASE_DB_RECEIPT_SHA256',
        digest: resultHash,
        receiptId: String(receipt.data.id),
        expiresAt: String(receipt.data.expires_at),
      },
      verification: {
        materialIdentity: 'SERVER_VERIFIED_SHA256',
        contentHash: observedHash,
        size: bytes.byteLength,
        profileComputation: 'EXTERNAL_DETERMINISTIC_PROFILE_BOUND_TO_VERIFIED_OBJECT_HASH',
      },
      admission: {
        state: 'STRUCTURED_RESULT_PENDING_SFI_ADMISSION',
        instruction: 'Return result + single-use receipt attestation to SFI Case Platform profile-result. Receipt does not mint evidence or canonical truth.',
      },
    });
  } catch (error) {
    return json({ ok: false, error: 'SFI_DATASET_PROFILE_ATTEST_FAILED', details: error instanceof Error ? error.message : String(error) }, 500);
  }
});
