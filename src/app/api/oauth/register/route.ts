import { NextRequest, NextResponse } from 'next/server';
import { createStatelessSfiDcrClient } from '@/lib/sfi/oauthClientRegistry';
import { SFI_ROOT_SCOPES } from '@/lib/sfi/oauthConfig';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function oauthRegistrationError(error: string, description: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return oauthRegistrationError('invalid_client_metadata', 'Expected JSON client metadata.');
  const redirectUris = body.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return oauthRegistrationError('invalid_redirect_uri', 'At least one redirect_uri is required.');
  }
  const grantTypes = Array.isArray(body.grant_types) ? body.grant_types.map(String) : ['authorization_code'];
  const responseTypes = Array.isArray(body.response_types) ? body.response_types.map(String) : ['code'];
  if (grantTypes.some((v) => v !== 'authorization_code') || responseTypes.some((v) => v !== 'code')) {
    return oauthRegistrationError('invalid_client_metadata', 'SFI supports authorization_code with response_type=code only.');
  }
  const tokenMethod = typeof body.token_endpoint_auth_method === 'string' ? body.token_endpoint_auth_method : 'client_secret_post';
  if (!['client_secret_post', 'client_secret_basic'].includes(tokenMethod)) {
    return oauthRegistrationError('invalid_client_metadata', 'DCR clients must use client_secret_post or client_secret_basic.');
  }
  const requestedScopes = typeof body.scope === 'string' ? body.scope.split(/\s+/).filter(Boolean) : [...SFI_ROOT_SCOPES];
  try {
    const created = createStatelessSfiDcrClient({
      name: typeof body.client_name === 'string' ? body.client_name : 'Remote MCP client',
      redirectUris,
      scopes: requestedScopes,
    });
    return NextResponse.json({
      client_id: created.clientId,
      client_secret: created.clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0,
      redirect_uris: created.redirectUris,
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: tokenMethod,
      scope: created.allowedScopes.join(' '),
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return oauthRegistrationError('invalid_client_metadata', error instanceof Error ? error.message : 'Client registration failed.');
  }
}
