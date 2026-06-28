import { NextResponse } from 'next/server';
import { requireGovernedActor } from '@/lib/operational/common';
import { getWorldVectorToday } from '@/lib/world-vector/readModel';
import { buildWorldVectorCycleCloseReport } from '@/lib/world-vector/reportBuilder';
import { closeWorldVectorCycle } from '@/lib/world-vector/persistence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const gate = await requireGovernedActor('world_vector.close_cycle');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  if (!gate.ctx.isRoot) return NextResponse.json({ ok: false, error: 'root_required' }, { status: 403 });

  const url = new URL(request.url);
  const force = url.searchParams.get('force') === 'true';
  const today = await getWorldVectorToday();

  if (!today.cycle_day.isCycleClose && !force) {
    return NextResponse.json({
      ok: false,
      blocked: true,
      reason: 'cycle_close_not_allowed_before_sunday',
      current_cycle_day: today.cycle_day,
      action: 'Retry on Sunday/cycle_close or call with force=true as ROOT.',
    }, { status: 409 });
  }

  const report = buildWorldVectorCycleCloseReport({
    observation: today.observation,
    cycleRange: today.cycle_range,
  });
  const result = await closeWorldVectorCycle({
    cycleRange: today.cycle_range,
    report,
    observation: today.observation,
  });

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      blocked: true,
      reason: result.reason,
      details: result.details,
      report,
    }, { status: 200 });
  }

  return NextResponse.json({
    ok: true,
    mode: 'protected_root_action',
    result,
  });
}
