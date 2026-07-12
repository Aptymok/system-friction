import { NextResponse } from 'next/server';
import { AccessDeniedError, requireFounder } from '@/lib/system/access/server';
import { getPredictiveEngineHealth } from '@/lib/predictive-engine/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireFounder();
    const health = await getPredictiveEngineHealth();
    return NextResponse.json({ ok: health.ok, health }, { status: health.ok ? 200 : 503 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'PREDICTIVE_HEALTH_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
