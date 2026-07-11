import { NextResponse } from 'next/server';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import { analyzeStudioAudioObject } from '@/lib/studio/audio/analyzeStudioAudioObject';
import { isStudioAudioError, toStudioAudioApiError } from '@/lib/studio/audio/audioErrors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function POST(request: Request, ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  const objectId = decodeURIComponent(params.id);

  try {
    const context = await requireObjectOwner(objectId);
    const body = await request.json().catch(() => ({})) as { force?: unknown };
    const result = await analyzeStudioAudioObject(objectId, {
      force: body.force === true,
      requestedByUserId: context.user.id,
    });
    const reused = Boolean((result as Record<string, unknown>).reused);
    return NextResponse.json(result, { status: reused ? 200 : 202 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    if (isStudioAudioError(error)) {
      return NextResponse.json(toStudioAudioApiError(error), { status: error.status });
    }
    return NextResponse.json({
      ok: false,
      error: 'ANALYSIS_FAILED',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
