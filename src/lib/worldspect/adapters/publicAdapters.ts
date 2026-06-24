import type {
  SourceAccessKind,
  SourceAdapterStatus,
  SourceObservation,
  WorldSpectAdapter,
  WorldSpectDomain,
} from '../source-adapter-contract';
import { clamp01 } from '../vector-aggregator';

type JsonRecord = Record<string, unknown>;
type SignalKey = keyof SourceObservation['signal'];

const DEFAULT_TIMEOUT_MS = 16000;

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

function todayIso(): string {
  return new Date().toISOString();
}

async function fetchJson(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json,text/plain;q=0.8,*/*;q=0.5',
        'user-agent': 'SystemFrictionInstitute-WorldSpect/2.0',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`http_${response.status}`);
    }

    const text = await response.text();
    if (!text.trim()) return {};
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(url: string, input: {
  timeoutMs?: number;
  attempts?: number;
  baseDelayMs?: number;
} = {}): Promise<unknown> {
  const attempts = Math.max(1, input.attempts ?? 2);
  const baseDelayMs = Math.max(0, input.baseDelayMs ?? 900);
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchJson(url, input.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable = message.includes('aborted')
        || message.includes('fetch failed')
        || message.includes('http_429')
        || message.includes('429');

      if (!retryable || attempt >= attempts) break;
      await sleep(baseDelayMs * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? 'fetch_failed'));
}

function observation(input: {
  sourceId: string;
  domain: WorldSpectDomain;
  value: number;
  trust: number;
  velocity?: number;
  volatility?: number;
  persistence?: number;
  rawCount?: number;
  status?: SourceAdapterStatus;
  accessKind?: SourceAccessKind;
  signal?: SourceObservation['signal'];
  raw?: unknown;
  error?: string | null;
}): SourceObservation {
  const trust = clamp01(input.trust);
  const status = input.status ?? (trust > 0 ? 'ACTIVE' : 'DEGRADED_BLOCKING');

  return {
    sourceId: input.sourceId,
    domain: input.domain,
    observedAt: todayIso(),
    accessKind: input.accessKind ?? 'public-api',
    status,
    value: clamp01(input.value),
    velocity: clamp01(input.velocity ?? input.value),
    volatility: clamp01(input.volatility ?? Math.abs(input.value - trust)),
    persistence: clamp01(input.persistence ?? trust),
    rawCount: Math.max(0, Math.floor(input.rawCount ?? 0)),
    sourceCount: status === 'ACTIVE' ? 1 : 0,
    trust,
    degradation: clamp01(1 - trust),
    signal: input.signal ?? {},
    raw: input.raw,
    error: input.error ?? null,
  };
}

function emptyResult(input: {
  sourceId: string;
  domain: WorldSpectDomain;
  raw?: unknown;
  signal?: SourceObservation['signal'];
  accessKind?: SourceAccessKind;
}): SourceObservation {
  return observation({
    sourceId: input.sourceId,
    domain: input.domain,
    value: 0,
    trust: 0,
    rawCount: 0,
    status: 'EMPTY_RESULT',
    accessKind: input.accessKind,
    signal: input.signal ?? {},
    raw: input.raw ?? { reason: 'empty_result' },
  });
}

function degraded(sourceId: string, domain: WorldSpectDomain, error: unknown): SourceObservation {
  const message = error instanceof Error ? error.message : String(error);

  return observation({
    sourceId,
    domain,
    value: 0,
    trust: 0,
    rawCount: 0,
    status: 'DEGRADED_BLOCKING',
    error: message,
    signal: {},
    raw: { error: message },
  });
}

function signal(signalKey: SignalKey, value: number): SourceObservation['signal'] {
  return { [signalKey]: clamp01(value) } as SourceObservation['signal'];
}

function hnSearchAdapter(config: {
  sourceId: string;
  domain: WorldSpectDomain;
  query: string;
  signalKey: SignalKey;
  scale?: number;
  trust?: number;
}): WorldSpectAdapter {
  return {
    sourceId: config.sourceId,
    async observe() {
      try {
        const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(config.query)}&tags=story`;
        const json = record(await fetchJsonWithRetry(url, { timeoutMs: 18000, attempts: 2, baseDelayMs: 900 }));
        const hits = finite(json.nbHits, 0);

        if (hits === 0) {
          return emptyResult({
            sourceId: config.sourceId,
            domain: config.domain,
            signal: signal(config.signalKey, 0),
            raw: { provider: 'hn_algolia', query: config.query, hits, reason: 'empty_result' },
          });
        }

        const value = normalizeCount(hits, config.scale ?? 100000);

        return observation({
          sourceId: config.sourceId,
          domain: config.domain,
          value,
          trust: config.trust ?? 0.58,
          velocity: value,
          volatility: clamp01(value * 0.48),
          persistence: clamp01(value * 0.62),
          rawCount: hits,
          signal: signal(config.signalKey, value),
          raw: { provider: 'hn_algolia', query: config.query, hits },
        });
      } catch (error) {
        return degraded(config.sourceId, config.domain, error);
      }
    },
  };
}

function githubSearchAdapter(config: {
  sourceId: string;
  domain: WorldSpectDomain;
  query: string;
  signalKey: SignalKey;
  scale?: number;
  trust?: number;
}): WorldSpectAdapter {
  return {
    sourceId: config.sourceId,
    async observe() {
      try {
        const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(config.query)}&sort=updated&order=desc&per_page=1`;
        const json = record(await fetchJsonWithRetry(url, { timeoutMs: 18000, attempts: 2, baseDelayMs: 900 }));
        const total = finite(json.total_count, 0);

        if (total === 0) {
          return emptyResult({
            sourceId: config.sourceId,
            domain: config.domain,
            signal: signal(config.signalKey, 0),
            raw: { provider: 'github_search', query: config.query, total_count: total, reason: 'empty_result' },
          });
        }

        const value = normalizeCount(total, config.scale ?? 10000000);

        return observation({
          sourceId: config.sourceId,
          domain: config.domain,
          value,
          trust: config.trust ?? 0.60,
          velocity: value,
          volatility: clamp01(value * 0.42),
          persistence: clamp01(value * 0.62),
          rawCount: total,
          signal: signal(config.signalKey, value),
          raw: { provider: 'github_search', query: config.query, total_count: total },
        });
      } catch (error) {
        return degraded(config.sourceId, config.domain, error);
      }
    },
  };
}

function githubTechAdapter(): WorldSpectAdapter {
  return githubSearchAdapter({
    sourceId: 'tech_github_public',
    domain: 'TECH',
    query: 'AI OR machine-learning OR agent',
    signalKey: 'techStress',
    scale: 10000000,
    trust: 0.64,
  });
}

function wikipediaSearchAdapter(config: {
  sourceId: string;
  domain: WorldSpectDomain;
  query: string;
  signalKey: SignalKey;
  scale?: number;
  trust?: number;
}): WorldSpectAdapter {
  return {
    sourceId: config.sourceId,
    async observe() {
      try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(config.query)}&srlimit=50&format=json&origin=*`;
        const json = record(await fetchJsonWithRetry(url, { timeoutMs: 18000, attempts: 2, baseDelayMs: 900 }));
        const query = record(json.query);
        const search = array(query.search).map(record);
        const searchInfo = record(query.searchinfo);
        const totalHits = finite(searchInfo.totalhits, search.length);
        const count = Math.max(search.length, totalHits);

        if (count === 0) {
          return emptyResult({
            sourceId: config.sourceId,
            domain: config.domain,
            signal: signal(config.signalKey, 0),
            raw: { provider: 'wikipedia_search', query: config.query, count, reason: 'empty_result' },
          });
        }

        const value = normalizeCount(count, config.scale ?? 50000);
        const avgSnippetLength = search.reduce<number>((sum, item) => sum + String(item.snippet ?? '').length, 0) / Math.max(1, search.length);

        return observation({
          sourceId: config.sourceId,
          domain: config.domain,
          value,
          trust: config.trust ?? 0.56,
          velocity: value,
          volatility: clamp01(avgSnippetLength / 260),
          persistence: clamp01(value * 0.52),
          rawCount: count,
          signal: signal(config.signalKey, value),
          raw: {
            provider: 'wikipedia_search',
            query: config.query,
            result_count: search.length,
            total_hits: totalHits,
          },
        });
      } catch (error) {
        return degraded(config.sourceId, config.domain, error);
      }
    },
  };
}

function daysAgoCompact(daysAgo: number): string {
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function wikipediaPageviewsAdapter(config: {
  sourceId: string;
  domain: WorldSpectDomain;
  page: string;
  signalKey: SignalKey;
  scale?: number;
  trust?: number;
}): WorldSpectAdapter {
  return {
    sourceId: config.sourceId,
    async observe() {
      try {
        const page = encodeURIComponent(config.page.replace(/\s+/g, '_'));
        const start = daysAgoCompact(34);
        const end = daysAgoCompact(4);
        const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${page}/daily/${start}/${end}`;
        const json = record(await fetchJsonWithRetry(url, { timeoutMs: 18000, attempts: 2, baseDelayMs: 900 }));
        const items = array(json.items).map(record);
        const dailyValues = items.map((item) => finite(item.views, 0));
        const total = dailyValues.reduce<number>((sum, value) => sum + value, 0);

        if (total <= 0) {
          return emptyResult({
            sourceId: config.sourceId,
            domain: config.domain,
            signal: signal(config.signalKey, 0),
            raw: { provider: 'wikimedia_pageviews', page: config.page, total, reason: 'empty_result' },
          });
        }

        const value = normalizeCount(total, config.scale ?? 2500000);
        const avg = dailyValues.reduce<number>((sum, item) => sum + item, 0) / Math.max(1, dailyValues.length);
        const variance = dailyValues.reduce<number>((sum, item) => sum + Math.pow(item - avg, 2), 0) / Math.max(1, dailyValues.length);
        const volatility = clamp01(Math.sqrt(variance) / Math.max(1, avg * 3));

        return observation({
          sourceId: config.sourceId,
          domain: config.domain,
          value,
          trust: config.trust ?? 0.58,
          velocity: value,
          volatility,
          persistence: clamp01(value * 0.56),
          rawCount: total,
          signal: signal(config.signalKey, value),
          raw: {
            provider: 'wikimedia_pageviews',
            page: config.page,
            total_views: total,
            days: items.length,
            start,
            end,
          },
        });
      } catch (error) {
        return degraded(config.sourceId, config.domain, error);
      }
    },
  };
}

function worldBankEconomyAdapter(): WorldSpectAdapter {
  return {
    sourceId: 'economy_worldbank_public',
    async observe() {
      try {
        const json = await fetchJson('https://api.worldbank.org/v2/country/WLD/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=8');
        const rows = array(array(json)[1]).map(record);
        const latest = rows.find((row) => Number.isFinite(finite(row.value, NaN))) ?? rows[0] ?? {};
        const growth = finite(latest.value, NaN);

        if (!Number.isFinite(growth)) {
          return emptyResult({
            sourceId: 'economy_worldbank_public',
            domain: 'ECONOMY',
            signal: { economicStress: 0 },
            raw: { provider: 'worldbank', indicator: 'NY.GDP.MKTP.KD.ZG', latest, reason: 'value_missing' },
          });
        }

        const stress = clamp01(Math.abs(growth) / 8);

        return observation({
          sourceId: 'economy_worldbank_public',
          domain: 'ECONOMY',
          value: stress,
          trust: 0.72,
          velocity: stress,
          volatility: stress,
          persistence: clamp01(0.45 + stress * 0.35),
          rawCount: rows.length,
          signal: { economicStress: stress },
          raw: { provider: 'worldbank', indicator: 'NY.GDP.MKTP.KD.ZG', latest, raw_value: growth },
        });
      } catch (error) {
        return degraded('economy_worldbank_public', 'ECONOMY', error);
      }
    },
  };
}

function worldBankIndicatorAdapter(config: {
  sourceId: string;
  indicator: string;
  signalKey: SignalKey;
  transform?: 'absolute_8' | 'absolute_20' | 'direct_100';
  trust?: number;
}): WorldSpectAdapter {
  return {
    sourceId: config.sourceId,
    async observe() {
      try {
        const url = `https://api.worldbank.org/v2/country/WLD/indicator/${encodeURIComponent(config.indicator)}?format=json&per_page=8`;
        const json = await fetchJson(url);
        const rows = array(array(json)[1]).map(record);
        const latest = rows.find((row) => Number.isFinite(finite(row.value, NaN))) ?? rows[0] ?? {};
        const rawValue = finite(latest.value, NaN);

        if (!Number.isFinite(rawValue)) {
          return emptyResult({
            sourceId: config.sourceId,
            domain: 'ECONOMY',
            signal: signal(config.signalKey, 0),
            raw: { provider: 'worldbank', indicator: config.indicator, latest, reason: 'value_missing' },
          });
        }

        const divisor = config.transform === 'absolute_20'
          ? 20
          : config.transform === 'direct_100'
            ? 100
            : 8;

        const value = clamp01(Math.abs(rawValue) / divisor);

        return observation({
          sourceId: config.sourceId,
          domain: 'ECONOMY',
          value,
          trust: config.trust ?? 0.70,
          velocity: value,
          volatility: value,
          persistence: clamp01(0.42 + value * 0.36),
          rawCount: rows.length,
          signal: signal(config.signalKey, value),
          raw: {
            provider: 'worldbank',
            indicator: config.indicator,
            latest,
            raw_value: rawValue,
          },
        });
      } catch (error) {
        return degraded(config.sourceId, 'ECONOMY', error);
      }
    },
  };
}

function openMeteoClimateAdapter(): WorldSpectAdapter {
  return {
    sourceId: 'climate_open_meteo_public',
    async observe() {
      try {
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=20.6736&longitude=-103.344&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=UTC';
        const json = record(await fetchJsonWithRetry(url, { timeoutMs: 18000, attempts: 2, baseDelayMs: 900 }));
        const current = record(json.current);
        const temp = finite(current.temperature_2m, 22);
        const humidity = finite(current.relative_humidity_2m, 50);
        const wind = finite(current.wind_speed_10m, 0);
        const heatStress = clamp01(Math.abs(temp - 22) / 22);
        const humidityStress = clamp01(Math.abs(humidity - 50) / 50);
        const windStress = clamp01(wind / 80);
        const value = clamp01(heatStress * 0.44 + humidityStress * 0.24 + windStress * 0.32);

        return observation({
          sourceId: 'climate_open_meteo_public',
          domain: 'CLIMATE',
          value,
          trust: 0.68,
          velocity: windStress,
          volatility: clamp01(heatStress + humidityStress / 2),
          persistence: clamp01(0.38 + value * 0.42),
          rawCount: 1,
          signal: { climateStress: value },
          raw: { provider: 'open_meteo', current },
        });
      } catch (error) {
        return degraded('climate_open_meteo_public', 'CLIMATE', error);
      }
    },
  };
}

function clinicalTrialsBioAdapter(): WorldSpectAdapter {
  return {
    sourceId: 'bio_clinicaltrials_public',
    async observe() {
      try {
        const json = record(await fetchJson('https://clinicaltrials.gov/api/v2/studies?query.term=health&format=json&pageSize=10'));
        const studies = array(json.studies);
        const count = studies.length;

        if (count === 0) {
          return emptyResult({
            sourceId: 'bio_clinicaltrials_public',
            domain: 'BIO',
            signal: { bioStress: 0 },
            raw: { provider: 'clinicaltrials_gov', count, reason: 'empty_result' },
          });
        }

        const value = normalizeCount(count, 10);

        return observation({
          sourceId: 'bio_clinicaltrials_public',
          domain: 'BIO',
          value,
          trust: 0.58,
          velocity: value,
          volatility: clamp01(value * 0.35),
          persistence: clamp01(value * 0.55),
          rawCount: count,
          signal: { bioStress: value },
          raw: { provider: 'clinicaltrials_gov', count },
        });
      } catch (error) {
        return degraded('bio_clinicaltrials_public', 'BIO', error);
      }
    },
  };
}

export function getWorldSpectPublicAdapters(): WorldSpectAdapter[] {
  return [
    wikipediaSearchAdapter({
      sourceId: 'cultural_wikipedia_public',
      domain: 'CULTURAL',
      query: 'culture music film art literature festival',
      signalKey: 'attention',
      trust: 0.56,
      scale: 80000,
    }),
    wikipediaPageviewsAdapter({
      sourceId: 'cultural_wikimedia_pageviews_public',
      domain: 'CULTURAL',
      page: 'Culture',
      signalKey: 'attention',
      trust: 0.58,
      scale: 2500000,
    }),

    worldBankEconomyAdapter(),
    worldBankIndicatorAdapter({
      sourceId: 'economy_worldbank_inflation_public',
      indicator: 'FP.CPI.TOTL.ZG',
      signalKey: 'economicStress',
      transform: 'absolute_20',
      trust: 0.70,
    }),

    hnSearchAdapter({
      sourceId: 'geo_digital_hn_public',
      domain: 'GEO_DIGITAL',
      query: 'platform network social AI infrastructure',
      signalKey: 'attention',
      scale: 100000,
      trust: 0.62,
    }),
    githubSearchAdapter({
      sourceId: 'geo_digital_github_public',
      domain: 'GEO_DIGITAL',
      query: 'platform OR network OR social OR infrastructure',
      signalKey: 'attention',
      scale: 10000000,
      trust: 0.60,
    }),

    wikipediaSearchAdapter({
      sourceId: 'geopolitical_wikipedia_public',
      domain: 'GEOPOLITICAL',
      query: 'geopolitics conflict election diplomacy sanctions border',
      signalKey: 'geoStress',
      trust: 0.55,
      scale: 70000,
    }),
    wikipediaPageviewsAdapter({
      sourceId: 'geopolitical_wikimedia_pageviews_public',
      domain: 'GEOPOLITICAL',
      page: 'Geopolitics',
      signalKey: 'geoStress',
      trust: 0.56,
      scale: 1200000,
    }),

    clinicalTrialsBioAdapter(),
    wikipediaPageviewsAdapter({
      sourceId: 'bio_wikimedia_pageviews_public',
      domain: 'BIO',
      page: 'Health',
      signalKey: 'bioStress',
      trust: 0.54,
      scale: 2500000,
    }),

    openMeteoClimateAdapter(),
    wikipediaSearchAdapter({
      sourceId: 'climate_wikipedia_public',
      domain: 'CLIMATE',
      query: 'climate change heatwave drought flood carbon emissions weather',
      signalKey: 'climateStress',
      trust: 0.56,
      scale: 80000,
    }),

    wikipediaSearchAdapter({
      sourceId: 'institutional_wikipedia_public',
      domain: 'INSTITUTIONAL',
      query: 'institution governance regulation law policy public administration',
      signalKey: 'institutionalStress',
      trust: 0.55,
      scale: 70000,
    }),
    wikipediaPageviewsAdapter({
      sourceId: 'institutional_wikimedia_pageviews_public',
      domain: 'INSTITUTIONAL',
      page: 'Institution',
      signalKey: 'institutionalStress',
      trust: 0.55,
      scale: 1200000,
    }),

    wikipediaSearchAdapter({
      sourceId: 'memetic_wikipedia_public',
      domain: 'MEMETIC',
      query: 'internet meme viral trend narrative attention social media',
      signalKey: 'memeticPressure',
      trust: 0.52,
      scale: 60000,
    }),
    wikipediaPageviewsAdapter({
      sourceId: 'memetic_wikimedia_pageviews_public',
      domain: 'MEMETIC',
      page: 'Internet meme',
      signalKey: 'memeticPressure',
      trust: 0.54,
      scale: 1600000,
    }),

    githubTechAdapter(),
    hnSearchAdapter({
      sourceId: 'tech_hn_public',
      domain: 'TECH',
      query: 'AI agent model software compute',
      signalKey: 'techStress',
      scale: 100000,
      trust: 0.58,
    }),

    githubSearchAdapter({
      sourceId: 'affective_github_sentiment_public',
      domain: 'AFFECTIVE',
      query: 'sentiment analysis emotion anxiety mental-health',
      signalKey: 'affect',
      scale: 10000000,
      trust: 0.56,
    }),
    githubSearchAdapter({
      sourceId: 'affective_github_mental_health_public',
      domain: 'AFFECTIVE',
      query: 'mental-health OR burnout OR anxiety OR wellbeing',
      signalKey: 'affect',
      scale: 10000000,
      trust: 0.54,
    }),
  ];
}



