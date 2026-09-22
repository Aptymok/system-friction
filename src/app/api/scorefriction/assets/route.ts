import { NextResponse } from 'next/server';
import { getServerUserContext } from '@/lib/server/productionBackend';

const retired = {
  error: 'legacy_scorefriction_asset_plane_retired',
  message: 'The legacy ScoreFriction asset plane has been retired because its backing schema is absent. Use the current ScoreFriction state and observation surfaces.',
  canonical: '/api/scorefriction/state',
  canonicalWrite: '/api/scorefriction/observe',
  intake: '/api/scorefriction/intake',
};

export async function GET() {
  const ctx = await getServerUserContext();
  if (!ctx.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(retired, { status: 410 });
}

export async function POST() {
  const ctx = await getServerUserContext();
  if (!ctx.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(retired, { status: 410 });
}
