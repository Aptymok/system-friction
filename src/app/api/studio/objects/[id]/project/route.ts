import { NextResponse } from 'next/server';
import { readExternalEvidenceVector } from '@/lib/amv/externalEvidence';
import { buildAmvPredictionGate, AmvEpistemicGateError } from '@/lib/amv/epistemicGate';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import {
  getPersistedStudioFieldProjection,
  projectStudioObjectField,
} from '@/lib/studio/production/objectFieldProjection';
import { predictStudioFieldResponse } from '@/lib/predictive-engine/adapters/studio';
import { getLatestPredictiveRun } from '@/lib/predictive-engine/service';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

function objectIdFrom(ctx: RouteContext) {
  return Promise.resolve(ctx.params).then((params) => decodeURIComponent(params.id));
}

export async function GET(_request: Request, ctx: RouteContext) {
  const objectId = await objectIdFrom(ctx);
  try {
    await requireObjectOwner(objectId);
    const [projection, predictiveRun] = await Promise.all([
      getPersistedStudioFieldProjection(objectId),
      getLatestPredictiveRun('studio', 'studio_object', objectId).catch(() => null),
    ]);
    if (!projection) {
      return NextResponse.json({ ok: false, error: 'PROJECTION_NOT_FOUND', details: 'No persisted field projection exists.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, projection, predictiveRun });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'PROJECTION_READ_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request, ctx: RouteContext) {
  const objectId = await objectIdFrom(ctx);
  try {
    const access = await requireObjectOwner(objectId);
    const body = await request.json().catch(() => ({})) as { persist?: unknown };
    const persist = body.persist !== false;
    const projection = await projectStudioObjectField(objectId, { persist });
    const service = createServiceSupabaseClient();
    const objectResult = await service.from('studio_objects').select('id,object_type,metadata').eq('id', objectId).maybeSingle();
    if (objectResult.error || !objectResult.data) throw new Error(objectResult.error?.message ?? 'STUDIO_OBJECT_NOT_FOUND');
    const externalEvidence = await readExternalEvidenceVector({ objectId, objectClass: objectResult.data.object_type });

    const epistemicGate = buildAmvPredictionGate({
      objectType: objectResult.data.object_type,
      metadata: objectResult.data.metadata,
      mihmStatus: projection.object.mihmStatus,
      mihmCoreCoverage: projection.object.mihmCoreCoverage,
      fieldCoverage: projection.fit.coverage,
      worldConfidence: projection.world.confidence,
      evidenceIds: projection.evidenceIds,
      missingDimensions: projection.fit.missingDimensions,
      externalEvidenceCount: externalEvidence.observations.length,
      externalEvidenceCoverage: externalEvidence.coverage,
      missingExternalKeys: externalEvidence.missingKeys,
    });

    let predictiveRun = null;
    const warnings: string[] = [];
    try {
      predictiveRun = await predictStudioFieldResponse({
        objectId,
        projection,
        epistemicGate,
        ownerId: access.user.id,
        createdBy: access.user.id,
        persist,
      });
    } catch (error) {
      if (error instanceof AmvEpistemicGateError) warnings.push(`${error.code}:${error.gate.blockers.join(',')}`);
      else warnings.push(`PREDICTIVE_ENGINE_UNAVAILABLE:${error instanceof Error ? error.message : String(error)}`);
    }
    return NextResponse.json({
      ok: true,
      status: projection.status,
      projection,
      externalEvidence,
      epistemicGate,
      predictiveRun,
      epistemicLabel: predictiveRun ? 'PROVISIONAL_NO_HISTORICAL_CALIBRATION' : epistemicGate.epistemicLabel,
      warnings,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'PROJECTION_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
