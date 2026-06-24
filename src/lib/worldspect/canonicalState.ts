import { aggregateWorldSpect } from '@/lib/worldspect/vector-aggregator';
import { getLatestWorldSpectSnapshot } from '@/lib/worldspect/snapshotStore';
import { runWorldSpectAdapters } from '@/lib/worldspect/runAdapters';

type AnyRecord = Record<string, any>;

function record(value: unknown): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function textValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function hoursSince(value: string | null) {
  if (!value) return null;
  const observed = new Date(value).getTime();
  if (!Number.isFinite(observed)) return null;
  return Math.max(0, (Date.now() - observed) / 36e5);
}

function regimeFrom(wsi: number | null, nti: number | null) {
  const w = numberValue(wsi, 0);
  const n = numberValue(nti, 0);
  if (w >= 0.65 || n >= 0.70) return 'CRITICAL';
  if (w >= 0.38 || n >= 0.42) return 'TENSION';
  return 'LOW';
}

function staleState(stalenessHours: number | null) {
  if (stalenessHours === null) return { is_stale: true, stale_level: 'missing' };
  if (stalenessHours > 72) return { is_stale: true, stale_level: 'critical' };
  if (stalenessHours > 24) return { is_stale: true, stale_level: 'warning' };
  return { is_stale: false, stale_level: 'fresh' };
}

function isInternalSfiWorldSpectSource(value: unknown) {
  return textValue(value).toLowerCase().includes('_sfi_internal_evidence');
}

function externalOnlySources(sources: unknown[]) {
  return sources.filter((source) => {
    const item = record(source);
    const key = textValue(item.key, textValue(item.sourceId, ''));
    return !isInternalSfiWorldSpectSource(key);
  });
}

function sourceHasValue(source: unknown) {
  const item = record(source);
  return typeof item.value === 'number' && numberValue(item.nti ?? item.trust, 0) > 0;
}

function sourceIsDegraded(source: unknown, degradedSources: string[]) {
  const item = record(source);
  const key = textValue(item.key, textValue(item.sourceId, ''));
  const error = textValue(item.error, '');
  return degradedSources.includes(key) || Boolean(error);
}

function qualityFromCoverage(sourceCoverage: number, degradationRatio: number) {
  if (sourceCoverage >= 0.75 && degradationRatio < 0.35) return 'strong';
  if (sourceCoverage >= 0.45 && degradationRatio < 0.50) return 'partial';
  return 'weak';
}

function summarizeSources(sources: unknown[]) {
  return sources.map((source) => {
    const item = record(source);
    const key = textValue(item.key, textValue(item.sourceId, 'unknown'));
    const rawLabel = textValue(item.label, key);

    return {
      key,
      label: rawLabel.replace(/ÃâÃÂ·|Â·|·/g, '·'),
      value: typeof item.value === 'number' ? item.value : null,
      unit: textValue(item.unit, 'normalized_0_1'),
      trust: numberValue(item.nti ?? item.trust, 0),
      weight: numberValue(item.weight ?? item.persistence, 0),
      simulated: Boolean(item.simulated),
      ts: textValue(item.ts, ''),
      error: textValue(item.error, '') || null,
      internal_sfi_source: isInternalSfiWorldSpectSource(key),
    };
  });
}

function buildVectors(rawPayload: AnyRecord) {
  const observations = arrayValue(rawPayload.observations);
  if (observations.length === 0) {
    return {
      status: 'missing_observations',
      vectors: [],
      sourceCoverage: numberValue(rawPayload.source_coverage, 0),
      degradedSources: arrayValue(rawPayload.degraded_sources).filter((item): item is string => typeof item === 'string'),
    };
  }

  try {
    return aggregateWorldSpect(observations as any[]);
  } catch (error) {
    return {
      status: 'vector_reconstruction_failed',
      vectors: [],
      sourceCoverage: numberValue(rawPayload.source_coverage, 0),
      degradedSources: arrayValue(rawPayload.degraded_sources).filter((item): item is string => typeof item === 'string'),
      error: error instanceof Error ? error.message : 'aggregate_failed',
    };
  }
}

function interpretation(input: {
  sourceState: string;
  sourceCoverage: number;
  degradationRatio: number;
  isStale: boolean;
  observationQuality: string;
  decisionStrength: string;
}) {
  if (input.isStale) {
    return 'WSV existe, pero está viejo; puede servir para contexto histórico, no para decisión operacional fuerte.';
  }

  if (input.observationQuality === 'strong') {
    return 'WSV observado correctamente: snapshot reciente, fuentes suficientes y contrato canónico disponible.';
  }

  if (input.observationQuality === 'partial') {
    return 'WSV parcial: hay observación externa disponible, pero la decisión debe tratarse como limitada.';
  }

  if (input.sourceState !== 'observed') {
    return 'WSV disponible pero débil: hay snapshot, pero cobertura o salud de fuentes insuficiente.';
  }

  return 'WSV disponible con fuerza débil; usar como contexto, no como decisión dura.';
}

