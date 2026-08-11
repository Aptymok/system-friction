import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { runCognitiveLabFounderContrast } from '@/lib/cognitive-lab/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };
type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

export async function POST(request: Request, context: RouteContext) {
  const gate = await requireRootActor('cognitive_lab.contrast.execute');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const { id } = await Promise.resolve(context.params);
    const sessionId = decodeURIComponent(id);
    const body = record(await request.json().catch(() => null));
    const founderReading = body.founderReading;

    if (typeof founderReading === 'undefined' || founderReading === null) {
      return NextResponse.json({ ok: false, error: 'founderReading_required' }, { status: 400 });
    }

    const result = await runCognitiveLabFounderContrast(gate.ctx.user.id, sessionId, founderReading);

    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'cognitive_lab.contrast.executed',
      target: sessionId,
      payload: {
        founderAnalysisId: result.founderReading.id,
        divergenceAnalysisId: result.divergence.id,
        learningPersisted: result.learning.persisted === true,
        cognitiveExecution: result.cognitiveExecution,
      },
      request,
    });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });

    return NextResponse.json({
      ok: result.cognitiveExecution === 'EXECUTED',
      ...result,
      audit,
    }, { status: result.cognitiveExecution === 'EXECUTED' ? 200 : 503 });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const status = details.includes('NOT_FOUND')
      ? 404
      : details.includes('REQUIRED') || details.includes('REQUIRES_EVENTS')
        ? 400
        : 500;
    return NextResponse.json({ ok: false, error: 'COGNITIVE_LAB_CONTRAST_FAILED', details }, { status });
  }
}
