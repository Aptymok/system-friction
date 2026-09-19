import 'server-only';

import type { WorldSpectIngestMode } from '../../../packages/api-contracts/src';
import { aggregateWorldSpect } from './vector-aggregator';
import { WORLDSPECT_DOMAINS, type WorldSpectDomain } from './vector-contract';
import {
  getRecentWorldSpectSnapshotsRead,
  snapshotRowToApiData,
  type WorldSpectSnapshotRow,
} from './snapshotStore';

type RecentWorldSpectIngestMode = WorldSpectIngestMode | 'all';
type TrendDirection = 'rising' | 'falling' | 'stable' | 'unknown';
type TrendQuality = 'missing' | 'thin' | 'usable';
type DomainTrendStatus = 'missing' | 'thin' | 'usable';
type DomainSample = { observed_at: string; value: number };
type VectorSample = DomainSample & { domain: WorldSpectDomain };
type ExtractionMethod = 'observations' | 'legacy_vectors' | 'persisted_sources' | 'empty';
type ExtractionResult = { method: ExtractionMethod; samples: VectorSample[] };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
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
  return [payload.vectors, snapshot.vectors, data.vectors, state.vectors, worldspect.vectors, vectorSnapshot.vectors];
}

function samplesFromHistoricalVectors(row: WorldSpectSnapshotRow): VectorSample[] {
  const payload = record(row.raw_payload);
  const vectors = historicalVectorContainers(payload).flatMap(vectorRows);
  return vectors
    .map((vector) => {
      const domain = normalizeDomain(vector.domain ?? vector.vector ?? vector.name);
      const value = numberValue(vector.value ?? vector.current_value ?? vector.score);
      return domain && value !== null ? { domain, observed_at: row.observed_at, value } : null;
    })
    .filter((sample): sample is VectorSample => sample !== null);
}

function samplesFromPersistedSources(row: WorldSpectSnapshotRow): VectorSample[] {
  const byDomain = new Map<WorldSpectDomain, number[]>();
  for (const source of vectorRows(row.sources)) {
    const domain = normalizeDomain(source.domain ?? source.mihm_var);
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

function samplesFromSnapshot(row: WorldSpectSnapshotRow): VectorSample[] {
  const observations = record(row.raw_payload).observations;
  if (!Array.isArray(observations) || observations.length === 0) return [];
  try {
    const snapshot = aggregateWorldSpect(observations as any[]);
    return snapshot.vectors
      .filter((vector) => vector.status === 'ACTIVE' && typeof vector.value === 'number' && Number.isFinite(vector.value))
      .map((vector): VectorSample => ({ domain: vector.domain, observed_at: row.observed_at, value: vector.value as number }));
  } catch {
    return [];
  }
}

function compatibleSamplesFromSnapshot(row: WorldSpectSnapshotRow): ExtractionResult {
  const observationSamples = samplesFromSnapshot(row);
  if (observationSamples.length > 0) return { method: 'observations', samples: observationSamples };
  const legacyVectorSamples = samplesFromHistoricalVectors(row);
  if (legacyVectorSamples.length > 0) return { method: 'legacy_vectors', samples: legacyVectorSamples };
  const persistedSourceSamples = samplesFromPersistedSources(row);
  if (persistedSourceSamples.length > 0) return { method: 'persisted_sources', samples: persistedSourceSamples };
  return { method: 'empty', samples: [] };
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
  return days === null ? null : (current.value - previous.value) / days;
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

function activeSourceCount(sources: unknown[]) {
  return sources.filter((source) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return false;
    const value = source as Record<string, unknown>;
    const status = String(value.status ?? value.sourceState ?? value.state ?? '').toLowerCase();
    return status === '' || status === 'active' || status === 'observed' || status === 'healthy';
  }).length;
}

export type WorldSpectReadBundle = {
  ok: boolean;
  generated_at: string;
  days: number;
  ingest_mode: RecentWorldSpectIngestMode;
  sample_count: number;
  observed_from: string | null;
  observed_to: string | null;
  read_plane: 'SUPABASE' | 'NEON' | 'UNAVAILABLE';
  primary_diagnostic: string | null;
  read_cache: Record<string, unknown>;
  health: {
    observed_ats: string[];
    empty_snapshots: number;
    active_sources: number;
    total_sources: number;
    source_coverage: number;
    degraded_sources: string[];
    latest_error: string | null;
    trend_quality: TrendQuality;
  };
  trend: {
    domains: Array<{
      domain: WorldSpectDomain;
      sample_count: number;
      current_value: number | null;
      previous_value: number | null;
      delta: number | null;
      velocity_per_day: number | null;
      acceleration_per_day: number | null;
      direction: TrendDirection;
      status: DomainTrendStatus;
    }>;
    extraction_counts: {
      observations_samples: number;
      legacy_vector_samples: number;
      persisted_source_samples: number;
      empty_snapshots: number;
    };
  };
  latest: ReturnType<typeof snapshotRowToApiData> | null;
};

export async function loadWorldSpectReadBundle(input: {
  days: number;
  ingestMode: RecentWorldSpectIngestMode;
  limit: number;
}): Promise<WorldSpectReadBundle> {
  const generatedAt = new Date().toISOString();
  const snapshotRead = await getRecentWorldSpectSnapshotsRead({
    days: input.days,
    ingestMode: input.ingestMode,
    limit: input.limit,
  });
  const snapshots = snapshotRead.data;
  const latest = snapshots[snapshots.length - 1] ?? null;
  const domainSamples = new Map<WorldSpectDomain, DomainSample[]>(
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
      rows.push({ observed_at: sample.observed_at, value: sample.value });
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

  const latestSources = latest && Array.isArray(latest.sources) ? latest.sources : [];
  const activeSources = activeSourceCount(latestSources);

  return {
    ok: snapshots.length > 0,
    generated_at: generatedAt,
    days: input.days,
    ingest_mode: input.ingestMode,
    sample_count: snapshots.length,
    observed_from: snapshots[0]?.observed_at ?? null,
    observed_to: snapshots[snapshots.length - 1]?.observed_at ?? null,
    read_plane: snapshotRead.readPlane,
    primary_diagnostic: snapshotRead.primaryDiagnostic,
    read_cache: snapshotRead.cache,
    health: {
      observed_ats: snapshots.map((snapshot) => snapshot.observed_at),
      empty_snapshots: snapshots.filter((snapshot) => !Array.isArray(snapshot.sources) || snapshot.sources.length === 0).length,
      active_sources: activeSources,
      total_sources: latestSources.length,
      source_coverage: latestSources.length > 0 ? Number((activeSources / latestSources.length).toFixed(4)) : 0,
      degraded_sources: latest?.degraded_sources ?? [],
      latest_error: latest?.adapter_error ?? null,
      trend_quality: trendQuality(snapshots.length),
    },
    trend: {
      domains,
      extraction_counts: extractionCounts,
    },
    latest: latest ? snapshotRowToApiData(latest) : null,
  };
}
