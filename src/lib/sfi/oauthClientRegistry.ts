import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readContinuityOAuthClient, touchContinuityOAuthClient } from '@/lib/sfi/continuityPostgres';
import {
  readSfiOAuthConfig,
  SFI_ROOT_SCOPES,
  SFI_SUPPORTED_SCOPES,
} from '@/lib/sfi/oauthConfig';

type Row = Record<string, unknown>;

const CHATGPT_CIMD_CLIENT_ID = 'https://chatgpt.com/oauth/client.json';
const CHATGPT_CIMD_REDIRECT_URI = 'https://chatgpt.com/connector_platform_oauth_redirect';

export type ResolvedSfiOAuthClient = {
  clientId: string;
  name: string;
  redirectUris: string[];
  allowedScopes: string[];
  audience: 'OWNER_ONLY' | 'TRUSTED_MULTI_USER';
  ownerId: string | null;
  source: 'registry' | 'continuity_registry' | 'legacy_env' | 'chatgpt_cimd' | 'dcr_stateless';
  secretHash?: string;
  legacySecret?: string;
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : [];
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function chatGptCimdClient(clientId: string): Promise<ResolvedSfiOAuthClient | null> {
  let redirectUris = [CHATGPT_CIMD_REDIRECT_URI];
  if (!safeEqual(clientId, CHATGPT_CIMD_CLIENT_ID)) {
    let parsed: URL;
    try { parsed = new URL(clientId); } catch { return null; }
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'chatgpt.com' || !/^\/oauth\/(?:[A-Za-z0-9_-]+\/)?client\.json$/.test(parsed.pathname)) return null;
    const response = await fetch(clientId, { headers: { Accept: 'application/json' }, cache: 'no-store', redirect: 'error' });
    if (!response.ok) return null;
    const metadata = await response.json() as Record<string, unknown>;
    if (metadata.client_id !== clientId || !Array.isArray(metadata.redirect_uris)) return null;
    redirectUris = normalizeSfiOAuthRedirectUris(metadata.redirect_uris);
    if (!redirectUris.every((uri) => { try { return new URL(uri).hostname === 'chatgpt.com'; } catch { return false; } })) return null;
  }
  return {
    clientId,
    name: 'ChatGPT MCP client (CIMD)',
    redirectUris,
    allowedScopes: [...SFI_ROOT_SCOPES],
    audience: 'TRUSTED_MULTI_USER',
    ownerId: null,
    source: 'chatgpt_cimd',
  };
}

function legacyClient() {
  const legacy = readSfiOAuthConfig();
  if (!legacy) return null;
  return {
    clientId: legacy.clientId,
    name: 'SFI legacy/bootstrap OAuth client',
    redirectUris: legacy.redirectUris,
    allowedScopes: [...SFI_ROOT_SCOPES],
    audience: 'TRUSTED_MULTI_USER' as const,
    ownerId: null,
    source: 'legacy_env' as const,
    legacySecret: legacy.clientSecret,
  } satisfies ResolvedSfiOAuthClient;
}

