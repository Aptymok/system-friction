import { NextResponse } from 'next/server';

import {
  listStudioAudioFeaturesHistory,
} from '@/lib/studio/production/studioProductionRepository';

import {
  evaluatePermeability,
  type PermeabilityMetricPoint,
} from '@/lib/studio/production/permeabilityEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_request: Request, ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  const objectId = decodeURIComponent(params.id);

  const history = await listStudioAudioFeaturesHistory(objectId);
  if (!history.ok) {
    return NextResponse.json(history, { status: history.status });
  }

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

  return NextResponse.json({ ok: true, objectId, report }, { status: 200 });
}
