import 'server-only';

import type {
  SourceAccessKind,
  SourceAdapterStatus,
  SourceMeaning,
  SourceObservation,
  WorldSpectDomain,
  WorldSpectLayer,
} from './source-adapter-contract';
import { clamp01 } from './vector-aggregator';
import { getWorldSpectSnapshotAtOrBefore } from './snapshotStore';
import { persistWorldSpectObservations } from './runAdapters';

export const SFI_WORLDSPECT_HISTORICAL_RECOVERY_CONTRACT = 'SFI-WORLDSPECT-HISTORICAL-RECOVERY-1.0' as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 18_000;
const TARGET_HOUR_UTC = 7;
const TARGET_MINUTE_UTC = 20;

export const SFI_WORLDSPECT_KNOWN_GAP_DAYS = Object.freeze([
  '2026-06-25',
  '2026-06-26',
  '2026-07-18',
  '2026-09-18',
  '2026-09-19',
  '2026-09-20',
  '2026-09-21',
  '2026-09-22',
  '2026-09-23',
  '2026-09-24',
  '2026-09-25',
  '2026-09-26',
  '2026-09-27',
  '2026-09-28',
  '2026-09-29',
] as const);

type JsonRecord = Record<string, unknown>;
type RecoveryGrade = 'EXACT_ARCHIVE' | 'ARCHIVED_FORECAST' | 'AS_OF_PROXY_CURRENT_INDEX' | 'ORIGINAL_SEMANTICS_UNAVAILABLE';

type PageviewConfig = {
  sourceId: string;
  domain: WorldSpectDomain;
  page: string;
  signalKey: keyof SourceObservation['signal'];
  scale: number;
  trust: number;
};

type HnConfig = {
  sourceId: string;
  domain: WorldSpectDomain;
  query: string;
  signalKey: keyof SourceObservation['signal'];
  scale: number;
  trust: number;
};

const PAGEVIEW_CONFIGS: PageviewConfig[] = [
  { sourceId: 'cultural_wikimedia_pageviews_public', domain: 'CULTURAL', page: 'Culture', signalKey: 'attention', scale: 2_500_000, trust: 0.58 },
  { sourceId: 'geopolitical_wikimedia_pageviews_public', domain: 'GEOPOLITICAL', page: 'Geopolitics', signalKey: 'geoStress', scale: 1_200_000, trust: 0.56 },
  { sourceId: 'bio_wikimedia_pageviews_public', domain: 'BIO', page: 'Health', signalKey: 'bioStress', scale: 2_500_000, trust: 0.54 },
  { sourceId: 'institutional_wikimedia_pageviews_public', domain: 'INSTITUTIONAL', page: 'Institution', signalKey: 'institutionalStress', scale: 1_200_000, trust: 0.55 },
  { sourceId: 'memetic_wikimedia_pageviews_public', domain: 'MEMETIC', page: 'Internet meme', signalKey: 'memeticPressure', scale: 1_600_000, trust: 0.54 },
];

const HN_CONFIGS: HnConfig[] = [
  { sourceId: 'geo_digital_hn_public', domain: 'GEO_DIGITAL', query: 'platform network social AI infrastructure', signalKey: 'attention', scale: 100_000, trust: 0.48 },
  { sourceId: 'tech_hn_public', domain: 'TECH', query: 'AI agent model software compute', signalKey: 'techStress', scale: 100_000, trust: 0.45 },
];

