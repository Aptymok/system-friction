import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { runMethodLabSimulation } from '@/lib/method-lab/simulationRun';
import { runMihmFoundationDiagnostic } from '@/lib/method-lab/mihmFoundationDiagnosticRun';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const gate = await requireRootActor('root.method-lab.simulate');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const protocolId = body.protocolId === 'sociotechnical_simulation' || body.protocolId === 'economic_simulation' || body.protocolId === 'mihm_foundation_diagnostic'
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
  const cognitiveSpineContextRefs = Array.isArray(body.cognitiveSpineContextRefs)
    ? [...new Set(body.cognitiveSpineContextRefs.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))]
    : [];

  try {
    const result = protocolId === 'mihm_foundation_diagnostic'
      ? await runMihmFoundationDiagnostic({ actorId: gate.ctx.user.id, evidenceIds, parameters })
      : await runMethodLabSimulation({
          protocolId,
          evidenceIds,
          actorId: gate.ctx.user.id,
          parameters,
          cognitiveSpineContextRefs,
        });
    const cognitiveSpine = 'cognitiveSpine' in result ? result.cognitiveSpine : null;
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
        cognitiveSpineSnapshotId: cognitiveSpine?.snapshotId ?? null,
        cognitiveSpineSnapshotHash: cognitiveSpine?.snapshotHash ?? null,
        cognitiveSpineProfile: cognitiveSpine?.profile ?? null,
        cognitiveSpineConsumed: cognitiveSpine?.consumed ?? false,
        cognitiveSpineContextRefs: cognitiveSpine?.requestedContextRefs ?? [],
      },
      request,
    });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });
    return NextResponse.json({ ...result, audit });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const status = details.startsWith('COGNITIVE_SPINE_ALLOWED_REF_UNAVAILABLE')
      ? 400
      : details.includes('EVIDENCE')
        ? 400
        : details.includes('CONTAMINATED')
          ? 500
          : 503;
    return NextResponse.json({ ok: false, error: 'method_lab_simulation_failed', details }, { status });
  }
}
