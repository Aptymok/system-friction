import { NextResponse } from 'next/server';
import { runNationalFieldScenario } from '@/core/cognitive-twin/nationalFieldScenario';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

type Row = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  const gate = await requireRootActor('national_field.analyze');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const body = await request.json().catch(() => ({})) as Row;
  const scenarioId = text(body.scenarioId);
  if (!scenarioId) return NextResponse.json({ ok: false, error: 'scenarioId_required' }, { status: 400 });

  const result = await runNationalFieldScenario({
    scenarioId,
    cutoffAt: text(body.cutoffAt),
    referenceStart: text(body.referenceStart),
    referenceEnd: text(body.referenceEnd),
    requestedBy: gate.ctx.user.id,
  });

  if (!result.ok) return NextResponse.json(result, { status: 503 });
  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'national_field.analyze',
    target: result.run.task_id,
    payload: {
      runId: result.run.id,
      scenarioId,
      observationCount: result.observationCount,
      cognitiveExecution: result.cognitiveExecution,
      provider: result.llm.provider,
      model: result.llm.model,
      evidenceRefs: result.evidenceRefs.length,
    },
    request,
  });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });

  return NextResponse.json({ ...result, audit });
}
