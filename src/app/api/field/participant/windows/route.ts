import { NextResponse } from 'next/server';
import { createParticipantWindow, listParticipantWindows } from '@/lib/field/participantCapture';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function failure(error: unknown) {
  if (error instanceof AccessDeniedError) {
    return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
  }
  const details = error instanceof Error ? error.message : String(error);
  const status = details.includes('_REQUIRED') || details.includes('_INVALID')
    ? 400
    : details.includes('NOT_FOUND')
      ? 404
      : 500;
  return NextResponse.json({ ok: false, error: 'PARTICIPANT_WINDOW_FAILED', details }, { status });
}

export async function GET() {
  try {
    const { user } = await requireAuthenticatedUser();
    const windows = await listParticipantWindows(user.id);
    return NextResponse.json({ ok: true, windows });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const body = record(await request.json().catch(() => null));
    const result = await createParticipantWindow(user.id, {
      watchedThoughts: stringArray(body.watchedThoughts),
      caseId: typeof body.caseId === 'string' ? body.caseId : null,
    });
    return NextResponse.json({ ok: true, window: result }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
