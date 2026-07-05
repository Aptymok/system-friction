import 'server-only';
import { getWorldVectorToday } from '@/lib/world-vector/readModel';
import { getRecentWorldSpectSnapshots, type WorldSpectSnapshotRow } from '@/lib/worldspect/snapshotStore';
import { aggregateWorldSpect } from '@/lib/worldspect/vector-aggregator';
import type { SourceObservation } from '@/lib/worldspect/source-adapter-contract';
import type { StudioCulturalDomain, StudioCulturalLens, StudioCulturalTrend } from './hypothesisEngine';

const RELEVANT_DOMAINS = ['CULTURAL', 'MEMETIC', 'AFFECTIVE'];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function observationsFromSnapshot(snapshot: WorldSpectSnapshotRow): SourceObservation[] {
  const observations = asRecord(snapshot.raw_payload).observations;
  return Array.isArray(observations) ? observations as SourceObservation[] : [];
}

function domainValueFromSnapshot(snapshot: WorldSpectSnapshotRow, domain: string): number | null {
  try {
    const observations = observationsFromSnapshot(snapshot);
    if (!observations.length) return null;
    const aggregated = aggregateWorldSpect(observations);
    const vector = aggregated.vectors.find((item) => item.domain.toUpperCase() === domain && item.status === 'ACTIVE' && typeof item.value === 'number');
    return vector ? Number(vector.value) : null;
  } catch {
    return null;
  }
}

/** Regresión lineal simple sobre puntos reales (t, value). No inventa datos: si hay menos de 3 puntos válidos, no hay tendencia (sampleCount refleja esto y el motor de hipótesis lo respeta). */
function linearSlope(points: Array<{ t: number; value: number }>): number {
  const n = points.length;
  const sumT = points.reduce((sum, p) => sum + p.t, 0);
  const sumV = points.reduce((sum, p) => sum + p.value, 0);
  const sumTT = points.reduce((sum, p) => sum + p.t * p.t, 0);
  const sumTV = points.reduce((sum, p) => sum + p.t * p.value, 0);
  const denominator = n * sumTT - sumT * sumT;
  if (denominator === 0) return 0;
  return Number(((n * sumTV - sumT * sumV) / denominator).toFixed(5));
}

function buildTrends(snapshots: WorldSpectSnapshotRow[]): StudioCulturalTrend[] {
  const sorted = [...snapshots].sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime());
  return RELEVANT_DOMAINS.map((domain) => {
    const points = sorted
      .map((snapshot, index) => ({ t: index, value: domainValueFromSnapshot(snapshot, domain) }))
      .filter((point): point is { t: number; value: number } => point.value !== null);
    if (points.length < 3) return { domain, direction: 'stable' as const, slope: 0, sampleCount: points.length };
    const slope = linearSlope(points);
    const direction = slope > 0.01 ? 'rising' as const : slope < -0.01 ? 'falling' as const : 'stable' as const;
    return { domain, direction, slope, sampleCount: points.length };
  });
}

export async function buildStudioCulturalLens(): Promise<StudioCulturalLens> {
  const [today, recent] = await Promise.all([
    getWorldVectorToday(),
    getRecentWorldSpectSnapshots({ days: 90, ingestMode: 'all', limit: 120 }),
  ]);

  const observation = today.observation;
  const domainValues: StudioCulturalDomain[] = observation.domain_values
    .filter((item) => RELEVANT_DOMAINS.includes(item.domain))
    .map((item) => ({ domain: item.domain, value: item.value ?? 0, confidence: item.confidence, sourceCount: item.source_count }));

  const trends = buildTrends(recent);
  const hasAnyRealSignal = domainValues.length > 0 || trends.some((t) => t.sampleCount >= 3);

  return {
    dataClass: observation.status === 'failed' && !hasAnyRealSignal ? 'gated' : observation.status === 'observed' ? 'real' : 'derived',
    observedAt: observation.observed_at,
    status: observation.status,
    confidence: observation.confidence,
    dominantSignal: observation.dominant_signal,
    interpretation: observation.interpretation,
    domainValues,
    trends,
    warnings: observation.warnings,
  };
}