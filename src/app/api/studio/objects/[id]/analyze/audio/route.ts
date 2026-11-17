import { NextResponse } from 'next/server';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import { analyzeStudioAudioObject } from '@/lib/studio/audio/analyzeStudioAudioObject';
import { isStudioAudioError, toStudioAudioApiError } from '@/lib/studio/audio/audioErrors';
import { runStudioCanonicalMihm } from '@/lib/studio/audio/mihmCanonicalRuntime';
import { evaluateStudioFadStructuralContrast } from '@/lib/studio/audio/fadStructuralEvaluator';

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
      // FAD and the original Python MIHM v3 are independent instruments.
      // Neither can claim success on behalf of the other.
      const [fadResult, mihmResult] = await Promise.allSettled([
        evaluateStudioFadStructuralContrast(objectId, context.user.id, String(result.checksumSha256)),
        runStudioCanonicalMihm(objectId, String(result.checksumSha256)),
      ]);
      const fad = fadResult.status === 'fulfilled'
        ? fadResult.value
        : { state: 'BLOCKED', reason: 'FAD_EXECUTION_FAILED' };
      const mihm = mihmResult.status === 'fulfilled'
        ? mihmResult.value
        : { state: 'BLOCKED', reason: 'MIHM_EXECUTION_FAILED' };
      const complete = fad.state === 'DERIVED' && mihm.state === 'DERIVED';
      return NextResponse.json({
        ...result,
        methodologicalIntegration: {
          state: complete ? 'EXECUTED' : 'PARTIAL_OR_BLOCKED',
          fad,
          fadScope: 'ACOUSTIC_STRUCTURAL_SUBMETRIC_ONLY',
          mihm,
          mihmScope: 'MIHM_V3_ORIGINAL_PYTHON_EXTRACTOR',
          culturalOutcome: 'NOT_OBSERVED',
        },
      }, { status: complete ? (reused ? 200 : 202) : 207 });
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
