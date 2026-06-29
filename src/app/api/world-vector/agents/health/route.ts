import { NextResponse } from 'next/server';
import { getWorldVectorStatus, getWorldVectorToday } from '@/lib/world-vector/readModel';
import { readLatestWorldVectorReport } from '@/lib/world-vector/persistence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const [status, today, internalReport, externalReport] = await Promise.all([
    getWorldVectorStatus(),
    getWorldVectorToday(),
    readLatestWorldVectorReport({ reportType: 'internal_daily', targetAudience: 'founder' }),
    readLatestWorldVectorReport({ reportType: 'public_weekly', targetAudience: 'linkedin' }),
  ]);

  const blocked = [
    !status.pulse.latest_snapshot_available ? 'worldspect_snapshot_missing' : null,
    !status.memory.enabled ? status.memory.reason : null,
    today.observation.status === 'failed' ? 'world_vector_observation_failed' : null,
  ].filter((item): item is string => Boolean(item));

  return NextResponse.json({
    ok: blocked.length === 0,
    pulse: status.pulse,
    memory: status.memory,
    current_cycle_day: status.current_cycle_day,
    cycle_range: today.cycle_range,
    observation: {
      observed_at: today.observation.observed_at,
      sector: today.observation.sector,
      day_of_week: today.observation.day_of_week,
      status: today.observation.status,
      confidence: today.observation.confidence,
      dominant_signal: today.observation.dominant_signal,
      warnings: today.observation.warnings,
    },
    reports: {
      internal_daily: internalReport.ok ? Boolean(internalReport.data) : false,
      public_weekly: externalReport.ok ? Boolean(externalReport.data) : false,
    },
    blocked,
    warnings: status.warnings,
  });
}
