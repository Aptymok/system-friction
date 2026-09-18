import { NextRequest, NextResponse } from 'next/server';
import { runTemporalIssueRoutine } from '@/lib/publications/temporalIssueRoutine';
import { scheduledEgressGuardResponse } from '@/lib/continuity/scheduledEgressGuard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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
  const egressGuard = scheduledEgressGuardResponse();
  if (egressGuard) return egressGuard;

  try {
    const result = await runTemporalIssueRoutine();
    return NextResponse.json(result, {
      status: result.ok ? 200 : 207,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'notas_temporales_monthly_routine_failed',
      details: error instanceof Error ? error.message : String(error),
      writesPerformed: false,
      boundary: 'Failure does not authorize retry through an alternate publication writer or canonical mutation path.',
    }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
