import { NextResponse } from 'next/server';
import { getServerUserContext } from '@/lib/server/productionBackend';

export async function POST(_request: Request, { params }: { params: Promise<{ asset_id: string }> }) {
  const ctx = await getServerUserContext();
  if (!ctx.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { asset_id: assetId } = await params;
  return NextResponse.json({
    error: 'legacy_scorefriction_asset_measurement_retired',
    message: 'Legacy asset measurements are retired with the absent asset schema. Record current ScoreFriction observations through the canonical observation route.',
    assetId,
    canonicalRead: '/api/scorefriction/state',
    canonicalWrite: '/api/scorefriction/observe',
    intake: '/api/scorefriction/intake',
  }, { status: 410 });
}
