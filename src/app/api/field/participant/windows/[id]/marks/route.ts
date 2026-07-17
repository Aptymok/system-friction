import { NextResponse } from 'next/server';
import { addParticipantMark } from '@/lib/field/participantCapture';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
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
  return NextResponse.json({ ok: false, error: 'PARTICIPANT_MARK_FAILED', details }, { status });
}

export async function POST(request: Request, ctx: RouteContext) {
  try {
    const params = await Promise.resolve(ctx.params);
    const { user } = await requireAuthenticatedUser();
    const body = record(await request.json().catch(() => null));
    const mark = await addParticipantMark(user.id, params.id, {
      dayNumber: Number(body.dayNumber),
      note: typeof body.note === 'string' ? body.note : null,
      observedAt: typeof body.observedAt === 'string' ? body.observedAt : null,
    });
    return NextResponse.json({ ok: true, mark }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
