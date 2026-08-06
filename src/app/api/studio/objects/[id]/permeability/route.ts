import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { studioApiAccessError } from '@/lib/studio/production/studioApiAuth';
import { listStudioAudioFeaturesHistory } from '@/lib/studio/production/studioProductionRepository';
import { evaluatePermeability, type PermeabilityMetricPoint } from '@/lib/studio/production/permeabilityEngine';
import { recordObservationEvent } from '@/lib/root/telemetry/agentRegistry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const params = await Promise.resolve(ctx.params);
    const objectId = decodeURIComponent(params.id);

    const history = await listStudioAudioFeaturesHistory(objectId, user.id);
    if (!history.ok) return NextResponse.json(history, { status: history.status });

    const points: PermeabilityMetricPoint[] = history.data.map((row) => ({
      createdAt: String(row.created_at),
      rms: row.rms === null ? null : Number(row.rms),
      peak: row.peak === null ? null : Number(row.peak),
      clippingRisk: row.clipping_risk === null ? null : Number(row.clipping_risk),
      dynamicRange: row.dynamic_range === null ? null : Number(row.dynamic_range),
      lufs: row.lufs === null ? null : Number(row.lufs),
      spectralCentroid: row.spectral_centroid === null ? null : Number(row.spectral_centroid),
    }));

    const report = evaluatePermeability(points);

    recordObservationEvent({
      agentKey: 'studio_permeability_agent',
      signal: `Objeto ${objectId}: ${report.tendencia} (${report.edicionesAnalizadas} ediciones)`,
      confidence: null,
      linked: [{ type: 'studio_object', id: objectId }],
      evidenceUsed: points.slice(-2).map((point) => ({ type: 'audio_features', id: objectId, note: point.createdAt })),
      patternDetected: report.tendencia,
      proposedAction: report.causas.find((cause) => cause.direccion === 'empeoró')?.queHacer ?? null,
      awaitingAuthorization: false,
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, objectId, report }, { status: 200 });
  } catch (error) {
    return studioApiAccessError(error);
  }
}
