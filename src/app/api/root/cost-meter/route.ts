import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { readSfiCostMeter } from '@/lib/operations/sfiCostMeter';
import { assessSfiResourcePosture } from '@/lib/operations/resourceSelfObservation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// One bounded, authenticated, on-demand query only. No polling or mutation.
export async function GET() {
  const gate = await requireRootActor('root.cognitive-runtime.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const meter = await readSfiCostMeter().catch(() => ({
    ok: false as const,
    reason: 'PRIMARY_COST_METER_UNAVAILABLE',
    boundary: 'UNAVAILABLE_IS_NOT_ZERO',
  }));
  return NextResponse.json({ ...meter, resourcePosture: assessSfiResourcePosture({ meter }) }, {
    status: meter.ok ? 200 : 503,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
