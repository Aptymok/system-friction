import { NextRequest, NextResponse } from 'next/server';
import { runWorldCalibrationCycle, runWorldObservationCycle } from '@/lib/world-observatory/worldCycle';
import { runWorldHypothesisCycle } from '@/lib/world-observatory/hypothesisCycle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function secret() {
  return process.env.SFI_CRON_SECRET || process.env.CRON_SECRET || '';
}

function authorized(request: NextRequest) {
  const configured = secret();
  if (!configured && process.env.NODE_ENV !== 'production') return true;
  return request.headers.get('authorization') === `Bearer ${configured}`;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const observation = await runWorldObservationCycle();
  const hypothesis = await runWorldHypothesisCycle();
  const calibration = await runWorldCalibrationCycle();
  return NextResponse.json({ ok: observation.ok && hypothesis.ok && calibration.ok, observation, hypothesis, calibration });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