const UNRECOVERABLE_SOURCES: Array<{ sourceId: string; domain: WorldSpectDomain; layer: WorldSpectLayer; reason: string }> = [
  { sourceId: 'cultural_wikipedia_public', domain: 'CULTURAL', layer: 'ATTENTION', reason: 'Wikipedia search totalhits is a live mutable index without an as-of historical search snapshot.' },
  { sourceId: 'economy_worldbank_public', domain: 'ECONOMY', layer: 'MACRO', reason: 'World Bank annual observations are recoverable by period but the historical publication/revision state at the target instant is not preserved by the canonical adapter.' },
  { sourceId: 'economy_github_market_stress_public', domain: 'ECONOMY', layer: 'MARKET', reason: 'GitHub repository search is a mutable current index; created-date filters do not reconstruct historical query membership exactly.' },
  { sourceId: 'geo_digital_github_public', domain: 'GEO_DIGITAL', layer: 'DIGITAL_ACTIVITY', reason: 'GitHub repository search is a mutable current index; created-date filters do not reconstruct historical query membership exactly.' },
  { sourceId: 'geopolitical_wikipedia_public', domain: 'GEOPOLITICAL', layer: 'ATTENTION', reason: 'Wikipedia search totalhits is a live mutable index without an as-of historical search snapshot.' },
  { sourceId: 'bio_clinicaltrials_public', domain: 'BIO', layer: 'BIO_HEALTH', reason: 'The canonical adapter reads a current page of studies rather than a historically versioned as-of cohort.' },
  { sourceId: 'climate_wikipedia_public', domain: 'CLIMATE', layer: 'ATTENTION', reason: 'Wikipedia search totalhits is a live mutable index without an as-of historical search snapshot.' },
  { sourceId: 'institutional_wikipedia_public', domain: 'INSTITUTIONAL', layer: 'GOVERNANCE', reason: 'Wikipedia search totalhits is a live mutable index without an as-of historical search snapshot.' },
  { sourceId: 'memetic_wikipedia_public', domain: 'MEMETIC', layer: 'ATTENTION', reason: 'Wikipedia search totalhits is a live mutable index without an as-of historical search snapshot.' },
  { sourceId: 'tech_github_public', domain: 'TECH', layer: 'DIGITAL_ACTIVITY', reason: 'GitHub repository search is a mutable current index; created-date filters do not reconstruct historical query membership exactly.' },
  { sourceId: 'affective_github_sentiment_public', domain: 'AFFECTIVE', layer: 'AFFECTIVE_PROXY', reason: 'GitHub repository search is a mutable current index; created-date filters do not reconstruct historical query membership exactly.' },
  { sourceId: 'affective_github_mental_health_public', domain: 'AFFECTIVE', layer: 'AFFECTIVE_PROXY', reason: 'GitHub repository search is a mutable current index; created-date filters do not reconstruct historical query membership exactly.' },
];

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function finite(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCount(count: number, scale: number): number {
  return clamp01(Math.log10(Math.max(0, count) + 1) / Math.log10(scale + 1));
}

function parseDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsed = new Date(`${day}T00:00:00.000Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === day ? parsed : null;
}

function targetIso(day: string) {
  return `${day}T${String(TARGET_HOUR_UTC).padStart(2, '0')}:${String(TARGET_MINUTE_UTC).padStart(2, '0')}:00.000Z`;
}

function dayOffset(day: string, delta: number) {
  const parsed = parseDay(day);
  if (!parsed) throw new Error(`invalid_day:${day}`);
  return new Date(parsed.valueOf() + delta * DAY_MS).toISOString().slice(0, 10);
}

function compact(day: string) {
  return day.replaceAll('-', '');
}

function signal(key: keyof SourceObservation['signal'], value: number): SourceObservation['signal'] {
  return { [key]: clamp01(value) } as SourceObservation['signal'];
}

function meaning(sourceId: string, domain: WorldSpectDomain, layer: WorldSpectLayer): SourceMeaning {
  return {
    indicator: sourceId,
    description: `${domain} signal retrospectively reconstructed through ${layer}.`,
    high_means: `High ${domain} pressure/activity in layer ${layer}.`,
    low_means: `Low ${domain} pressure/activity in layer ${layer}.`,
  };
}

function observation(input: {
  sourceId: string;
  domain: WorldSpectDomain;
  layer: WorldSpectLayer;
  observedAt: string;
  value: number | null;
  trust: number;
  grade: RecoveryGrade;
  velocity?: number;
  volatility?: number;
  persistence?: number;
  rawCount?: number;
  status?: SourceAdapterStatus;
  accessKind?: SourceAccessKind;
  signal?: SourceObservation['signal'];
  raw?: JsonRecord;
  error?: string | null;
}) : SourceObservation {
  const hasValue = typeof input.value === 'number' && Number.isFinite(input.value);
  const normalizedValue = hasValue ? clamp01(input.value as number) : null;
  const trust = hasValue ? clamp01(input.trust) : 0;
  const status = input.status ?? (hasValue ? 'ACTIVE' : 'MISSING_DATA');
  return {
    sourceId: input.sourceId,
    domain: input.domain,
    layer: input.layer,
    meaning: meaning(input.sourceId, input.domain, input.layer),
    observedAt: input.observedAt,
    accessKind: input.accessKind ?? 'public-api',
    status,
    value: normalizedValue,
    velocity: clamp01(input.velocity ?? normalizedValue ?? 0),
    volatility: clamp01(input.volatility ?? (normalizedValue !== null ? Math.abs(normalizedValue - trust) : 1)),
    persistence: clamp01(input.persistence ?? (normalizedValue !== null ? trust : 0)),
    rawCount: Math.max(0, Math.floor(input.rawCount ?? 0)),
    sourceCount: status === 'ACTIVE' ? 1 : 0,
    trust,
    degradation: status === 'ACTIVE' ? clamp01(1 - trust) : 1,
    signal: input.signal ?? {},
    raw: {
      ...(input.raw ?? {}),
      retrospective_recovery: true,
      recovery_grade: input.grade,
      retrieved_at: new Date().toISOString(),
    },
    error: input.error ?? null,
  };
}

async function fetchJson(url: string, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json,text/plain;q=0.8,*/*;q=0.5',
        'user-agent': 'SystemFrictionInstitute-WorldSpect-HistoricalRecovery/1.0',
      },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`http_${response.status}`);
    const raw = await response.text();
    return raw.trim() ? JSON.parse(raw) as unknown : {};
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPageviewSeries(config: PageviewConfig, minDay: string, maxDay: string) {
  const page = encodeURIComponent(config.page.replace(/\s+/g, '_'));
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${page}/daily/${compact(minDay)}/${compact(maxDay)}`;
  const json = record(await fetchJson(url));
  const byDay = new Map<string, number>();
  for (const item of array(json.items).map(record)) {
    const timestamp = String(item.timestamp ?? '');
    if (timestamp.length >= 8) {
      const day = `${timestamp.slice(0,4)}-${timestamp.slice(4,6)}-${timestamp.slice(6,8)}`;
      byDay.set(day, finite(item.views, 0));
    }
  }
  return byDay;
}

function pageviewObservation(config: PageviewConfig, day: string, series: Map<string, number>) {
  const start = dayOffset(day, -34);
  const end = dayOffset(day, -4);
  const daily: number[] = [];
  for (let cursor = parseDay(start)!; cursor.valueOf() <= parseDay(end)!.valueOf(); cursor = new Date(cursor.valueOf() + DAY_MS)) {
    daily.push(series.get(cursor.toISOString().slice(0,10)) ?? 0);
  }
  const total = daily.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return observation({
      sourceId: config.sourceId, domain: config.domain, layer: 'ATTENTION', observedAt: targetIso(day),
      value: null, trust: 0, grade: 'EXACT_ARCHIVE', status: 'MISSING_DATA',
      signal: signal(config.signalKey, 0),
      raw: { provider: 'wikimedia_pageviews', page: config.page, start, end, reason: 'empty_historical_range' },
    });
  }
  const value = normalizeCount(total, config.scale);
  const avg = total / Math.max(1, daily.length);
  const variance = daily.reduce((sum, item) => sum + Math.pow(item - avg, 2), 0) / Math.max(1, daily.length);
  const volatility = clamp01(Math.sqrt(variance) / Math.max(1, avg * 3));
  return observation({
    sourceId: config.sourceId, domain: config.domain, layer: 'ATTENTION', observedAt: targetIso(day),
    value, trust: config.trust, grade: 'EXACT_ARCHIVE', velocity: value, volatility,
    persistence: clamp01(value * 0.56), rawCount: total, signal: signal(config.signalKey, value),
    raw: { provider: 'wikimedia_pageviews', page: config.page, total_views: total, days: daily.length, start, end },
  });
}

