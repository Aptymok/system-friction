import { NextResponse } from 'next/server';

import { AmvEpistemicGateError, buildAmvPredictionGate } from '@/lib/amv/epistemicGate';
import { requireRootActor, auditRootAction } from '@/lib/root/server';
import { synthesizeStudioObject } from '@/lib/studio/production/objectContextSynthesis';
import { projectStudioObjectField } from '@/lib/studio/production/objectFieldProjection';
import { predictStudioFieldResponse } from '@/lib/predictive-engine/adapters/studio';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

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
  const rootGate = await requireRootActor('root.evaluator.run');
  if (!rootGate.ok) return NextResponse.json(rootGate.body, { status: rootGate.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const objectId = typeof body.objectId === 'string' ? body.objectId.trim() : '';
  const themes = normalizedThemes(body.themes);
  if (!objectId) return NextResponse.json({ ok: false, error: 'objectId_required' }, { status: 400 });

  try {
    const service = createServiceSupabaseClient();
    const objectResult = await service.from('studio_objects').select('id,title,object_type,metadata').eq('id', objectId).maybeSingle();
    if (objectResult.error || !objectResult.data) throw new Error(objectResult.error?.message ?? 'STUDIO_OBJECT_NOT_FOUND');

    const synthesis = await synthesizeStudioObject(objectId, { persist: true });
    const projection = await projectStudioObjectField(objectId, { persist: true });
    const epistemicGate = buildAmvPredictionGate({
      objectType: objectResult.data.object_type,
      metadata: objectResult.data.metadata,
      mihmStatus: synthesis.mihm.status,
      mihmCoreCoverage: synthesis.mihm.coreCoverage,
      fieldCoverage: projection.fit.coverage,
      worldConfidence: projection.world.confidence,
      evidenceIds: projection.evidenceIds,
      missingDimensions: projection.fit.missingDimensions,
    });

    let prediction: Awaited<ReturnType<typeof predictStudioFieldResponse>> | null = null;
    let predictionWarning: string | null = null;
    try {
      prediction = await predictStudioFieldResponse({
        objectId,
        projection,
        epistemicGate,
        ownerId: rootGate.ctx.user.id,
        createdBy: rootGate.ctx.user.id,
        persist: true,
      });
    } catch (error) {
      predictionWarning = error instanceof AmvEpistemicGateError
        ? `${error.code}:${error.gate.blockers.join(',')}`
        : `PREDICTIVE_ENGINE_UNAVAILABLE:${error instanceof Error ? error.message : String(error)}`;
    }

    if (themes.length) {
      const metadata = { ...record(objectResult.data.metadata), atlasThemes: themes };
      const update = await service.from('studio_objects').update({ metadata, updated_at: new Date().toISOString() }).eq('id', objectId);
      if (update.error) throw new Error(`studio_object_metadata_update_failed: ${update.error.message}`);
    }

    const selectedRoute = projection.strategy.routes.find((route) => route.id === projection.strategy.selectedRouteId) ?? null;
    const audit = await auditRootAction({
      actorId: rootGate.ctx.user.id,
      action: 'root.evaluator.run',
      target: objectId,
      payload: {
        objectId,
        objectClass: epistemicGate.objectClass,
        synthesisStatus: synthesis.status,
        mihmStatus: synthesis.mihm.status,
        projectionStatus: projection.status,
        fitScore: projection.fit.score,
        epistemicGate,
        predictionRunId: prediction?.id ?? null,
        predictionStatus: prediction?.status ?? epistemicGate.state,
        predictionWarning,
        themes,
      },
      request,
    });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });

    return NextResponse.json({
      ok: true,
      objectId,
      objectClass: epistemicGate.objectClass,
      epistemicGate,
      epistemicLabel: prediction ? 'PROVISIONAL_NO_HISTORICAL_CALIBRATION' : epistemicGate.epistemicLabel,
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
          classification: prediction
            ? 'PREDICTIVE_INTERVENTION_CANDIDATE'
            : 'STRUCTURAL_RECOMMENDATION_NOT_PREDICTIVE_INTERVENTION',
        } : null,
      },
      prediction: prediction ? {
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
        epistemicLabel: prediction.model.calibrationStatus === 'CALIBRATED'
          ? 'CALIBRATED'
          : 'PROVISIONAL_NO_HISTORICAL_CALIBRATION',
        missingEvidence: prediction.missingEvidence,
      } : null,
      warnings: predictionWarning ? [predictionWarning] : [],
      atlas: {
        objectId,
        themes,
        runId: prediction?.id ?? null,
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
