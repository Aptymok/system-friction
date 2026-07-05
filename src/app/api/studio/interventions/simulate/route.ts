import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!body?.objectId && !body?.hypothesisId) {
    return NextResponse.json({ ok: false, error: 'object_or_hypothesis_required' }, { status: 400 });
  }
  return NextResponse.json({
    ok: false,
    status: 'blocked',
    reason: 'simulation_engine_not_connected',
    limits: ['No simulated impact is returned as real. Connect the Studio simulation engine before applying interventions.'],
  }, { status: 202 });
}
