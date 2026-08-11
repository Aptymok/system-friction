import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { runMethodLabSimulation } from '@/lib/method-lab/simulationRun';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const gate = await requireRootActor('root.simulation.run');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const evidenceIds = Array.isArray(body.evidenceIds)
    ? body.evidenceIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
  if (!evidenceIds.length) return NextResponse.json({ ok: false, error: 'persisted_evidence_ids_required' }, { status: 400 });
  const parameters = body.parameters && typeof body.parameters === 'object' && !Array.isArray(body.parameters)
    ? body.parameters as Record<string, unknown>
    : {};

  try {
    const result = await runMethodLabSimulation({
      protocolId: 'sociotechnical_simulation',
      evidenceIds,
      actorId: gate.ctx.user.id,
      parameters,
    });
    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'simulation.run',
      target: 'sociotechnical_simulation',
      payload: {
        compatibilityRoute: '/api/root/simulation',
        methodLabAnalysisId: result.labAnalysisId,
        labRunId: result.run.labRunId,
        evidenceIds,
        resultHash: result.run.resultHash,
      },
      request,
    });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });

    return NextResponse.json({
      ...result,
      audit,
      compatibility: 'Legacy ROOT simulation route now executes the shared Method Lab sociotechnical protocol.',
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: 'sociotechnical_method_lab_run_failed', details }, { status: details.includes('EVIDENCE') ? 400 : 503 });
  }
}
