import { NextResponse } from 'next/server';
import { getRecentWorldSpectSnapshots } from '@/lib/worldspect/snapshotStore';
import { aggregateWorldSpect } from '@/lib/worldspect/vector-aggregator';
import { WORLDSPECT_DOMAINS, type WorldSpectDomain } from '@/lib/worldspect/vector-contract';
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

type VectorSample = DomainSample & {
  domain: WorldSpectDomain;
};

type ExtractionMethod = 'observations' | 'legacy_vectors' | 'persisted_sources' | 'empty';

type ExtractionResult = {
  method: ExtractionMethod;
  samples: VectorSample[];
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

function numberValue(value: unknown) {
  if (value === null || typeof value === 'undefined') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isWorldSpectDomain(value: unknown): value is WorldSpectDomain {
  return typeof value === 'string' && (WORLDSPECT_DOMAINS as readonly string[]).includes(value);
}

function normalizeDomain(value: unknown): WorldSpectDomain | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return isWorldSpectDomain(normalized) ? normalized : null;
}

function vectorRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function historicalVectorContainers(payload: Record<string, unknown>) {
  const snapshot = record(payload.snapshot);
  const data = record(payload.data);
  const state = record(payload.state);
  const worldspect = record(payload.worldspect);
  const vectorSnapshot = record(payload.vector_snapshot);

  return [
    payload.vectors,
    snapshot.vectors,
    data.vectors,
    state.vectors,
    worldspect.vectors,
    vectorSnapshot.vectors,
  ];
}

function samplesFromHistoricalVectors(row: { observed_at: string; raw_payload: unknown }): VectorSample[] {
  const payload = record(row.raw_payload);
  const vectors = historicalVectorContainers(payload).flatMap(vectorRows);

  return vectors
    .map((vector) => {
      const domain = normalizeDomain(vector.domain ?? vector.vector ?? vector.name);
      const value = numberValue(vector.value ?? vector.current_value ?? vector.score);
      if (!domain || value === null) return null;

      return {
        domain,
        observed_at: row.observed_at,
        value,
      };
    })
    .filter((sample): sample is VectorSample => sample !== null);
}

function samplesFromPersistedSources(row: { observed_at: string; sources?: unknown[] }): VectorSample[] {
  const byDomain = new Map<WorldSpectDomain, number[]>();

  for (const source of vectorRows(row.sources)) {
    const domain = normalizeDomain(source.domain);
    if (!domain) continue;

    const signal = record(source.signal);
    const value = numberValue(source.value ?? source.score ?? source.current_value ?? signal.value);
    if (value === null) continue;

    const values = byDomain.get(domain) ?? [];
    values.push(value);
    byDomain.set(domain, values);
  }

  return Array.from(byDomain.entries()).map(([domain, values]) => ({
    domain,
    observed_at: row.observed_at,
    value: values.reduce((sum, value) => sum + value, 0) / values.length,
  }));
}

function samplesFromSnapshot(row: { observed_at: string; raw_payload: unknown }): VectorSample[] {
  const observations = record(row.raw_payload).observations;
  if (!Array.isArray(observations) || observations.length === 0) return [];

  try {
    const snapshot = aggregateWorldSpect(observations as any[]);
    return snapshot.vectors
      .filter((vector) => vector.status === 'ACTIVE' && typeof vector.value === 'number' && Number.isFinite(vector.value))
      .map((vector): VectorSample => ({
        domain: vector.domain,
        observed_at: row.observed_at,
        value: vector.value as number,
      }));
  } catch {
    return [];
  }
}

function compatibleSamplesFromSnapshot(row: { observed_at: string; raw_payload: unknown; sources?: unknown[] }): ExtractionResult {
  const observationSamples = samplesFromSnapshot(row);
  if (observationSamples.length > 0) {
    return { method: 'observations', samples: observationSamples };
  }

  const legacyVectorSamples = samplesFromHistoricalVectors(row);
  if (legacyVectorSamples.length > 0) {
    return { method: 'legacy_vectors', samples: legacyVectorSamples };
  }

  const persistedSourceSamples = samplesFromPersistedSources(row);
  if (persistedSourceSamples.length > 0) {
    return { method: 'persisted_sources', samples: persistedSourceSamples };
  }

  return { method: 'empty', samples: [] };
}

export async function GET(request: Request) {
  const generatedAt = new Date().toISOString();
  const url = new URL(request.url);
  const days = numberParam(url.searchParams.get('days'), 90);
  const ingestMode = ingestModeParam(url.searchParams.get('ingest_mode'));
  const debug = url.searchParams.get('debug') === '1';

  try {
    const snapshots = await getRecentWorldSpectSnapshots({
      days,
      ingestMode,
      limit: 120,
    });

    const domainSamples = new Map<string, DomainSample[]>(
      WORLDSPECT_DOMAINS.map((domain) => [domain, []]),
    );
    const extractionCounts = {
      observations_samples: 0,
      legacy_vector_samples: 0,
      persisted_source_samples: 0,
      empty_snapshots: 0,
    };

    for (const snapshot of snapshots) {
      const extracted = compatibleSamplesFromSnapshot(snapshot);
      if (extracted.method === 'observations') extractionCounts.observations_samples += extracted.samples.length;
      if (extracted.method === 'legacy_vectors') extractionCounts.legacy_vector_samples += extracted.samples.length;
      if (extracted.method === 'persisted_sources') extractionCounts.persisted_source_samples += extracted.samples.length;
      if (extracted.method === 'empty') extractionCounts.empty_snapshots += 1;

      for (const sample of extracted.samples) {
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

    const response = {
      ok: snapshots.length > 0,
      source: 'worldspect_trend',
      generated_at: generatedAt,
      days,
      sample_count: snapshots.length,
      observed_from: snapshots[0]?.observed_at ?? null,
      observed_to: snapshots[snapshots.length - 1]?.observed_at ?? null,
      trend_quality: trendQuality(snapshots.length),
      domains,
      ...(debug ? { debug: extractionCounts } : {}),
    };

    return NextResponse.json(response, {
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
