import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { runStudioCulturalPipeline } from '@/lib/studio/cultural-lab/pipeline';
import type { InterventionCandidate, StudioArtifactInput } from '@/lib/studio/cultural-lab/types';
import { createStudioFieldHandoff } from '@/lib/studio/fieldHandoff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as StudioArtifactInput;
    const trace = await runStudioCulturalPipeline(input);
    const implementation = trace.stages.find((stage) => stage.id === 'implementation_console');
    const interventionsStage = trace.stages.find((stage) => stage.id === 'intervention_design');
    const forecastStage = trace.stages.find((stage) => stage.id === 'outcome_forecast');
    const candidates = Array.isArray(interventionsStage?.data)
      ? interventionsStage.data as InterventionCandidate[]
      : [];
    const selected = candidates.find((candidate) => candidate.reversible && candidate.risk === 'low')
      ?? candidates.find((candidate) => candidate.reversible)
      ?? null;

    const predictionSeal = createHash('sha256').update(JSON.stringify({
      studioRunId: trace.runId,
      artifactId: trace.artifactId,
      selectedIntervention: selected,
      forecast: forecastStage?.data ?? null,
    })).digest('hex');

    const handoff = selected
      ? createStudioFieldHandoff({
          sourceObjectId: trace.artifactId,
          interventionId: selected.id,
          predictionSeal,
          returnWindow: '72h',
          evidenceRefs: [`studio_run:${trace.runId}`, `studio_artifact:${trace.artifactId}`],
          createdAt: trace.createdAt,
        })
      : null;

    return NextResponse.json({
      ok: true,
      implementation,
      trace,
      handoff,
      handoffStatus: handoff ? 'READY_FOR_FIELD' : 'NO_REVERSIBLE_INTERVENTION_AVAILABLE',
      claimBoundary: 'The handoff preserves Studio intervention identity and prediction seal. It does not authorize Field execution by itself.',
    });
  } catch (error) {
    console.error('[Studio Implement] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'error_desconocido';
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}