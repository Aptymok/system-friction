import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { mintExternalAccessToken } from '@/lib/sfi/externalSessionToken';
import { isSfiOAuthServerConfigured } from '@/lib/sfi/oauthConfig';
import {
  isAllowedSfiOAuthRedirect,
  resolveSfiOAuthClient,
  touchSfiOAuthClient,
  validateSfiOAuthClientSecret,
} from '@/lib/sfi/oauthClientRegistry';
import {
  consumeSfiOAuthAuthorizationCode,
  findSfiOAuthAuthorizationCode,
} from '@/lib/sfi/oauthAuthorizationCodeStore';

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
  if (!isSfiOAuthServerConfigured()) return oauthError('server_error', 'SFI OAuth is not configured.', 503);

  const form = await req.formData().catch(() => null);
  if (!form) return oauthError('invalid_request', 'Expected application/x-www-form-urlencoded body.');

  const basic = parseBasicAuth(req.headers.get('authorization'));
  const clientId = String(form.get('client_id') || basic?.clientId || '').trim();
  const clientSecret = String(form.get('client_secret') || basic?.clientSecret || '').trim();
  const grantType = String(form.get('grant_type') || '').trim();
  const code = String(form.get('code') || '').trim();
  const redirectUri = String(form.get('redirect_uri') || '').trim();
  const codeVerifier = String(form.get('code_verifier') || '').trim();
  const resource = String(form.get('resource') || '').trim();

  let client: Awaited<ReturnType<typeof resolveSfiOAuthClient>>;
  try {
    client = await resolveSfiOAuthClient(clientId);
  } catch {
    return oauthError('temporarily_unavailable', 'SFI OAuth client registry is unavailable.', 503);
  }
  if (!client || !validateSfiOAuthClientSecret(client, clientSecret)) {
    return oauthError('invalid_client', 'Client authentication failed.', 401);
  }
  if (resource) {
    const origin = req.nextUrl.origin;
    if (resource !== origin && resource !== `${origin}/api/mcp/authenticated`) {
      return oauthError('invalid_target', 'The requested OAuth resource is not this SFI MCP server.');
    }
  }
  if (grantType !== 'authorization_code') {
    return oauthError('unsupported_grant_type', 'SFI supports authorization_code only.');
  }
  if (!code || !redirectUri || !isAllowedSfiOAuthRedirect(client, redirectUri)) {
    return oauthError('invalid_grant', 'Authorization code or redirect URI is invalid.');
  }

  const now = new Date().toISOString();
  let found: Awaited<ReturnType<typeof findSfiOAuthAuthorizationCode>>;
  try {
    found = await findSfiOAuthAuthorizationCode({
      codeHash: codeHash(code),
      clientId,
      redirectUri,
      now,
    });
  } catch {
    return oauthError('temporarily_unavailable', 'SFI OAuth authorization-code storage is unavailable.', 503);
  }

  if (!found) {
    return oauthError('invalid_grant', 'Authorization code is invalid, expired, or already consumed.');
  }

  if ((client.source === 'chatgpt_cimd' || client.source === 'dcr_stateless') && !found.record.code_challenge) {
    return oauthError('invalid_grant', 'PKCE is required for remote public/dynamically registered MCP clients.');
  }

  if (found.record.code_challenge) {
    if (!codeVerifier) return oauthError('invalid_grant', 'PKCE code_verifier is required.');
    const calculated = createHash('sha256').update(codeVerifier).digest('base64url');
    if (!safeEqual(calculated, String(found.record.code_challenge))) {
      return oauthError('invalid_grant', 'PKCE verification failed.');
    }
  }

  // Consume only after client and optional PKCE verification. Both stores use
  // a consumed_at IS NULL guard so the code remains single-use under races.
  let consumed = false;
  try {
    consumed = await consumeSfiOAuthAuthorizationCode(found.store, found.record.id, now);
  } catch {
    return oauthError('temporarily_unavailable', 'SFI OAuth authorization-code storage is unavailable.', 503);
  }

  if (!consumed) {
    return oauthError('invalid_grant', 'Authorization code was already consumed.');
  }

  const scopes = found.record.scopes;

  const accessToken = mintExternalAccessToken({
    subjectId: found.record.subject_id,
    actorId: found.record.actor_id,
    clientId,
    label: found.record.label || undefined,
    role: found.record.role || 'agent',
    tenantId: found.record.tenant_id || 'sfi',
    scopes,
    ttlSeconds: 3600,
  });

  await touchSfiOAuthClient(client).catch(() => undefined);

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
