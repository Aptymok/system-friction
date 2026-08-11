import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { runCognitiveLabBlindTwin } from '@/lib/cognitive-lab/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function POST(request: Request, context: RouteContext) {
  const gate = await requireRootActor('cognitive_lab.blind.execute');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const { id } = await Promise.resolve(context.params);
    const sessionId = decodeURIComponent(id);
    const result = await runCognitiveLabBlindTwin(gate.ctx.user.id, sessionId);

    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'cognitive_lab.blind.executed',
      target: sessionId,
      payload: {
        analysisId: result.analysis.id,
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
    const status = details.includes('NOT_FOUND') ? 404 : details.includes('REQUIRES_EVENTS') ? 400 : 500;
    return NextResponse.json({ ok: false, error: 'COGNITIVE_LAB_BLIND_FAILED', details }, { status });
  }
}