export function hashSfiOAuthClientSecret(secret: string) {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

export function normalizeSfiOAuthRedirectUri(value: string) {
  const raw = value.trim();
  if (!raw) throw new Error('SFI_OAUTH_REDIRECT_URI_REQUIRED');
  const parsed = new URL(raw);
  const localhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1';
  if (parsed.protocol !== 'https:' && !(localhost && parsed.protocol === 'http:')) {
    throw new Error('SFI_OAUTH_REDIRECT_URI_HTTPS_REQUIRED');
  }
  if (parsed.hash) throw new Error('SFI_OAUTH_REDIRECT_URI_FRAGMENT_FORBIDDEN');
  return raw;
}

export function normalizeSfiOAuthRedirectUris(values: unknown, options: { allowEmpty?: boolean } = {}) {
  if (!Array.isArray(values)) throw new Error('SFI_OAUTH_REDIRECT_URIS_REQUIRED');
  const normalized = [...new Set(values.map((value) => normalizeSfiOAuthRedirectUri(String(value))))];
  if ((!options.allowEmpty && !normalized.length) || normalized.length > 10) {
    throw new Error('SFI_OAUTH_REDIRECT_URIS_COUNT_INVALID');
  }
  return normalized;
}

export function normalizeSfiOAuthScopes(values: unknown, ceiling: readonly string[]) {
  const ceilingSet = new Set<string>(ceiling);
  const requested = Array.isArray(values)
    ? [...new Set(values.map((value) => String(value).trim()).filter(Boolean))]
    : [...ceiling];
  if (!requested.length) throw new Error('SFI_OAUTH_SCOPES_REQUIRED');
  if (requested.some((scope) => !SFI_SUPPORTED_SCOPES.has(scope) || !ceilingSet.has(scope))) {
    throw new Error('SFI_OAUTH_SCOPE_NOT_ALLOWED');
  }
  return requested;
}

function resolvedRegisteredClient(
  row: Row,
  source: 'registry' | 'continuity_registry',
): ResolvedSfiOAuthClient {
  return {
    clientId: text(row.client_id),
    name: text(row.name) || text(row.client_id),
    redirectUris: stringArray(row.redirect_uris),
    allowedScopes: stringArray(row.allowed_scopes),
    audience: text(row.audience) === 'TRUSTED_MULTI_USER' ? 'TRUSTED_MULTI_USER' : 'OWNER_ONLY',
    ownerId: text(row.created_by) || null,
    source,
    secretHash: text(row.client_secret_hash),
  };
}

async function readRegisteredClient(clientId: string): Promise<ResolvedSfiOAuthClient | null> {
  const db = createServiceSupabaseClient();
  const result = await db
    .from('sfi_oauth_clients')
    .select('client_id,client_secret_hash,name,created_by,redirect_uris,allowed_scopes,audience,status')
    .eq('client_id', clientId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (result.error) throw new Error(`SFI_OAUTH_CLIENT_REGISTRY_READ_FAILED:${result.error.message}`);
  if (!result.data) return null;
  return resolvedRegisteredClient(result.data as Row, 'registry');
}

async function readContinuityRegisteredClient(clientId: string): Promise<ResolvedSfiOAuthClient | null> {
  const row = await readContinuityOAuthClient(clientId);
  return row ? resolvedRegisteredClient(row, 'continuity_registry') : null;
}

function dcrSigningSecret() {
  return (process.env.SFI_EXTERNAL_SESSION_SECRET || '').trim();
}

function dcrSignature(payload: string) {
  const secret = dcrSigningSecret();
  if (!secret) throw new Error('SFI_DCR_SIGNING_SECRET_UNAVAILABLE');
  return createHash('sha256').update(secret + ':' + payload).digest('base64url');
}

export function createStatelessSfiDcrClient(input: { name: string; redirectUris: unknown; scopes?: unknown }) {
  const redirectUris = normalizeSfiOAuthRedirectUris(input.redirectUris);
  const allowedScopes = normalizeSfiOAuthScopes(input.scopes, SFI_ROOT_SCOPES);
  const clientSecret = `sfi_dcr_sec_${randomBytes(32).toString('base64url')}`;
  const payload = Buffer.from(JSON.stringify({ n: input.name.slice(0, 120) || 'MCP client', r: redirectUris, s: allowedScopes, h: hashSfiOAuthClientSecret(clientSecret), iat: Date.now() }), 'utf8').toString('base64url');
  const clientId = `sfi_dcr_${payload}.${dcrSignature(payload)}`;
  return { clientId, clientSecret, redirectUris, allowedScopes };
}

function resolveStatelessSfiDcrClient(clientId: string): ResolvedSfiOAuthClient | null {
  if (!clientId.startsWith('sfi_dcr_')) return null;
  const encoded = clientId.slice('sfi_dcr_'.length);
  const dot = encoded.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = encoded.slice(0, dot);
  const sig = encoded.slice(dot + 1);
  if (!safeEqual(sig, dcrSignature(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { n?: string; r?: unknown; s?: unknown; h?: string; iat?: number };
    if (!data.iat || Date.now() - data.iat > 30 * 24 * 60 * 60 * 1000 || Date.now() + 60_000 < data.iat) return null;
    return { clientId, name: data.n || 'MCP client', redirectUris: normalizeSfiOAuthRedirectUris(data.r), allowedScopes: normalizeSfiOAuthScopes(data.s, SFI_ROOT_SCOPES), audience: 'TRUSTED_MULTI_USER', ownerId: null, source: 'dcr_stateless', secretHash: text(data.h) };
  } catch { return null; }
}

export async function resolveSfiOAuthClient(clientId: string): Promise<ResolvedSfiOAuthClient | null> {
  if (!clientId) return null;

  const cimd = await chatGptCimdClient(clientId);
  if (cimd) return cimd;
  const dcr = resolveStatelessSfiDcrClient(clientId);
  if (dcr) return dcr;

  const legacy = legacyClient();
  const legacyMatch = legacy && safeEqual(clientId, legacy.clientId) ? legacy : null;

  try {
    const registered = await readRegisteredClient(clientId);
    if (registered) return registered;
    return legacyMatch;
  } catch (error) {
    try {
      const continuity = await readContinuityRegisteredClient(clientId);
      if (continuity) return continuity;
    } catch (continuityError) {
      if (legacyMatch) return legacyMatch;
      throw new Error(
        `SFI_OAUTH_CLIENT_REGISTRY_ALL_STORES_UNAVAILABLE:primary=${error instanceof Error ? error.message : String(error)};continuity=${continuityError instanceof Error ? continuityError.message : String(continuityError)}`,
      );
    }
    if (legacyMatch) return legacyMatch;
    throw error;
  }
}

export function isAllowedSfiOAuthRedirect(client: ResolvedSfiOAuthClient, redirectUri: string) {
  return client.redirectUris.includes(redirectUri);
}

export function canSfiOAuthClientAuthorizeSubject(client: ResolvedSfiOAuthClient, subjectId: string) {
  return client.audience === 'TRUSTED_MULTI_USER' || client.ownerId === subjectId;
}

export function validateSfiOAuthClientSecret(client: ResolvedSfiOAuthClient, clientSecret: string) {
  if (client.source === 'chatgpt_cimd') return clientSecret === '';
  if (client.source === 'dcr_stateless') return safeEqual(hashSfiOAuthClientSecret(clientSecret), client.secretHash || '');
  if (!clientSecret) return false;
  if (client.source === 'legacy_env') return safeEqual(clientSecret, client.legacySecret || '');
  return safeEqual(hashSfiOAuthClientSecret(clientSecret), client.secretHash || '');
}

export async function bindInitialOwnedSfiOAuthRedirect(input: {
  client: ResolvedSfiOAuthClient;
  subjectId: string;
  redirectUri: string;
}) {
  if (
    input.client.source !== 'registry'
    || input.client.audience !== 'OWNER_ONLY'
    || input.client.ownerId !== input.subjectId
    || input.client.redirectUris.length !== 0
  ) {
    return null;
  }

  const redirectUri = normalizeSfiOAuthRedirectUri(input.redirectUri);
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_oauth_clients')
    .update({
      redirect_uris: [redirectUri],
      updated_at: new Date().toISOString(),
      metadata: { firstRedirectBoundVia: 'AUTHORIZATION_REQUEST' },
    })
    .eq('client_id', input.client.clientId)
    .eq('created_by', input.subjectId)
    .eq('audience', 'OWNER_ONLY')
    .eq('status', 'ACTIVE')
    .select('client_id,redirect_uris,updated_at')
    .maybeSingle();
  if (result.error) throw new Error(`SFI_OAUTH_CLIENT_REDIRECT_BIND_FAILED:${result.error.message}`);
  return result.data ?? null;
}

export async function listOwnedSfiOAuthClients(userId: string) {
  const db = createServiceSupabaseClient();
  const result = await db
    .from('sfi_oauth_clients')
    .select('client_id,name,redirect_uris,allowed_scopes,audience,status,last_used_at,created_at,updated_at')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });
  if (result.error) throw new Error(`SFI_OAUTH_CLIENT_LIST_FAILED:${result.error.message}`);
  return result.data ?? [];
}

export async function createOwnedSfiOAuthClient(input: {
  userId: string;
  name: string;
  redirectUris?: unknown;
  scopes: unknown;
  scopeCeiling: readonly string[];
  metadata?: Record<string, unknown>;
}) {
  const name = input.name.trim();
  if (!name) throw new Error('SFI_OAUTH_CLIENT_NAME_REQUIRED');
  const redirectUris = normalizeSfiOAuthRedirectUris(
    input.redirectUris === undefined ? [] : input.redirectUris,
    { allowEmpty: true },
  );
  const allowedScopes = normalizeSfiOAuthScopes(input.scopes, input.scopeCeiling);
  const clientId = `sfi_ext_${randomBytes(12).toString('base64url')}`;
  const clientSecret = `sfi_sec_${randomBytes(32).toString('base64url')}`;
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_oauth_clients').insert({
    client_id: clientId,
    client_secret_hash: hashSfiOAuthClientSecret(clientSecret),
    name,
    created_by: input.userId,
    redirect_uris: redirectUris,
    allowed_scopes: allowedScopes,
    audience: 'OWNER_ONLY',
    status: 'ACTIVE',
    metadata: {
      ...(input.metadata ?? {}),
      redirectBinding: redirectUris.length ? 'EXPLICIT' : 'PENDING_FIRST_AUTHORIZATION',
    },
  }).select('client_id,name,redirect_uris,allowed_scopes,audience,status,created_at').single();
  if (result.error || !result.data) throw new Error(`SFI_OAUTH_CLIENT_CREATE_FAILED:${result.error?.message ?? 'unknown'}`);
  return { client: result.data, clientSecret };
}

