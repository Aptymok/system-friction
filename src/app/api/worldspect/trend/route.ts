import { NextResponse } from 'next/server';
import { getRecentWorldSpectSnapshots } from '@/lib/worldspect/snapshotStore';
import { aggregateWorldSpect } from '@/lib/worldspect/vector-aggregator';
import { WORLDSPECT_DOMAINS } from '@/lib/worldspect/vector-contract';
import type { WorldSpectIngestMode } from '../../../../../packages/api-contracts/src';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TrendQuality = 'missing' | 'thin' | 'usable';
type TrendDirection = 'rising' | 'falling' | 'stable' | 'unknown';
type DomainTrendStatus = 'missing' | 'thin' | 'usable';

type DomainSample = {
  observed_at: string;
  value: number;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : fallback;
}

function ingestModeParam(value: string | null): WorldSpectIngestMode | 'all' {
  if (
    value === 'daily_cron'
    || value === 'manual'
    || value === 'diagnostic'
    || value === 'fallback_runtime'
  ) {
    return value;
  }

  return 'all';
}

function trendQuality(sampleCount: number): TrendQuality {
  if (sampleCount === 0) return 'missing';
  if (sampleCount < 3) return 'thin';
  return 'usable';
}

function domainStatus(sampleCount: number): DomainTrendStatus {
  if (sampleCount === 0) return 'missing';
  if (sampleCount < 3) return 'thin';
  return 'usable';
}

function elapsedDays(from: string, to: string) {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const elapsed = (end - start) / 86400000;
  return elapsed > 0 ? elapsed : null;
}

function velocityPerDay(previous: DomainSample, current: DomainSample) {
  const days = elapsedDays(previous.observed_at, current.observed_at);
  if (days === null) return null;
  return (current.value - previous.value) / days;
}

function directionFromVelocity(velocity: number | null): TrendDirection {
  if (velocity === null) return 'unknown';
  if (velocity > 0.02) return 'rising';
  if (velocity < -0.02) return 'falling';
  return 'stable';
}

function roundTrendValue(value: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(6)) : null;
}

function samplesFromSnapshot(row: { observed_at: string; raw_payload: unknown }) {
  const observations = record(row.raw_payload).observations;
  if (!Array.isArray(observations) || observations.length === 0) return [];

  try {
    const snapshot = aggregateWorldSpect(observations as any[]);
    return snapshot.vectors
      .filter((vector) => vector.status === 'ACTIVE' && typeof vector.value === 'number' && Number.isFinite(vector.value))
      .map((vector) => ({
        domain: vector.domain,
        observed_at: row.observed_at,
        value: vector.value as number,
      }));
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const generatedAt = new Date().toISOString();
  const url = new URL(request.url);
  const days = numberParam(url.searchParams.get('days'), 90);
  const ingestMode = ingestModeParam(url.searchParams.get('ingest_mode'));

  try {
    const snapshots = await getRecentWorldSpectSnapshots({
      days,
      ingestMode,
      limit: 120,
    });

    const domainSamples = new Map<string, DomainSample[]>(
      WORLDSPECT_DOMAINS.map((domain) => [domain, []]),
    );

    for (const snapshot of snapshots) {
      for (const sample of samplesFromSnapshot(snapshot)) {
        const rows = domainSamples.get(sample.domain) ?? [];
        rows.push({
          observed_at: sample.observed_at,
          value: sample.value,
        });
        domainSamples.set(sample.domain, rows);
      }
    }

    const domains = WORLDSPECT_DOMAINS.map((domain) => {
      const samples = [...(domainSamples.get(domain) ?? [])]
        .sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime());
      const current = samples[samples.length - 1] ?? null;
      const previous = samples[samples.length - 2] ?? null;
      const beforePrevious = samples[samples.length - 3] ?? null;
      const delta = current && previous ? current.value - previous.value : null;
      const velocity = current && previous ? velocityPerDay(previous, current) : null;
      const previousVelocity = previous && beforePrevious ? velocityPerDay(beforePrevious, previous) : null;
      const acceleration = velocity !== null && previousVelocity !== null ? velocity - previousVelocity : null;

      return {
        domain,
        sample_count: samples.length,
        current_value: roundTrendValue(current?.value ?? null),
        previous_value: roundTrendValue(previous?.value ?? null),
        delta: roundTrendValue(delta),
        velocity_per_day: roundTrendValue(velocity),
        acceleration_per_day: roundTrendValue(acceleration),
        direction: directionFromVelocity(velocity),
        status: domainStatus(samples.length),
      };
    });

    return NextResponse.json({
      ok: snapshots.length > 0,
      source: 'worldspect_trend',
      generated_at: generatedAt,
      days,
      sample_count: snapshots.length,
      observed_from: snapshots[0]?.observed_at ?? null,
      observed_to: snapshots[snapshots.length - 1]?.observed_at ?? null,
      trend_quality: trendQuality(snapshots.length),
      domains,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      source: 'worldspect_trend',
      generated_at: generatedAt,
      days,
      sample_count: 0,
      observed_from: null,
      observed_to: null,
      trend_quality: 'missing',
      domains: WORLDSPECT_DOMAINS.map((domain) => ({
        domain,
        sample_count: 0,
        current_value: null,
        previous_value: null,
        delta: null,
        velocity_per_day: null,
        acceleration_per_day: null,
        direction: 'unknown',
        status: 'missing',
      })),
      error: error instanceof Error ? error.message : 'worldspect_trend_failed',
    }, { status: 200 });
  }
}
