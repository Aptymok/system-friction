import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { mintExternalAccessToken } from '@/lib/sfi/externalSessionToken';
import { isAllowedOAuthRedirect, readSfiOAuthConfig, validateOAuthClient } from '@/lib/sfi/oauthConfig';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function codeHash(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function parseBasicAuth(value: string | null) {
  if (!value?.startsWith('Basic ')) return null;
  try {
    const decoded = Buffer.from(value.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator < 0) return null;
    return { clientId: decoded.slice(0, separator), clientSecret: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

function oauthError(error: string, description: string, status = 400) {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' } },
  );
}

export async function POST(req: NextRequest) {
  const config = readSfiOAuthConfig();
  if (!config) return oauthError('server_error', 'SFI OAuth is not configured.', 503);

  const form = await req.formData().catch(() => null);
  if (!form) return oauthError('invalid_request', 'Expected application/x-www-form-urlencoded body.');

  const basic = parseBasicAuth(req.headers.get('authorization'));
  const clientId = String(form.get('client_id') || basic?.clientId || '').trim();
  const clientSecret = String(form.get('client_secret') || basic?.clientSecret || '').trim();
  const grantType = String(form.get('grant_type') || '').trim();
  const code = String(form.get('code') || '').trim();
  const redirectUri = String(form.get('redirect_uri') || '').trim();
  const codeVerifier = String(form.get('code_verifier') || '').trim();

  if (!validateOAuthClient(config, clientId, clientSecret)) {
    return oauthError('invalid_client', 'Client authentication failed.', 401);
  }
  if (grantType !== 'authorization_code') {
    return oauthError('unsupported_grant_type', 'SFI supports authorization_code only.');
  }
  if (!code || !redirectUri || !isAllowedOAuthRedirect(config, redirectUri)) {
    return oauthError('invalid_grant', 'Authorization code or redirect URI is invalid.');
  }

  const db = createServiceSupabaseClient();
  const now = new Date().toISOString();
  const consumed = await db
    .from('sfi_oauth_authorization_codes')
    .update({ consumed_at: now })
    .eq('code_hash', codeHash(code))
    .eq('client_id', clientId)
    .eq('redirect_uri', redirectUri)
    .is('consumed_at', null)
    .gt('expires_at', now)
    .select('subject_id,actor_id,label,role,tenant_id,scopes,code_challenge,code_challenge_method')
    .maybeSingle();

  if (consumed.error || !consumed.data) {
    return oauthError('invalid_grant', 'Authorization code is invalid, expired, or already consumed.');
  }

  if (consumed.data.code_challenge) {
    if (!codeVerifier) return oauthError('invalid_grant', 'PKCE code_verifier is required.');
    const calculated = createHash('sha256').update(codeVerifier).digest('base64url');
    if (!safeEqual(calculated, String(consumed.data.code_challenge))) {
      return oauthError('invalid_grant', 'PKCE verification failed.');
    }
  }

  const scopes = Array.isArray(consumed.data.scopes)
    ? consumed.data.scopes.filter((value): value is string => typeof value === 'string')
    : [];

  const accessToken = mintExternalAccessToken({
    subjectId: String(consumed.data.subject_id),
    actorId: String(consumed.data.actor_id),
    label: consumed.data.label ? String(consumed.data.label) : undefined,
    role: String(consumed.data.role || 'agent'),
    tenantId: String(consumed.data.tenant_id || 'sfi'),
    scopes,
    ttlSeconds: 3600,
  });

  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: scopes.join(' '),
    },
    { headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' } },
  );
}
