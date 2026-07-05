import { NextResponse } from 'next/server';
import { getStudioObjectFeatures, recordStudioAnalysisBlocked } from '@/lib/studio/production/studioProductionRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function POST(_request: Request, ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  const objectId = decodeURIComponent(params.id);
  const features = await getStudioObjectFeatures(objectId);
  if (!features.ok) return NextResponse.json(features, { status: features.status });
  if (!features.data.features.length) {
    const result = await recordStudioAnalysisBlocked(objectId, 'feature_extractors_not_connected');
    return NextResponse.json({
      ok: false,
      status: 'blocked',
      reason: 'feature_extractors_not_connected',
      job: result.ok ? result.data : null,
      degraded: result.ok ? [] : [result.error],
    }, { status: 202 });
  }
  return NextResponse.json({ ok: true, status: 'complete', object: features.data.object, features: features.data.features });
}
