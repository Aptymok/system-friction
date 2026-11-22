import { NextResponse } from 'next/server';
import { requireRootViewer } from '@/lib/root/server';
import { buildScoreFrictionScopeState } from '@/lib/amv/scopes/scorefriction/scorefrictionStateConnector';
import { publicAmvStateProjection } from '@/lib/amv/core/publicAmvStateProjection';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireRootViewer('root.scorefriction.state.read').catch(() => null);
  const state = await buildScoreFrictionScopeState();
  return NextResponse.json(gate?.ok === true ? state : publicAmvStateProjection(state), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