async function hnObservation(config: HnConfig, day: string) {
  const cutoff = Math.floor(Date.parse(targetIso(day)) / 1000);
  const filter = encodeURIComponent(`created_at_i<${cutoff}`);
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(config.query)}&tags=story&numericFilters=${filter}&hitsPerPage=1`;
  try {
    const json = record(await fetchJson(url));
    const hits = finite(json.nbHits, 0);
    if (hits <= 0) {
      return observation({
        sourceId: config.sourceId, domain: config.domain, layer: 'ATTENTION', observedAt: targetIso(day),
        value: null, trust: 0, grade: 'AS_OF_PROXY_CURRENT_INDEX', status: 'MISSING_DATA',
        signal: signal(config.signalKey, 0),
        raw: { provider: 'hn_algolia', query: config.query, as_of_cutoff: targetIso(day), hits, reason: 'empty_asof_index' },
      });
    }
    const value = normalizeCount(hits, config.scale);
    return observation({
      sourceId: config.sourceId, domain: config.domain, layer: 'ATTENTION', observedAt: targetIso(day),
      value, trust: config.trust, grade: 'AS_OF_PROXY_CURRENT_INDEX',
      velocity: value, volatility: clamp01(value * 0.48), persistence: clamp01(value * 0.62),
      rawCount: hits, signal: signal(config.signalKey, value),
      raw: {
        provider: 'hn_algolia', query: config.query, hits, as_of_cutoff: targetIso(day),
        caveat: 'Current Algolia index filtered to items created before the historical cutoff; later edits/deletions may differ from the index state that existed then.',
      },
    });
  } catch (error) {
    return observation({
      sourceId: config.sourceId, domain: config.domain, layer: 'ATTENTION', observedAt: targetIso(day),
      value: null, trust: 0, grade: 'AS_OF_PROXY_CURRENT_INDEX', status: 'DEGRADED_BLOCKING',
      raw: { provider: 'hn_algolia', query: config.query, as_of_cutoff: targetIso(day) },
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function fetchHistoricalForecast(minDay: string, maxDay: string) {
  const url = 'https://historical-forecast-api.open-meteo.com/v1/forecast'
    + `?latitude=20.6736&longitude=-103.344&start_date=${minDay}&end_date=${maxDay}`
    + '&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=UTC';
  const json = record(await fetchJson(url, 25_000));
  const hourly = record(json.hourly);
  const times = array(hourly.time).map(String);
  const temperatures = array(hourly.temperature_2m);
  const humidities = array(hourly.relative_humidity_2m);
  const winds = array(hourly.wind_speed_10m);
  const byTime = new Map<string, { temperature: number; humidity: number; wind: number }>();
  times.forEach((time, index) => {
    byTime.set(time, {
      temperature: finite(temperatures[index], Number.NaN),
      humidity: finite(humidities[index], Number.NaN),
      wind: finite(winds[index], Number.NaN),
    });
  });
  return byTime;
}

function climateObservation(day: string, series: Map<string, { temperature: number; humidity: number; wind: number }>) {
  const hour = `${day}T${String(TARGET_HOUR_UTC).padStart(2,'0')}:00`;
  const current = series.get(hour);
  if (!current || !Number.isFinite(current.temperature) || !Number.isFinite(current.humidity) || !Number.isFinite(current.wind)) {
    return observation({
      sourceId: 'climate_open_meteo_public', domain: 'CLIMATE', layer: 'PHYSICAL', observedAt: targetIso(day),
      value: null, trust: 0, grade: 'ARCHIVED_FORECAST', status: 'MISSING_DATA',
      raw: { provider: 'open_meteo_historical_forecast', target_hour: hour, reason: 'historical_hour_missing' },
    });
  }
  const heatStress = clamp01(Math.abs(current.temperature - 22) / 22);
  const humidityStress = clamp01(Math.abs(current.humidity - 50) / 50);
  const windStress = clamp01(current.wind / 80);
  const value = clamp01(heatStress * 0.44 + humidityStress * 0.24 + windStress * 0.32);
  return observation({
    sourceId: 'climate_open_meteo_public', domain: 'CLIMATE', layer: 'PHYSICAL', observedAt: targetIso(day),
    value, trust: 0.64, grade: 'ARCHIVED_FORECAST', velocity: windStress,
    volatility: clamp01(heatStress + humidityStress / 2), persistence: clamp01(0.38 + value * 0.42),
    rawCount: 1, signal: { climateStress: value },
    raw: { provider: 'open_meteo_historical_forecast', target_hour: hour, current },
  });
}

function unavailableObservation(item: { sourceId: string; domain: WorldSpectDomain; layer: WorldSpectLayer; reason: string }, day: string) {
  return observation({
    sourceId: item.sourceId, domain: item.domain, layer: item.layer, observedAt: targetIso(day),
    value: null, trust: 0, grade: 'ORIGINAL_SEMANTICS_UNAVAILABLE', status: 'MISSING_DATA',
    raw: { reason: item.reason },
  });
}

function sourceSummary(observations: SourceObservation[]) {
  const exact = observations.filter((item) => record(item.raw).recovery_grade === 'EXACT_ARCHIVE' && item.status === 'ACTIVE').length;
  const archivedForecast = observations.filter((item) => record(item.raw).recovery_grade === 'ARCHIVED_FORECAST' && item.status === 'ACTIVE').length;
  const proxy = observations.filter((item) => record(item.raw).recovery_grade === 'AS_OF_PROXY_CURRENT_INDEX' && item.status === 'ACTIVE').length;
  const unavailable = observations.filter((item) => record(item.raw).recovery_grade === 'ORIGINAL_SEMANTICS_UNAVAILABLE').length;
  const active = observations.filter((item) => item.status === 'ACTIVE').length;
  return { total: observations.length, active, exactArchive: exact, archivedForecast, asOfProxy: proxy, originalSemanticsUnavailable: unavailable };
}

export async function recoverWorldSpectHistoricalDays(input: {
  days?: string[];
  persist?: boolean;
} = {}) {
  const requested = [...new Set((input.days?.length ? input.days : [...SFI_WORLDSPECT_KNOWN_GAP_DAYS])
    .map((day) => String(day).trim())
    .filter((day) => parseDay(day) !== null))]
    .sort();
  const persist = input.persist === true;
  const reconstructionBoundary = {
    exactArchiveSources: PAGEVIEW_CONFIGS.map((item) => item.sourceId),
    archivedForecastSources: ['climate_open_meteo_public'],
    asOfProxySources: HN_CONFIGS.map((item) => item.sourceId),
    unavailableOriginalSemanticsSources: UNRECOVERABLE_SOURCES.map((item) => item.sourceId),
    originalCronExecutionClaimed: false,
    cognitiveSpineReentryPerformed: false,
    canonicalPromotionPerformed: false,
  };
  if (!requested.length) {
    return {
      ok: false,
      contract: SFI_WORLDSPECT_HISTORICAL_RECOVERY_CONTRACT,
      mode: persist ? 'PERSIST' as const : 'AUDIT_ONLY' as const,
      error: 'no_valid_days',
      requestedDays: [] as string[],
      counts: { requested: 0, persisted: 0, skippedExisting: 0, failures: 0 },
      days: [] as Array<Record<string, unknown>>,
      reconstructionBoundary,
    };
  }

  const earliestWindow = dayOffset(requested[0], -34);
  const latestWindow = dayOffset(requested[requested.length - 1], -4);
  const [pageviewSeries, climateSeries] = await Promise.all([
    Promise.all(PAGEVIEW_CONFIGS.map(async (config) => ({
      config,
      series: await fetchPageviewSeries(config, earliestWindow, latestWindow),
    }))),
    fetchHistoricalForecast(requested[0], requested[requested.length - 1]),
  ]);

  const days: Array<Record<string, unknown>> = [];
  let persisted = 0;
  let skippedExisting = 0;
  let failures = 0;

  for (const day of requested) {
    const existing = await getWorldSpectSnapshotAtOrBefore(`${day}T23:59:59.999Z`);
    if (existing?.observed_at.slice(0, 10) === day) {
      skippedExisting += 1;
      days.push({ day, status: 'ALREADY_OBSERVED', existingSnapshotId: existing.id, observedAt: existing.observed_at });
      continue;
    }

    const observations: SourceObservation[] = [];
    for (const item of pageviewSeries) observations.push(pageviewObservation(item.config, day, item.series));
    observations.push(climateObservation(day, climateSeries));
    for (const config of HN_CONFIGS) observations.push(await hnObservation(config, day));
    for (const item of UNRECOVERABLE_SOURCES) observations.push(unavailableObservation(item, day));

    const summary = sourceSummary(observations);
    let persistence: Awaited<ReturnType<typeof persistWorldSpectObservations>>['persistence'] | null = null;
    if (persist) {
      const result = await persistWorldSpectObservations(observations, 'diagnostic', {
        retrospective_recovery: true,
        recovery_contract: SFI_WORLDSPECT_HISTORICAL_RECOVERY_CONTRACT,
        target_day: day,
        target_cutoff: targetIso(day),
        retrieval_time: new Date().toISOString(),
        source_recovery_summary: summary,
        epistemic_boundary: 'Historical recovery uses official archives where available, as-of proxies only where explicitly marked, and leaves non-versioned live-index sources missing. It does not claim that the original cron executed on the target day.',
      }, {
        snapshotObservedAt: targetIso(day),
        priorCognitiveStateCutoff: targetIso(day),
        skipCognitiveSpineContrast: true,
      });
      persistence = result.persistence;
      if (result.persistence.ok) persisted += 1;
      else failures += 1;
    }

    days.push({
      day,
      status: persist ? (persistence?.ok ? 'PERSISTED_RETROSPECTIVE' : 'PERSIST_FAILED') : 'AUDITED_RECOVERABLE',
      targetCutoff: targetIso(day),
      sources: summary,
      activeSourceIds: observations.filter((item) => item.status === 'ACTIVE').map((item) => item.sourceId),
      unavailableSourceIds: observations.filter((item) => record(item.raw).recovery_grade === 'ORIGINAL_SEMANTICS_UNAVAILABLE').map((item) => item.sourceId),
      persistence: persistence?.ok ? { ok: true, snapshotId: persistence.data?.id ?? null } : persistence,
    });
  }

  return {
    ok: failures === 0,
    contract: SFI_WORLDSPECT_HISTORICAL_RECOVERY_CONTRACT,
    mode: persist ? 'PERSIST' : 'AUDIT_ONLY',
    requestedDays: requested,
    counts: { requested: requested.length, persisted, skippedExisting, failures },
    days,
    reconstructionBoundary,
  };
}