export async function buildCanonicalWorldSpectState() {
  const latest = await getLatestWorldSpectSnapshot();
  const generatedAt = new Date().toISOString();

  if (!latest) {
    return {
      ok: false,
      generated_at: generatedAt,
      source: 'worldspect_canonical_state' as const,
      observed_at: null,
      source_state: 'missing',
      snapshot_available: false,
      observation_quality: 'missing',
      decision_strength: 'none',
      confidence: 0,
      wsi: null,
      nti: null,
      regime: 'LOW',
      source_coverage: 0,
      degradation_ratio: 1,
      active_source_count: 0,
      total_source_count: 0,
      degraded_sources: [],
      sources: [],
      source_health: [],
      vectors: [],
      ingest_mode: null,
      snapshot_hash: null,
      adapter_status: null,
      adapter_error: 'worldspect_snapshot_missing',
      is_stale: true,
      staleness_hours: null,
      stale_level: 'missing',
      interpretation: 'No hay snapshot WorldSpect persistido.',
      role_boundary: {
        worldspect: 'observa mundo externo',
        scorefriction: 'detecta objetos y señales según filtro seleccionado',
        sfi_response: 'decide respuesta interna con atractores y evidencia',
      },
    };
  }

  const rawPayload = record(latest.raw_payload);
  const reconstructed = buildVectors(rawPayload);
  const stalenessHours = hoursSince(latest.observed_at);
  const stale = staleState(stalenessHours);

  const externalSources = externalOnlySources(latest.sources);
  const externalTotalSourceCount = externalSources.length;
  const externalActiveSourceCount = externalSources.filter(sourceHasValue).length;
  const externalDegradedSourceCount = externalSources.filter((source) => sourceIsDegraded(source, latest.degraded_sources)).length;

  const sourceCoverage = externalTotalSourceCount === 0 ? 0 : externalActiveSourceCount / externalTotalSourceCount;
  const degradationRatio = externalTotalSourceCount === 0 ? 1 : externalDegradedSourceCount / externalTotalSourceCount;
  const observationQuality = qualityFromCoverage(sourceCoverage, degradationRatio);
  const decisionStrength = observationQuality === 'strong' && !stale.is_stale
    ? 'strong'
    : observationQuality === 'partial' && !stale.is_stale
      ? 'limited'
      : 'weak';

  const wsi = typeof latest.wsi === 'number' ? latest.wsi : numberValue(rawPayload.wsi, 0);
  const nti = typeof latest.nti === 'number' ? latest.nti : numberValue(rawPayload.nti, 0);

  return {
    ok: !stale.is_stale,
    generated_at: generatedAt,
    source: 'worldspect_canonical_state' as const,
    observed_at: latest.observed_at,
    source_state: latest.source_state,
    snapshot_available: true,
    observation_quality: observationQuality,
    decision_strength: decisionStrength,
    confidence: latest.confidence,
    wsi,
    nti,
    regime: regimeFrom(wsi, nti),
    source_coverage: sourceCoverage,
    degradation_ratio: degradationRatio,
    active_source_count: externalActiveSourceCount,
    total_source_count: externalTotalSourceCount,
    degraded_sources: latest.degraded_sources,
    sources: summarizeSources(latest.sources),
    source_health: latest.source_health,
    vectors: Array.isArray((reconstructed as AnyRecord).vectors) ? (reconstructed as AnyRecord).vectors : [],
    vector_status: textValue((reconstructed as AnyRecord).status, 'unknown'),
    ingest_mode: latest.ingest_mode,
    snapshot_hash: latest.snapshot_hash,
    adapter_status: latest.adapter_status,
    adapter_error: latest.adapter_error,
    worldspect_external_purity: {
      internal_sfi_sources_excluded: latest.sources.length - externalTotalSourceCount,
      external_active_source_count: externalActiveSourceCount,
      external_total_source_count: externalTotalSourceCount,
      external_degraded_source_count: externalDegradedSourceCount,
    },
    raw_payload_summary: {
      adapter_count: rawPayload.adapter_count ?? null,
      adapter_ids: rawPayload.adapter_ids ?? [],
      source_state_reason: rawPayload.source_state_reason ?? null,
      gdelt_mode: rawPayload.gdelt_mode ?? null,
    },
    is_stale: stale.is_stale,
    staleness_hours: stalenessHours,
    stale_level: stale.stale_level,
    interpretation: interpretation({
      sourceState: latest.source_state,
      sourceCoverage,
      degradationRatio,
      isStale: stale.is_stale,
      observationQuality,
      decisionStrength,
    }),
    role_boundary: {
      worldspect: 'observa mundo externo',
      scorefriction: 'detecta objetos y señales según filtro seleccionado',
      sfi_response: 'decide respuesta interna con atractores y evidencia',
    },
  };
}

export async function refreshCanonicalWorldSpectState() {
  const run = await runWorldSpectAdapters('manual');
  const state = await buildCanonicalWorldSpectState();

  return {
    ok: run.ok && state.ok,
    generated_at: new Date().toISOString(),
    source: 'worldspect_canonical_refresh' as const,
    refresh: {
      ok: run.ok,
      status: run.status,
      writes_performed: run.persistence.ok,
      degraded_sources: run.degraded_sources,
      persistence: run.persistence,
    },
    state,
  };
}
