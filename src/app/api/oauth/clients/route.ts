import { NextResponse } from 'next/server';
import { AccessDeniedError, requireUserProfile } from '@/lib/system/access/server';
import {
  SFI_PERSONAL_SCOPES,
  SFI_ROOT_SCOPES,
} from '@/lib/sfi/oauthConfig';
import {
  adoptLegacySfiOAuthClient,
  createOwnedSfiOAuthClient,
  listOwnedSfiOAuthClients,
  revokeOwnedSfiOAuthClient,
  updateOwnedSfiOAuthClient,
} from '@/lib/sfi/oauthClientRegistry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function jsonError(error: unknown) {
  if (error instanceof AccessDeniedError) {
    return NextResponse.json({ ok: false, error: error.code }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : 'SFI_OAUTH_CLIENT_OPERATION_FAILED';
  const status = /NOT_FOUND/.test(message) ? 404 : /REQUIRED|INVALID|NOT_ALLOWED|HTTPS|FRAGMENT|COUNT/.test(message) ? 400 : 500;
  return NextResponse.json({ ok: false, error: message }, { status });
}

function scopeCeiling(context: Awaited<ReturnType<typeof requireUserProfile>>) {
  const role = String(context.profile.role || 'operator').toLowerCase();
  if (role === 'root' || role === 'system') return [...SFI_ROOT_SCOPES];
  if (context.member?.external?.scopes?.length) return [...context.member.external.scopes];
  return [...SFI_PERSONAL_SCOPES];
}

export async function GET() {
  try {
    const context = await requireUserProfile();
    return NextResponse.json({
      ok: true,
      clients: await listOwnedSfiOAuthClients(context.user.id),
      scopeCeiling: scopeCeiling(context),
      boundary: 'OAuth clients are owned by the authenticated SFI account. Client registration does not grant scopes beyond the principal authority ceiling.',
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireUserProfile();
    const body = row(await request.json().catch(() => ({})));
    const operation = text(body.operation) || 'create';
    const ceiling = scopeCeiling(context);

    if (operation === 'adopt_legacy') {
      const role = String(context.profile.role || '').toLowerCase();
      if (role !== 'root' && role !== 'system') {
        return NextResponse.json({ ok: false, error: 'ROOT_REQUIRED_FOR_LEGACY_ADOPTION' }, { status: 403 });
      }
      const client = await adoptLegacySfiOAuthClient({
        userId: context.user.id,
        name: text(body.name) || 'SFI ChatGPT Actions',
        redirectUris: body.redirectUris,
      });
      return NextResponse.json({
        ok: true,
        operation,
        client,
        clientSecretReturned: false,
        note: 'The existing ENV client secret was hashed into the registry; the secret itself was not returned.',
      }, { status: 201 });
    }

    if (operation !== 'create') {
      return NextResponse.json({ ok: false, error: 'UNSUPPORTED_OAUTH_CLIENT_OPERATION' }, { status: 400 });
    }

    const created = await createOwnedSfiOAuthClient({
      userId: context.user.id,
      name: text(body.name),
      redirectUris: body.redirectUris,
      scopes: body.scopes,
      scopeCeiling: ceiling,
      metadata: { registeredVia: 'SFI_OAUTH_SELF_SERVICE' },
    });

    return NextResponse.json({
      ok: true,
      operation,
      client: created.client,
      clientSecret: created.clientSecret,
      secretDisclosure: 'ONE_TIME_ONLY',
      next: 'Copy the client ID and client secret into the external GPT/application. Future callback changes can be made through PATCH without editing Vercel environment variables.',
    }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireUserProfile();
    const body = row(await request.json().catch(() => ({})));
    const clientId = text(body.clientId);
    if (!clientId) return NextResponse.json({ ok: false, error: 'SFI_OAUTH_CLIENT_ID_REQUIRED' }, { status: 400 });

    const updated = await updateOwnedSfiOAuthClient({
      userId: context.user.id,
      clientId,
      redirectUris: body.redirectUris,
      scopes: body.scopes,
      scopeCeiling: scopeCeiling(context),
      rotateSecret: body.rotateSecret === true,
    });

    return NextResponse.json({
      ok: true,
      client: updated.client,
      clientSecret: updated.clientSecret,
      secretDisclosure: updated.clientSecret ? 'ONE_TIME_ONLY' : null,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await requireUserProfile();
    const clientId = new URL(request.url).searchParams.get('client_id')?.trim() || '';
    if (!clientId) return NextResponse.json({ ok: false, error: 'SFI_OAUTH_CLIENT_ID_REQUIRED' }, { status: 400 });
    return NextResponse.json({
      ok: true,
      client: await revokeOwnedSfiOAuthClient(context.user.id, clientId),
    });
  } catch (error) {
    return jsonError(error);
  }
}
