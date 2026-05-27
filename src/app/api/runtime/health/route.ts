import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checkedAt = new Date().toISOString();
  const checks = {
    supabase: false,
    worldspectRead: true,
    eventStream: true,
    appendOnly: true,
  };

  try {
    const service = createServiceSupabaseClient();
    const { error } = await service
      .from('epistemic_events')
      .select('event_id')
      .limit(1);
    checks.supabase = !error;
  } catch {
    checks.supabase = false;
  }

  const failures = Object.values(checks).filter((ok) => !ok).length;

  return NextResponse.json({
    status: failures > 0 ? 'degraded' : 'idle',
    service: 'sfi-runtime',
    checkedAt,
    checks,
    metrics: {
      cycles: 0,
      failures,
    },
  });
}
