import { NextResponse } from 'next/server';

import { requireRootActor, auditRootAction } from '@/lib/root/server';
import { synthesizeStudioObject } from '@/lib/studio/production/objectContextSynthesis';
import { projectStudioObjectField } from '@/lib/studio/production/objectFieldProjection';
import { predictStudioFieldResponse } from '@/lib/predictive-engine/adapters/studio';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function normalizedThemes(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean))].slice(0, 20);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.evaluator.run');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const objectId = typeof body.objectId === 'string' ? body.objectId.trim() : '';
  const themes = normalizedThemes(body.themes);
  if (!objectId) return NextResponse.json({ ok: false, error: 'objectId_required' }, { status: 400 });

  try {
    const synthesis = await synthesizeStudioObject(objectId, { persist: true });
    const projection = await projectStudioObjectField(objectId, { persist: true });
    const prediction = await predictStudioFieldResponse({
      objectId,
      projection,
      ownerId: gate.ctx.user.id,
      createdBy: gate.ctx.user.id,
      persist: true,
    });

    if (themes.length) {
      const service = createServiceSupabaseClient();
      const current = await service.from('studio_objects').select('metadata').eq('id', objectId).maybeSingle();
      if (current.error) throw new Error(`studio_object_metadata_read_failed: ${current.error.message}`);
      const metadata = { ...record(current.data?.metadata), atlasThemes: themes };
      const update = await service.from('studio_objects').update({ metadata, updated_at: new Date().toISOString() }).eq('id', objectId);
      if (update.error) throw new Error(`studio_object_metadata_update_failed: ${update.error.message}`);
    }

    const selectedRoute = projection.strategy.routes.find((route) => route.id === projection.strategy.selectedRouteId) ?? null;
    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'root.evaluator.run',
      target: objectId,
      payload: {
        objectId,
        synthesisStatus: synthesis.status,
        mihmStatus: synthesis.mihm.status,
        projectionStatus: projection.status,
        fitScore: projection.fit.score,
        predictionRunId: prediction.id,
        predictionStatus: prediction.status,
        themes,
      },
      request,
    });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });

    return NextResponse.json({
      ok: true,
      objectId,
      evaluation: {
        generatedAt: projection.generatedAt,
        synthesisStatus: synthesis.status,
        projectionStatus: projection.status,
        objectTitle: synthesis.objectTitle,
        modality: synthesis.modality,
        mihm: {
          status: synthesis.mihm.status,
          coverage: synthesis.mihm.coverage,
          coreCoverage: synthesis.mihm.coreCoverage,
          weightedSum: synthesis.mihm.weightedSum,
          penaltySum: synthesis.mihm.penaltySum,
          ihg: synthesis.mihm.ihg,
          summary: synthesis.mihm.summary,
          limitations: synthesis.mihm.limitations,
        },
        field: {
          status: projection.fit.band,
          score: projection.fit.score,
          confidence: projection.fit.confidence,
          coverage: projection.fit.coverage,
          explanation: projection.fit.explanation,
          opportunityWindow: projection.opportunityWindow,
        },
        route: selectedRoute ? {
          id: selectedRoute.id,
          title: selectedRoute.title,
          suitability: selectedRoute.suitability,
          confidence: selectedRoute.confidence,
          expectedShift: selectedRoute.expectedShift,
        } : null,
      },
      prediction: {
        id: prediction.id,
        status: prediction.status,
        prediction: prediction.prediction,
        lowerBound: prediction.lowerBound,
        upperBound: prediction.upperBound,
        confidence: prediction.confidence,
        dueAt: prediction.dueAt,
        returnWindow: prediction.returnWindow,
        calibrationStatus: prediction.model.calibrationStatus,
        calibrationNotice: prediction.calibrationNotice,
        missingEvidence: prediction.missingEvidence,
      },
      atlas: {
        objectId,
        themes,
        runId: prediction.id,
      },
      audit,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'root_evaluation_failed',
      details: error instanceof Error ? error.message : 'unknown_error',
    }, { status: 500 });
  }
}