export async function adoptLegacySfiOAuthClient(input: {
  userId: string;
  name: string;
  redirectUris: unknown;
}) {
  const legacy = readSfiOAuthConfig();
  if (!legacy) throw new Error('SFI_OAUTH_LEGACY_CLIENT_NOT_CONFIGURED');
  const redirectUris = normalizeSfiOAuthRedirectUris(input.redirectUris);
  const now = new Date().toISOString();
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_oauth_clients').upsert({
    client_id: legacy.clientId,
    client_secret_hash: hashSfiOAuthClientSecret(legacy.clientSecret),
    name: input.name.trim() || 'SFI ChatGPT Actions',
    created_by: input.userId,
    redirect_uris: redirectUris,
    allowed_scopes: [...SFI_ROOT_SCOPES],
    audience: 'TRUSTED_MULTI_USER',
    status: 'ACTIVE',
    metadata: { adoptedFrom: 'SFI_OAUTH_CLIENT_ID' },
    updated_at: now,
  }, { onConflict: 'client_id' }).select('client_id,name,redirect_uris,allowed_scopes,audience,status,created_at,updated_at').single();
  if (result.error || !result.data) throw new Error(`SFI_OAUTH_CLIENT_ADOPT_FAILED:${result.error?.message ?? 'unknown'}`);
  return result.data;
}

