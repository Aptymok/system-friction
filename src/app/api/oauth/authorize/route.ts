import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { AccessDeniedError, requireUserProfile } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { isAllowedOAuthRedirect, readSfiOAuthConfig, validateOAuthClient } from '@/lib/sfi/oauthConfig';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROOT_SCOPES = [
  'observe',
  'propose',
  'execute',
  'cases:read',
  'cases:write',
  'lab:read',
  'lab:write',
  'lab:run',
  'studio:read',
  'studio:content',
  'studio:run',
] as const;
const PERSONAL_SCOPES = [
  'cases:read',
  'cases:write',
  'lab:read',
  'lab:write',
  'lab:run',
  'studio:read',
  'studio:content',
  'studio:run',
] as const;
const SUPPORTED_SCOPES = new Set<string>(ROOT_SCOPES);

function codeHash(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

function actorSlug(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function redirectOAuthError(redirectUri: string, state: string | null, error: string, description: string) {
  const url = new URL(redirectUri);
  url.searchParams.set('error', error);
  url.searchParams.set('error_description', description);
  if (state) url.searchParams.set('state', state);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const config = readSfiOAuthConfig();
  if (!config) {
    return NextResponse.json({ ok: false, error: 'oauth_not_configured' }, { status: 503 });
  }

  const clientId = req.nextUrl.searchParams.get('client_id')?.trim() || '';
  const redirectUri = req.nextUrl.searchParams.get('redirect_uri')?.trim() || '';
  const responseType = req.nextUrl.searchParams.get('response_type')?.trim() || '';
  const state = req.nextUrl.searchParams.get('state');
  const rawScope = req.nextUrl.searchParams.get('scope')?.trim() || null;
  const codeChallenge = req.nextUrl.searchParams.get('code_challenge')?.trim() || null;
  const codeChallengeMethod = req.nextUrl.searchParams.get('code_challenge_method')?.trim() || null;

  if (!validateOAuthClient(config, clientId) || !redirectUri || !isAllowedOAuthRedirect(config, redirectUri)) {
    return NextResponse.json({ ok: false, error: 'invalid_client_or_redirect' }, { status: 400 });
  }
  if (responseType !== 'code') {
    return redirectOAuthError(redirectUri, state, 'unsupported_response_type', 'SFI supports OAuth authorization_code only.');
  }
  if (codeChallenge && codeChallengeMethod !== 'S256') {
    return redirectOAuthError(redirectUri, state, 'invalid_request', 'Only PKCE S256 is supported.');
  }

  const explicitlyRequestedScopes = rawScope
    ? [...new Set<string>(rawScope.split(/\s+/).filter(Boolean))]
    : null;
  if (explicitlyRequestedScopes?.some((scope) => !SUPPORTED_SCOPES.has(scope))) {
    return redirectOAuthError(redirectUri, state, 'invalid_scope', 'One or more requested SFI scopes are not supported.');
  }

  let context: Awaited<ReturnType<typeof requireUserProfile>>;
  try {
    context = await requireUserProfile();
  } catch (error) {
    if (error instanceof AccessDeniedError && error.status === 401) {
      const next = `${req.nextUrl.pathname}${req.nextUrl.search}`;
      return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, req.url));
    }
    if (error instanceof AccessDeniedError) {
      return redirectOAuthError(redirectUri, state, 'access_denied', 'An active SFI account is required.');
    }
    throw error;
  }

  const profileRole = String(context.profile.role || 'operator').toLowerCase();
  const rootDelegate = profileRole === 'root' || profileRole === 'system';
  const institutionalScopes = context.member?.external?.scopes ?? null;
  const personalPrincipal = !rootDelegate && !context.member;

  const allowedScopes = new Set<string>(
    rootDelegate
      ? ROOT_SCOPES
      : institutionalScopes?.length
        ? institutionalScopes
        : PERSONAL_SCOPES,
  );

  const requestedScopes = explicitlyRequestedScopes ?? [...allowedScopes];
  let grantedScopes: string[];

  if (personalPrincipal) {
    // One ChatGPT OAuth client can request the institutional superset. A normal
    // account receives only the safe owner-scoped intersection. The returned
    // token therefore cannot propose or execute institutional actions.
    grantedScopes = requestedScopes.filter((scope) => allowedScopes.has(scope));
    if (!grantedScopes.length) {
      return redirectOAuthError(redirectUri, state, 'invalid_scope', 'The requested scopes do not include a personal workspace capability.');
    }
  } else {
    if (requestedScopes.some((scope) => !allowedScopes.has(scope))) {
      return redirectOAuthError(redirectUri, state, 'invalid_scope', 'The authenticated SFI principal is not allowed to receive one or more requested scopes.');
    }
    grantedScopes = requestedScopes;
  }

  const label = context.member?.displayName || String(context.profile.alias || context.user.email || 'SFI user');
  const slug = actorSlug(context.member?.displayName || String(context.profile.alias || ''));
  const actorId = slug ? `external:${slug}` : `external:user:${context.user.id}`;
  const delegatedRole = rootDelegate
    ? 'root_delegate'
    : context.member?.external?.role ?? 'personal_operator';
  const tenantId = personalPrincipal ? `user:${context.user.id}` : 'sfi';
  const code = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  const db = createServiceSupabaseClient();
  const stored = await db.from('sfi_oauth_authorization_codes').insert({
    code_hash: codeHash(code),
    client_id: clientId,
    redirect_uri: redirectUri,
    subject_id: context.user.id,
    actor_id: actorId,
    label,
    role: delegatedRole,
    tenant_id: tenantId,
    scopes: grantedScopes,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallenge ? 'S256' : null,
    expires_at: expiresAt,
  });

  if (stored.error) {
    return redirectOAuthError(redirectUri, state, 'server_error', 'SFI could not issue an authorization code.');
  }

  const callback = new URL(redirectUri);
  callback.searchParams.set('code', code);
  if (state) callback.searchParams.set('state', state);
  return NextResponse.redirect(callback);
}
