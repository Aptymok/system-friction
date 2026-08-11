import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { runMethodLabSimulation } from '@/lib/method-lab/simulationRun';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const gate = await requireRootActor('root.method-lab.simulate');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const protocolId = body.protocolId === 'sociotechnical_simulation' || body.protocolId === 'economic_simulation'
    ? body.protocolId
    : null;
  if (!protocolId) return NextResponse.json({ ok: false, error: 'supported_protocol_required' }, { status: 400 });
  const evidenceIds = Array.isArray(body.evidenceIds)
    ? body.evidenceIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
  if (!evidenceIds.length) return NextResponse.json({ ok: false, error: 'persisted_evidence_ids_required' }, { status: 400 });
  const parameters = body.parameters && typeof body.parameters === 'object' && !Array.isArray(body.parameters)
    ? body.parameters as Record<string, unknown>
    : {};

  try {
    const result = await runMethodLabSimulation({ protocolId, evidenceIds, actorId: gate.ctx.user.id, parameters });
    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'method_lab.simulation.executed',
      target: protocolId,
      payload: {
        labAnalysisId: result.labAnalysisId,
        labRunId: result.run.labRunId,
        resultHash: result.run.resultHash,
        evidenceIds,
        epistemicClass: result.run.epistemicClass,
        validationLevel: result.run.validationLevel,
      },
      request,
    });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });
    return NextResponse.json({ ...result, audit });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const status = details.includes('EVIDENCE') ? 400 : details.includes('CONTAMINATED') ? 500 : 503;
    return NextResponse.json({ ok: false, error: 'method_lab_simulation_failed', details }, { status });
  }
}
