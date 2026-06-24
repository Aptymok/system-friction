import type {
  WorldSpectFieldStateSignal,
  WorldSpectResponse,
  WorldSpectSource,
  WorldSpectSourceHealth,
  WorldSpectSourceHealthStatus,
  WorldSpectSourceState,
} from '../../../packages/api-contracts/src';

export type WorldSpectCanonicalPayload = {
  sources: WorldSpectSource[];
  wsi: number | null;
  nti: number | null;
  ts: string;
  degraded_sources: string[];
  source_health?: unknown;
  field_state_signal?: unknown;
  adapter_error?: unknown;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function finiteNumberOrNull(value: unknown) {
  if (value === null || typeof value === 'undefined') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toWorldSpectSources(value: unknown): WorldSpectSource[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((source) => ({
      key: typeof source.key === 'string' && source.key.length > 0 ? source.key : 'unknown_source',
      label: typeof source.label === 'string' ? source.label : undefined,
      value: finiteNumberOrNull(source.value),
      raw: source.raw,
      unit: typeof source.unit === 'string' ? source.unit : undefined,
      nti: finiteNumberOrNull(source.nti) ?? undefined,
      nti_base: finiteNumberOrNull(source.nti_base) ?? undefined,
      weight: finiteNumberOrNull(source.weight) ?? undefined,
      mihm_var: typeof source.mihm_var === 'string' ? source.mihm_var : undefined,
      simulated: source.simulated === true,
      ts: typeof source.ts === 'string' ? source.ts : undefined,
      error: typeof source.error === 'string' ? source.error : undefined,
    }));
}

export function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function isRealSource(source: WorldSpectSource) {
  return source.value !== null && source.simulated !== true && !source.error;
}

export function deriveWorldSpectSourceHealth(
  sources: WorldSpectSource[],
  degradedSources: string[],
  checkedAt: string,
): WorldSpectSourceHealth[] {
  return sources.map((source) => {
    const nti = finiteNumberOrNull(source.nti);
    const simulated = source.simulated === true;
    const hasError = typeof source.error === 'string' && source.error.length > 0;
    const status = simulated
      ? 'simulated'
      : hasError || degradedSources.includes(source.key)
        ? 'degraded'
        : source.value === null
          ? 'missing'
          : 'healthy';
    const lastOk = status === 'healthy' ? source.ts ?? checkedAt : null;
    const lastError = hasError ? source.error as string : status === 'missing' ? 'source_value_missing' : null;

    return {
      key: source.key,
      sourceId: source.key,
      status,
      kind: 'public-api',
      nti,
      simulated,
      last_ok: lastOk,
      last_error: lastError,
      lastObservedAt: source.ts,
      checkedAt,
      confidence: isRealSource(source) ? clamp01(nti ?? 0.7) : 0,
      message: lastError ?? undefined,
    };
  });
}

export function normalizeWorldSpectSourceHealth(
  value: unknown,
  sources: WorldSpectSource[],
  degradedSources: string[],
  checkedAt: string,
): WorldSpectSourceHealth[] {
  if (!Array.isArray(value) || value.length === 0) {
    return deriveWorldSpectSourceHealth(sources, degradedSources, checkedAt);
  }

  const normalized = value.filter(isRecord).map((source): WorldSpectSourceHealth => {
    const key = typeof source.key === 'string'
      ? source.key
      : typeof source.sourceId === 'string'
        ? source.sourceId
        : 'unknown_source';
    const statusValue = typeof source.status === 'string' ? source.status : 'unknown';
    const status: WorldSpectSourceHealthStatus = statusValue === 'healthy'
      || statusValue === 'degraded'
      || statusValue === 'missing'
      || statusValue === 'simulated'
      ? statusValue
      : 'unknown';
    const nti = finiteNumberOrNull(source.nti);
    const simulated = source.simulated === true || status === 'simulated';

    return {
      key,
      sourceId: typeof source.sourceId === 'string' ? source.sourceId : key,
      status,
      kind: 'public-api' as const,
      nti,
      simulated,
      last_ok: typeof source.last_ok === 'string' ? source.last_ok : typeof source.lastObservedAt === 'string' ? source.lastObservedAt : null,
      last_error: typeof source.last_error === 'string' ? source.last_error : typeof source.message === 'string' ? source.message : null,
      lastObservedAt: typeof source.lastObservedAt === 'string' ? source.lastObservedAt : undefined,
      checkedAt,
      confidence: clamp01(Number(source.confidence ?? 0)),
      message: typeof source.message === 'string' ? source.message : undefined,
    };
  });

  return normalized.length > 0 ? normalized : deriveWorldSpectSourceHealth(sources, degradedSources, checkedAt);
}

export function calculateWorldSpectSourceState(payload: Pick<WorldSpectCanonicalPayload, 'sources' | 'wsi' | 'nti' | 'degraded_sources'>): WorldSpectSourceState {
  const hasMetrics = payload.wsi !== null && payload.nti !== null;
  if (!hasMetrics && payload.sources.length === 0) return 'missing';
  if (payload.degraded_sources.length > 0 || payload.sources.some((source) => source.error || source.simulated === true)) return 'degraded';
  return hasMetrics ? 'observed' : 'missing';
}

export function calculateWorldSpectConfidence(payload: Pick<WorldSpectCanonicalPayload, 'sources' | 'wsi' | 'nti' | 'degraded_sources'>) {
  if (payload.wsi === null || payload.nti === null) return 0;
  if (payload.sources.length === 0) return clamp01(payload.nti);
  const realSources = payload.sources.filter(isRealSource);
  const sourceCoverage = realSources.length / payload.sources.length;
  const degradationPenalty = payload.degraded_sources.length > 0 ? 0.82 : 1;
  return Number(clamp01(sourceCoverage * clamp01(payload.nti) * degradationPenalty).toFixed(3));
}

export function buildWorldSpectFieldStateSignal(payload: WorldSpectCanonicalPayload, sourceState: WorldSpectSourceState, confidence: number): WorldSpectFieldStateSignal {
  if (sourceState === 'missing' || payload.wsi === null || payload.nti === null) return null;

  return {
    sourceState,
    evidenceLevel: 'direct',
    confidence,
    metrics: {
      wsi: payload.wsi,
      nti: payload.nti,
    },
    observedAt: payload.ts,
    sourceIds: payload.sources.filter(isRealSource).map((source) => source.key),
  };
}

export function buildWorldSpectResponse(payload: WorldSpectCanonicalPayload): WorldSpectResponse {
  const sourceState = calculateWorldSpectSourceState(payload);
  const confidence = calculateWorldSpectConfidence(payload);
  const sourceHealth = normalizeWorldSpectSourceHealth(payload.source_health, payload.sources, payload.degraded_sources, payload.ts);

  return {
    sourceState,
    evidenceLevel: sourceState === 'missing' ? 'none' : 'direct',
    confidence,
    wsi: payload.wsi,
    nti: payload.nti,
    ts: payload.ts,
    sources: payload.sources,
    degraded_sources: payload.degraded_sources,
    sourceHealth,
    fieldStateSignal: buildWorldSpectFieldStateSignal(payload, sourceState, confidence),
  };
}

export function missingWorldSpectResponse(now = new Date().toISOString()): WorldSpectResponse {
  return {
    sourceState: 'missing',
    evidenceLevel: 'none',
    confidence: 0,
    wsi: null,
    nti: null,
    ts: now,
    sources: [],
    degraded_sources: [],
    sourceHealth: [],
    fieldStateSignal: null,
  };
}

