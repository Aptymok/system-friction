import { aggregateWorldSpect } from '@/lib/worldspect/vector-aggregator';
import { getLatestWorldSpectSnapshot } from '@/lib/worldspect/snapshotStore';
import { runWorldSpectAdapters } from '@/lib/worldspect/runAdapters';

type AnyRecord = Record<string, any>;

const WORLDSPECT_DOMAINS = [
  'CULTURAL',
  'ECONOMY',
  'GEO_DIGITAL',
  'GEOPOLITICAL',
  'BIO',
  'CLIMATE',
  'INSTITUTIONAL',
  'MEMETIC',
  'TECH',
  'AFFECTIVE',
] as const;

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

function vectorValue(vector: unknown) {
  const row = record(vector);
  return typeof row.value === 'number' && Number.isFinite(row.value) ? row.value : null;
}

function domainName(vector: unknown) {
  return textValue(record(vector).domain, 'UNKNOWN');
}

function sectorSpikeDetails(vectors: unknown[]) {
  const rows = Array.isArray(vectors) ? vectors.map(record) : [];

  const active = rows
    .map((row) => ({
      domain: textValue(row.domain, 'UNKNOWN'),
      value: typeof row.value === 'number' && Number.isFinite(row.value) ? row.value : null,
      trust: numberValue(row.trust, 0),
      status: textValue(row.status, ''),
      layer_keys: row.layers && typeof row.layers === 'object' ? Object.keys(row.layers) : [],
    }))
    .filter((row) => row.status === 'ACTIVE' && typeof row.value === 'number');

  const sorted = [...active].sort((a, b) => Number(b.value) - Number(a.value));
  const max = sorted[0] ?? null;

  const spikeDomains = active
    .filter((row) => typeof row.value === 'number' && row.value >= 0.90)
    .map((row) => row.domain);

  const elevatedDomains = active
    .filter((row) => typeof row.value === 'number' && row.value >= 0.70)
    .map((row) => row.domain);

  return {
    has_sector_spike: spikeDomains.length > 0,
    spike_threshold: 0.90,
    elevated_threshold: 0.70,
    max_domain: max?.domain ?? null,
    max_value: max?.value ?? null,
    spike_count: spikeDomains.length,
    spike_domains: spikeDomains,
    elevated_domains: elevatedDomains,
    reading: spikeDomains.length > 0
      ? 'Global pressure may be low, but one or more domains are saturated.'
      : 'No saturated sector spike detected.',
  };
}

function regimeFromState(input: {
  wsi: number | null;
  nti: number | null;
  vectors: unknown[];
}) {
  const w = numberValue(input.wsi, 0);
  const n = numberValue(input.nti, 0);
  const spikes = sectorSpikeDetails(input.vectors);

  if (w >= 0.65 || n >= 0.70) return 'CRITICAL';
  if (w >= 0.38 || n >= 0.42) return spikes.has_sector_spike ? 'TENSION_WITH_SECTOR_SPIKE' : 'TENSION';

  if (spikes.has_sector_spike) return 'GLOBAL_LOW_SECTOR_SPIKE';

  if (spikes.elevated_domains.length >= 3) return 'GLOBAL_LOW_MULTI_DOMAIN_ELEVATION';

  return 'LOW';
}