export async function updateOwnedSfiOAuthClient(input: {
  userId: string;
  clientId: string;
  redirectUris?: unknown;
  scopes?: unknown;
  scopeCeiling: readonly string[];
  rotateSecret?: boolean;
}) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.redirectUris !== undefined) patch.redirect_uris = normalizeSfiOAuthRedirectUris(input.redirectUris, { allowEmpty: true });
  if (input.scopes !== undefined) patch.allowed_scopes = normalizeSfiOAuthScopes(input.scopes, input.scopeCeiling);
  let clientSecret: string | null = null;
  if (input.rotateSecret) {
    clientSecret = `sfi_sec_${randomBytes(32).toString('base64url')}`;
    patch.client_secret_hash = hashSfiOAuthClientSecret(clientSecret);
  }
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_oauth_clients')
    .update(patch)
    .eq('client_id', input.clientId)
    .eq('created_by', input.userId)
    .eq('status', 'ACTIVE')
    .select('client_id,name,redirect_uris,allowed_scopes,audience,status,updated_at')
    .maybeSingle();
  if (result.error) throw new Error(`SFI_OAUTH_CLIENT_UPDATE_FAILED:${result.error.message}`);
  if (!result.data) throw new Error('SFI_OAUTH_CLIENT_NOT_FOUND');
  return { client: result.data, clientSecret };
}

export async function revokeOwnedSfiOAuthClient(userId: string, clientId: string) {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_oauth_clients')
    .update({ status: 'REVOKED', updated_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .eq('created_by', userId)
    .eq('status', 'ACTIVE')
    .select('client_id,status,updated_at')
    .maybeSingle();
  if (result.error) throw new Error(`SFI_OAUTH_CLIENT_REVOKE_FAILED:${result.error.message}`);
  if (!result.data) throw new Error('SFI_OAUTH_CLIENT_NOT_FOUND');
  return result.data;
}

export async function touchSfiOAuthClient(client: ResolvedSfiOAuthClient) {
  if (client.source === 'continuity_registry') {
    await touchContinuityOAuthClient(client.clientId);
    return;
  }
  if (client.source !== 'registry') return;
  const db = createServiceSupabaseClient();
  await db.from('sfi_oauth_clients')
    .update({ last_used_at: new Date().toISOString() })
    .eq('client_id', client.clientId)
    .eq('status', 'ACTIVE');
}
