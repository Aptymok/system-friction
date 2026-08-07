import { NextRequest, NextResponse } from 'next/server';
import { runWorldCalibrationCycle, runWorldObservationCycle } from '@/lib/world-observatory/worldCycle';
import { runWorldHypothesisCycle } from '@/lib/world-observatory/hypothesisCycle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function secret() {
  return process.env.SFI_CRON_SECRET
    || process.env.WORLDSPECT_INGEST_SECRET
    || process.env.CRON_SECRET
    || '';
}

function authorized(request: NextRequest) {
  const configured = secret();
  if (!configured && process.env.NODE_ENV !== 'production') return true;
  if (!configured) return false;
  return request.headers.get('authorization') === `Bearer ${configured}`;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const startedAt = new Date().toISOString();
  const observation = await runWorldObservationCycle();
  const hypothesis = await runWorldHypothesisCycle();
  const calibration = await runWorldCalibrationCycle();
  const ok = observation.ok && hypothesis.ok && calibration.ok;

  return NextResponse.json({
    ok,
    startedAt,
    completedAt: new Date().toISOString(),
    observation,
    hypothesis,
    calibration,
    freshness: {
      observed: observation.observed,
      persisted: observation.persisted,
      collectorFailures: observation.failures.length,
    },
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