function regimeDetailsFromState(input: {
  wsi: number | null;
  nti: number | null;
  vectors: unknown[];
}) {
  const w = numberValue(input.wsi, 0);
  const n = numberValue(input.nti, 0);
  const spikes = sectorSpikeDetails(input.vectors);
  const regime = regimeFromState(input);

  return {
    regime,
    wsi: w,
    nti: n,
    sector_spike: spikes,
    rule: 'WSI-01 sector-spike-aware regime logic',
    interpretation: spikes.has_sector_spike
      ? `Regime is not plain LOW because saturated domains were detected: ${spikes.spike_domains.join(', ')}.`
      : 'Regime follows global WSI/NTI thresholds; no saturated domain spike detected.',
  };
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

function mojibakeScore(value: string) {
  return (value.match(/[ÃÂâ�]/g) ?? []).length;
}

function repairUtf8Mojibake(value: string) {
  if (!/[ÃÂâ]/.test(value)) return value;

  try {
    const bytes = Uint8Array.from(Array.from(value), (char) => char.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

    if (decoded.includes('�')) return value;
    return mojibakeScore(decoded) < mojibakeScore(value) ? decoded : value;
  } catch {
    return value;
  }
}

function cleanText(value: unknown, fallback = '') {
  const raw = textValue(value, fallback);

  const direct = raw
    .replace(/Ã‚Â·/g, '·')
    .replace(/Ã‚·/g, '·')
    .replace(/Ãâ·/g, '·')
    .replace(/Â·/g, '·')
    .replace(/fÃ­sica/g, 'física')
    .replace(/fÃsica/g, 'física')
    .replace(/seÃ±ales/g, 'señales')
    .replace(/segÃºn/g, 'según');

  return repairUtf8Mojibake(direct)
    .replace(/Â·/g, '·')
    .replace(/fÃ­sica/g, 'física')
    .replace(/fÃsica/g, 'física')
    .replace(/seÃ±ales/g, 'señales')
    .replace(/segÃºn/g, 'según');
}

function cleanOutput<T>(value: T): T {
  if (typeof value === 'string') return cleanText(value) as T;

  if (Array.isArray(value)) {
    return value.map((item) => cleanOutput(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, cleanOutput(item)])
    ) as T;
  }

  return value;
}

function cleanLabel(value: unknown, fallback: string) {
  return cleanText(value, fallback)
}

function summarizeSources(sources: unknown[]) {
  return sources.map((source) => {
    const item = record(source);
    const key = textValue(item.key, textValue(item.sourceId, 'unknown'));
    const inferredDomain = key.includes('_') ? key.split('_')[0].toUpperCase() : 'UNKNOWN';
    const domain = textValue(item.domain, inferredDomain);
    const meaning = record(item.meaning);

    return {
      key,
      label: domain + ' :: ' + key,
      value: typeof item.value === 'number' ? item.value : null,
      unit: textValue(item.unit, 'normalized_0_1'),
      trust: numberValue(item.nti ?? item.trust, 0),
      weight: numberValue(item.weight ?? item.persistence, 0),
      layer: textValue(item.layer, 'UNKNOWN'),
      meaning: {
        indicator: textValue(meaning.indicator, key),
        description: cleanText(meaning.description, ''),
        high_means: cleanText(meaning.high_means, ''),
        low_means: cleanText(meaning.low_means, ''),
      },
      status: textValue(item.status, ''),
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

function buildDomainQuorum(vectors: unknown[], minSourcesPerDomain = 2) {
  const vectorRows = Array.isArray(vectors) ? vectors.map(record) : [];

  const domains = WORLDSPECT_DOMAINS.map((domain) => {
    const found = vectorRows.find((row) => textValue(row.domain) === domain);
    const sourceCount = numberValue(found?.sourceCount, 0);
    const status = textValue(found?.status, 'BOOTSTRAPPED');
    const sources = Array.isArray(found?.sources) ? found.sources.filter((item: unknown): item is string => typeof item === 'string') : [];
    const trust = numberValue(found?.trust, 0);
    const value = numberValue(found?.value, 0);
    const degradation = numberValue(found?.degradation, 1);

    const active = status === 'ACTIVE' && sourceCount > 0 && trust > 0;
    const quorumMet = active && sourceCount >= minSourcesPerDomain;

    return {
      domain,
      status,
      active,
      quorum_met: quorumMet,
      source_count: sourceCount,
      min_sources_required: minSourcesPerDomain,
      trust,
      value,
      degradation,
      sources,
      weakness: quorumMet
        ? null
        : active
          ? 'single_source_domain'
          : 'missing_active_source',
    };
  });

  const observedDomains = domains.filter((domain) => domain.active);
  const quorumDomains = domains.filter((domain) => domain.quorum_met);
  const missingDomains = domains.filter((domain) => !domain.active);
  const singleSourceDomains = domains.filter((domain) => domain.active && !domain.quorum_met);

  return {
    min_sources_per_domain: minSourcesPerDomain,
    total_domain_count: domains.length,
    observed_domain_count: observedDomains.length,
    quorum_domain_count: quorumDomains.length,
    missing_domain_count: missingDomains.length,
    single_source_domain_count: singleSourceDomains.length,
    missing_domains: missingDomains.map((domain) => domain.domain),
    single_source_domains: singleSourceDomains.map((domain) => domain.domain),
    quorum_domains: quorumDomains.map((domain) => domain.domain),
    domains,
  };
}

function qualityFromState(input: {
  sourceCoverage: number;
  degradationRatio: number;
  isStale: boolean;
  domainQuorum: ReturnType<typeof buildDomainQuorum>;
}) {
  if (input.isStale) return 'weak';

  const observedEnough = input.domainQuorum.observed_domain_count >= 8;
  const noMissingCritical = input.domainQuorum.missing_domain_count === 0;
  const quorumEnough = input.domainQuorum.quorum_domain_count >= 7;

  if (
    input.sourceCoverage >= 0.75
    && input.degradationRatio < 0.35
    && observedEnough
    && noMissingCritical
    && quorumEnough
  ) {
    return 'strong';
  }

  if (
    input.sourceCoverage >= 0.50
    && input.degradationRatio < 0.50
    && input.domainQuorum.observed_domain_count >= 7
  ) {
    return 'partial';
  }

  return 'weak';
}

function decisionStrengthFromQuality(quality: string, isStale: boolean) {
  if (isStale) return 'weak';
  if (quality === 'strong') return 'strong';
  if (quality === 'partial') return 'limited';
  return 'weak';
}

function interpretation(input: {
  isStale: boolean;
  observationQuality: string;
  domainQuorum: ReturnType<typeof buildDomainQuorum>;
}) {
  if (input.isStale) {
    return 'WSV existe, pero está viejo; puede servir para contexto histórico, no para decisión operacional fuerte.';
  }

  if (input.observationQuality === 'strong') {
    return 'WSV observado con robustez: snapshot fresco, fuentes externas limpias y quorum suficiente por dominio.';
  }

  if (input.domainQuorum.missing_domain_count > 0) {
    return `WSV disponible pero limitado: faltan dominios activos (${input.domainQuorum.missing_domains.join(', ')}).`;
  }

  if (input.domainQuorum.single_source_domain_count > 0) {
    return `WSV disponible pero limitado: hay dominios con un solo ojo (${input.domainQuorum.single_source_domains.join(', ')}).`;
  }

  return 'WSV disponible como lectura parcial; usar como contexto, no como decisión dura.';
}

export async function buildCanonicalWorldSpectState() {
  const latest = await getLatestWorldSpectSnapshot();
  const generatedAt = new Date().toISOString();

  if (!latest) {
    return cleanOutput({
      ok: false,
      generated_at: generatedAt,
      source: 'worldspect_canonical_state' as const,
    build_marker: 'WSI_01_SECTOR_SPIKE_2026_06_24',
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
      domain_quorum: buildDomainQuorum([]),
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
        scorefriction: 'detecta objetos y senales segun filtro seleccionado',
        sfi_response: 'decide respuesta interna con atractores y evidencia',
      },
    });
  }

  const rawPayload = record(latest.raw_payload);
  const reconstructed = buildVectors(rawPayload);
  const reconstructedVectors = Array.isArray((reconstructed as AnyRecord).vectors) ? (reconstructed as AnyRecord).vectors : [];
  const domainQuorum = buildDomainQuorum(reconstructedVectors);

  const stalenessHours = hoursSince(latest.observed_at);
  const stale = staleState(stalenessHours);

  const externalSources = externalOnlySources(latest.sources);
  const externalTotalSourceCount = externalSources.length;
  const externalActiveSourceCount = externalSources.filter(sourceHasValue).length;
  const externalDegradedSourceCount = externalSources.filter((source) => sourceIsDegraded(source, latest.degraded_sources)).length;

  const sourceCoverage = externalTotalSourceCount === 0 ? 0 : externalActiveSourceCount / externalTotalSourceCount;
  const degradationRatio = externalTotalSourceCount === 0 ? 1 : externalDegradedSourceCount / externalTotalSourceCount;

  const observationQuality = qualityFromState({
    sourceCoverage,
    degradationRatio,
    isStale: stale.is_stale,
    domainQuorum,
  });

  const decisionStrength = decisionStrengthFromQuality(observationQuality, stale.is_stale);

  const wsi = typeof latest.wsi === 'number' ? latest.wsi : numberValue(rawPayload.wsi, 0);
  const nti = typeof latest.nti === 'number' ? latest.nti : numberValue(rawPayload.nti, 0);

  return cleanOutput({
    ok: !stale.is_stale,
    generated_at: generatedAt,
    source: 'worldspect_canonical_state' as const,
    build_marker: 'WSI_01_SECTOR_SPIKE_2026_06_24',
    observed_at: latest.observed_at,
    source_state: latest.source_state,
    snapshot_available: true,
    observation_quality: observationQuality,
    decision_strength: decisionStrength,
    confidence: latest.confidence,
    wsi,
    nti,
    regime: regimeFromState({ wsi, nti, vectors: reconstructedVectors }),
    regime_details: regimeDetailsFromState({ wsi, nti, vectors: reconstructedVectors }),
    source_coverage: sourceCoverage,
    degradation_ratio: degradationRatio,
    active_source_count: externalActiveSourceCount,
    total_source_count: externalTotalSourceCount,
    degraded_sources: latest.degraded_sources,
    sources: summarizeSources(latest.sources),
    source_health: latest.source_health,
    vectors: reconstructedVectors,
    domain_quorum: domainQuorum,
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

    },
    is_stale: stale.is_stale,
    staleness_hours: stalenessHours,
    stale_level: stale.stale_level,
    interpretation: interpretation({
      isStale: stale.is_stale,
      observationQuality,
      domainQuorum,
    }),
    role_boundary: {
      worldspect: 'observa mundo externo',
      scorefriction: 'detecta objetos y senales segun filtro seleccionado',
      sfi_response: 'decide respuesta interna con atractores y evidencia',
    },
  });
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











