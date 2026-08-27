import { NextResponse } from 'next/server';
import { reconstructCognitiveSpineDecisionPath } from '@/lib/institution/cognitiveSpineProvenanceReconstruction';
import { requireGovernedActor } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireGovernedActor('cognitive_spine.run.reconstruct_provenance');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  if (!gate.ctx.isRoot) return NextResponse.json({ ok: false, error: 'root_required' }, { status: 403 });

  try {
    const { id } = await Promise.resolve(context.params);
    const runId = decodeURIComponent(id).trim();
    if (!runId) return NextResponse.json({ ok: false, error: 'missing_run_id' }, { status: 400 });

    const reconstruction = await reconstructCognitiveSpineDecisionPath(runId);
    return NextResponse.json({
      ok: true,
      runId,
      integrated: reconstruction.assessment.status === 'PASS',
      reconstruction,
      rule: 'PASS proves provenance completeness for this historical path only. It does not prove the intervention was optimal, causal in the scientific sense, or eligible for canon promotion.',
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const status = details.includes('NOT_FOUND') ? 404 : details.includes('ROLE_INVALID') ? 409 : 400;
    return NextResponse.json({ ok: false, error: 'COGNITIVE_SPINE_PROVENANCE_RECONSTRUCTION_FAILED', details }, { status });
  }
}
