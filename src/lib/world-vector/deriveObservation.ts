import type { WorldSpectSnapshotRow } from '@/lib/worldspect/snapshotStore';
import type {
  WorldVectorCycleDay,
  WorldVectorDomainValue,
  WorldVectorDominantSource,
  WorldVectorObservation,
  WorldVectorObservationStatus,
} from './types';

type SourceRecord = Record<string, unknown>;

type DeriveObservationContext = {
  recentSampleCount?: number;
};

const THIN_SAMPLE_COUNT = 3;
const THIN_ACTIVE_SOURCE_COUNT = 3;

function asRecord(value: unknown): SourceRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as SourceRecord : {};
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown): number | null {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function domainForSource(source: SourceRecord): string {
  return stringValue(source.domain ?? source.mihm_var ?? source.vector, 'UNKNOWN').toUpperCase();
}

function sourceKey(source: SourceRecord, index: number): string {
  return stringValue(source.key ?? source.id ?? source.sourceId, `source_${index}`);
}

function sourceValue(source: SourceRecord): number | null {
  const signal = asRecord(source.signal);
  return numberValue(source.value ?? source.score ?? source.current_value ?? signal.value);
}

function sourceConfidence(source: SourceRecord): number | null {
  return numberValue(source.nti ?? source.weight ?? source.confidence ?? source.trust);
}

function isUsableSource(source: SourceRecord): boolean {
  return source.simulated !== true && !source.error && sourceValue(source) !== null;
}

function buildDomainValues(sources: SourceRecord[]): WorldVectorDomainValue[] {
  const groups = new Map<string, Array<{ value: number; confidence: number | null }>>();

  sources.filter(isUsableSource).forEach((source) => {
    const domain = domainForSource(source);
    const value = sourceValue(source);
    if (value === null) return;
    const entries = groups.get(domain) ?? [];
    entries.push({ value: clamp01(value), confidence: sourceConfidence(source) });
    groups.set(domain, entries);
  });

  return Array.from(groups.entries())
    .map(([domain, entries]) => {
      const value = entries.reduce((sum, item) => sum + item.value, 0) / Math.max(1, entries.length);
      const confidences = entries.map((item) => item.confidence).filter((item): item is number => item !== null);
      const confidence = confidences.length
        ? confidences.reduce((sum, item) => sum + clamp01(item), 0) / confidences.length
        : null;

      return {
        domain,
        value: Number(value.toFixed(4)),
        confidence: confidence === null ? null : Number(confidence.toFixed(4)),
        source_count: entries.length,
      };
    })
    .sort((a, b) => b.source_count - a.source_count || String(a.domain).localeCompare(String(b.domain)));
}

function buildDominantSources(sources: SourceRecord[]): WorldVectorDominantSource[] {
  return sources
    .map((source, index) => ({
      key: sourceKey(source, index),
      label: stringValue(source.label, sourceKey(source, index)),
      domain: domainForSource(source),
      value: sourceValue(source),
      confidence: sourceConfidence(source),
    }))
    .filter((source) => source.value !== null)
    .sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0))
    .slice(0, 5);
}

function statusFor(input: {
  snapshot: WorldSpectSnapshotRow | null;
  activeSourceCount: number;
  recentSampleCount: number;
}): WorldVectorObservationStatus {
  if (!input.snapshot) return 'failed';
  if (input.snapshot.degraded_sources.length > 0 || input.snapshot.source_state === 'degraded' || input.snapshot.adapter_status === 'degraded') {
    return 'degraded';
  }
  if (input.recentSampleCount < THIN_SAMPLE_COUNT || input.activeSourceCount < THIN_ACTIVE_SOURCE_COUNT || input.snapshot.confidence < 0.4) {
    return 'thin';
  }
  return 'observed';
}

function interpretationFor(input: {
  cycleDay: WorldVectorCycleDay;
  status: WorldVectorObservationStatus;
  dominantSignal: string | null;
}) {
  if (input.status === 'failed') {
    return `No hay snapshot WorldSpect disponible para interpretar el sector ${input.cycleDay.sectorLabel}.`;
  }

  const signal = input.dominantSignal ? ` Dominante actual: ${input.dominantSignal}.` : '';

  if (input.status === 'degraded') {
    return `Lectura degradada para ${input.cycleDay.sectorLabel}; usar como orientación, no como memoria longitudinal cerrada.${signal}`;
  }

  if (input.status === 'thin') {
    return `Lectura del sector ${input.cycleDay.sectorLabel} disponible pero delgada; no inferir persistencia todavía.${signal}`;
  }

  return `Lectura observada para ${input.cycleDay.sectorLabel}; puede orientar interpretación operativa sin reclamar continuidad persistente.${signal}`;
}

export function deriveWorldVectorObservation(
  snapshot: WorldSpectSnapshotRow | null,
  cycleDay: WorldVectorCycleDay,
  context: DeriveObservationContext = {},
): WorldVectorObservation {
  const sources = Array.isArray(snapshot?.sources)
    ? snapshot.sources.map((source) => asRecord(source))
    : [];
  const domainValues = buildDomainValues(sources);
  const dominantSources = buildDominantSources(sources);
  const recentSampleCount = Number.isFinite(context.recentSampleCount) ? Number(context.recentSampleCount) : 0;
  const activeSourceCount = sources.filter(isUsableSource).length;
  const status = statusFor({ snapshot, activeSourceCount, recentSampleCount });
  const dominantSignal = dominantSources[0]
    ? `${dominantSources[0].domain}:${dominantSources[0].label}`
    : null;
  const warnings: string[] = [];

  if (!snapshot) warnings.push('worldspect_snapshot_missing');
  if (snapshot && recentSampleCount < THIN_SAMPLE_COUNT) warnings.push('world_vector_history_thin');
  if (snapshot && activeSourceCount < THIN_ACTIVE_SOURCE_COUNT) warnings.push('world_vector_active_sources_thin');
  if (snapshot?.degraded_sources.length) warnings.push('worldspect_degraded_sources_present');
  if (snapshot?.adapter_error) warnings.push('worldspect_adapter_error_present');

  return {
    observed_at: snapshot?.observed_at ?? null,
    sector: cycleDay.sector,
    day_of_week: cycleDay.dayOfWeek,
    source_snapshot_id: snapshot?.id ?? null,
    domain_values: domainValues,
    dominant_sources: dominantSources,
    dominant_signal: dominantSignal,
    interpretation: interpretationFor({ cycleDay, status, dominantSignal }),
    confidence: snapshot ? clamp01(snapshot.confidence) : 0,
    status,
    warnings,
  };
}
