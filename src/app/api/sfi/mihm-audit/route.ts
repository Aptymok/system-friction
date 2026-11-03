import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { readMihmOperationalShadow } from '@/lib/mihm/operationalShadowRead';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** ROOT-only inspection: no synthetic observations, mutations or decisions. */
export async function GET() {
  const gate = await requireRootActor('mihm.audit.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const result = await readMihmOperationalShadow();
  return NextResponse.json({
    ...result,
    scope: 'LATEST_25',
    limitations: [
      'Post-decision batch observation is not a preregistered forecast.',
      'Independent outcomes and counterfactual policy superiority are not certified.',
      'Absence of events does not prove that operational processing failed.',
    ],
  }, {
    status: result.ok ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
