import { NextResponse } from 'next/server';
import { closeParticipantWindow, getParticipantWindowState } from '@/lib/field/participantCapture';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function failure(error: unknown) {
  if (error instanceof AccessDeniedError) {
    return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
  }
  const details = error instanceof Error ? error.message : String(error);
  const status = details.includes('_REQUIRED') || details.includes('_INVALID') || details.includes('_NOT_ACTIVE')
    ? 400
    : details.includes('NOT_FOUND')
      ? 404
      : 500;
  return NextResponse.json({ ok: false, error: 'PARTICIPANT_WINDOW_FAILED', details }, { status });
}

export async function GET(_request: Request, ctx: RouteContext) {
  try {
    const params = await Promise.resolve(ctx.params);
    const { user } = await requireAuthenticatedUser();
    const state = await getParticipantWindowState(user.id, params.id);
    return NextResponse.json({ ok: true, ...state });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request, ctx: RouteContext) {
  try {
    const params = await Promise.resolve(ctx.params);
    const { user } = await requireAuthenticatedUser();
    const body = record(await request.json().catch(() => null));
    const result = await closeParticipantWindow(user.id, params.id, {
      whatChanged: text(body.whatChanged),
      whatNoticed: text(body.whatNoticed),
      whatAvoided: text(body.whatAvoided),
      whatWasMine: text(body.whatWasMine),
      whatWasNotMine: text(body.whatWasNotMine),
      neededToday: text(body.neededToday),
    });
    return NextResponse.json({ ok: true, window: result });
  } catch (error) {
    return failure(error);
  }
}
