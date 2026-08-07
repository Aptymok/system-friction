import { NextRequest, NextResponse } from 'next/server';
import { runInstitutionalCycle } from '@/lib/institution/institutionalCycle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function cronSecret() {
  return process.env.SFI_CRON_SECRET || process.env.WORLDSPECT_INGEST_SECRET || process.env.CRON_SECRET || '';
}

function authorized(request: NextRequest) {
  const configured = cronSecret();
  if (!configured && process.env.NODE_ENV !== 'production') return true;
  if (!configured) return false;
  return request.headers.get('authorization') === `Bearer ${configured}`;
}

/**
 * Legacy compatibility route. It no longer creates synthetic evidence.
 * A call executes the same evidence-backed institutional cycle used by the scheduler.
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const result = await runInstitutionalCycle('legacy_smoketest_route_real_evidence');
  return NextResponse.json({ ...result, compatibilityRoute: true, syntheticEvidence: false }, { status: result.ok ? 200 : 207 });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
