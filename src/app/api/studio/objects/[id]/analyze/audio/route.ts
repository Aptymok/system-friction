import { NextResponse } from 'next/server';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import { analyzeStudioAudioObject } from '@/lib/studio/audio/analyzeStudioAudioObject';
import { isStudioAudioError, toStudioAudioApiError } from '@/lib/studio/audio/audioErrors';
import { synthesizeStudioObject, getPersistedStudioObjectSynthesis } from '@/lib/studio/production/objectContextSynthesis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  const objectId = decodeURIComponent(params.id);

  try {
    const context = await requireObjectOwner(objectId);
    const body = await request.json().catch(() => ({})) as { force?: unknown; integrateMethods?: unknown };
    const result = await analyzeStudioAudioObject(objectId, {
      force: body.force === true,
      requestedByUserId: context.user.id,
    });
    const reused = Boolean((result as Record<string, unknown>).reused);
    if (body.integrateMethods !== false) {
      // Reuse the existing MIHM synthesis owner after genuine persisted acoustic
      // extraction. This mode never invents a FAD score or a final IHG.
      try {
        const existing = reused ? await getPersistedStudioObjectSynthesis(objectId) : null;
        const synthesis = existing ?? await synthesizeStudioObject(objectId, { persist: true });
        return NextResponse.json({
          ...result,
          methodologicalIntegration: {
            state: 'EXECUTED',
            mihm: synthesis.mihm,
            evidenceTraceId: synthesis.persistence.evidenceTraceId,
            synthesisStatus: synthesis.status,
            fad: 'NOT_OBSERVED',
            fadReason: 'CANONICAL_FAD_AUDIO_OWNER_NOT_VERIFIED',
            culturalOutcome: 'NOT_OBSERVED',
          },
        }, { status: reused ? 200 : 202 });
      } catch (integrationError) {
        // Acoustic analysis may already be persisted. Keep that successful
        // result visible without misrepresenting synthesis as successful.
        return NextResponse.json({
          ...result,
          methodologicalIntegration: {
            state: 'BLOCKED',
            mihm: 'NOT_OBSERVED',
            fad: 'NOT_OBSERVED',
            reason: integrationError instanceof Error ? integrationError.message : 'INTEGRATION_FAILED',
          },
        }, { status: 207 });
      }
    }
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
