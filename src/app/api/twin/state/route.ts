import { NextResponse } from 'next/server';
import { readTwinSelfObservation } from '@/lib/operational/twinState';
import { buildRootScopeOverview } from '@/lib/root/rootScopeOverview';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [state, amvScopes] = await Promise.all([
    readTwinSelfObservation(),
    buildRootScopeOverview(),
  ]);

  return NextResponse.json({ ok: true, data: { ...state, amvScopes } });
}
