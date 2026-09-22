import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

const WINDOW_LIMIT = 120;

function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function sourceState(status: string | null) {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'observed') return 'OBSERVED';
  if (normalized === 'thin') return 'THIN';
  if (normalized === 'degraded' || normalized === 'failed') return 'DEGRADED';
  return 'MISSING';
}

function aggregateSourceState(rows: Array<{ source_status?: unknown }>) {
  const states = rows.map((row) => sourceState(
    typeof row.source_status === 'string' ? row.source_status : null,
  ));

  if (states.some((state) => state === 'MISSING')) return 'MISSING';
  if (states.some((state) => state === 'DEGRADED')) return 'DEGRADED';
  if (states.some((state) => state === 'THIN')) return 'THIN';
  return states.length ? 'OBSERVED' : 'MISSING';
}

export async function GET() {
  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('sfi_indicator_snapshots')
    .select('captured_at,ihg,source_status')
    .not('ihg', 'is', null)
    .order('captured_at', { ascending: false })
    .limit(WINDOW_LIMIT);

  if (error) {
    return NextResponse.json({
      error: 'global_metrics_read_failed',
      source: 'sfi_indicator_snapshots',
      detail: error.message,
    }, { status: 500 });
  }

  const rows = Array.isArray(data) ? data : [];
  const ihgs = rows
    .map((row) => finite(row.ihg))
    .filter((value): value is number => value !== null);

  const latest = rows[0] ?? null;
  const latestSourceStatus = typeof latest?.source_status === 'string' ? latest.source_status : null;
  const observedAt = typeof latest?.captured_at === 'string' ? latest.captured_at : null;

  if (ihgs.length === 0) {
    return NextResponse.json({
      globalAverageIHG: 0,
      globalVolatility: 0,
      totalAudits: 0,
      totalReadings: 0,
      sampleSize: 0,
      source: 'sfi_indicator_snapshots',
      sourceStatus: latestSourceStatus ?? 'missing',
      sourceState: 'MISSING',
      evidenceLevel: 'none',
      lastUpdated: observedAt,
      generatedAt: new Date().toISOString(),
      windowLimit: WINDOW_LIMIT,
    });
  }

  const avgIHG = ihgs.reduce((sum, value) => sum + value, 0) / ihgs.length;
  const variance = ihgs.reduce((sum, value) => sum + Math.pow(value - avgIHG, 2), 0) / ihgs.length;
  const state = aggregateSourceState(rows);

  return NextResponse.json({
    globalAverageIHG: avgIHG,
    globalVolatility: Math.sqrt(variance),
    totalAudits: ihgs.length,
    totalReadings: ihgs.length,
    sampleSize: ihgs.length,
    source: 'sfi_indicator_snapshots',
    sourceStatus: latestSourceStatus ?? 'unknown',
    sourceState: state,
    evidenceLevel: state === 'OBSERVED' ? 'derived_from_observed_snapshots' : 'derived_degraded',
    lastUpdated: observedAt,
    generatedAt: new Date().toISOString(),
    windowLimit: WINDOW_LIMIT,
  });
}
