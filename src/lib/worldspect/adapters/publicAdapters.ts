import type { SourceObservation, WorldSpectAdapter, WorldSpectDomain, SourceAdapterStatus, SourceAccessKind } from '../source-adapter-contract'
import { clamp01 } from '../vector-aggregator'

type JsonRecord = Record<string, unknown>
type SignalKey = keyof SourceObservation['signal']

const DEFAULT_TIMEOUT_MS = 16000

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function finite(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeCount(count: number, scale: number) {
  return clamp01(Math.log10(Math.max(0, count) + 1) / Math.log10(scale + 1))
}

function todayIso() {
  return new Date().toISOString()
}

async function fetchJson(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json,text/plain;q=0.8,*/*;q=0.5',
        'user-agent': 'SystemFrictionInstitute-WorldSpect/2.0',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`http_${response.status}`)
    }

    const text = await response.text()
    if (!text.trim()) return {}
    return JSON.parse(text)
  } finally {
    clearTimeout(timeout)
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchJsonWithRetry(url: string, input: {
  timeoutMs?: number
  attempts?: number
  baseDelayMs?: number
} = {}): Promise<unknown> {
  const attempts = Math.max(1, input.attempts ?? 2)
  const baseDelayMs = Math.max(0, input.baseDelayMs ?? 900)
  let lastError: unknown = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchJson(url, input.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      const retryable = message.includes('aborted') || message.includes('fetch failed') || message.includes('http_429') || message.includes('429')
      if (!retryable || attempt >= attempts) break
      await sleep(baseDelayMs * attempt)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? 'fetch_failed'))
}

function observation(input: {
  sourceId: string
  domain: WorldSpectDomain
  value: number
  trust: number
  velocity?: number
  volatility?: number
  persistence?: number
  rawCount?: number
  status?: SourceAdapterStatus
  accessKind?: SourceAccessKind
  signal?: SourceObservation['signal']
  raw?: unknown
  error?: string | null
}): SourceObservation {
  const trust = clamp01(input.trust)
  const status = input.status ?? (trust > 0 ? 'ACTIVE' : 'DEGRADED_BLOCKING')
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
  }
}

function emptyResult(input: {
  sourceId: string
  domain: WorldSpectDomain
  raw?: unknown
  signal?: SourceObservation['signal']
  accessKind?: SourceAccessKind
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
  })
}

function degraded(sourceId: string, domain: WorldSpectDomain, error: unknown): SourceObservation {
  const message = error instanceof Error ? error.message : String(error)
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
  })
}

function signal(signalKey: SignalKey, value: number): SourceObservation['signal'] {
  return { [signalKey]: clamp01(value) } as SourceObservation['signal']
}

function gdeltAdapter(config: {
  sourceId: string
  domain: WorldSpectDomain
  query: string
  signalKey: SignalKey
  scale?: number
}): WorldSpectAdapter {
  return {
    sourceId: config.sourceId,
    async observe() {
      try {
        const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(config.query)}&mode=artlist&format=json&maxrecords=50&sort=hybridrel`
        const json = record(await fetchJsonWithRetry(url, { timeoutMs: 18000, attempts: 2, baseDelayMs: 1400 }))
        const articles = array(json.articles)
        const count = articles.length
        if (count === 0) {
          return emptyResult({
            sourceId: config.sourceId,
            domain: config.domain,
            signal: signal(config.signalKey, 0),
            raw: { provider: 'gdelt', count, query: config.query, reason: 'empty_result' },
          })
        }
        const value = normalizeCount(count, config.scale ?? 50)
        const avgTitleLength = articles.reduce<number>((sum, item) => {
          const title = String(record(item).title ?? '')
          return sum + title.length
        }, 0) / Math.max(1, count)
        const volatility = clamp01(avgTitleLength / 160)

        return observation({
          sourceId: config.sourceId,
          domain: config.domain,
          value,
          trust: 0.66,
          velocity: value,
          volatility,
          persistence: clamp01(value * 0.72),
          rawCount: count,
          signal: signal(config.signalKey, value),
          raw: { provider: 'gdelt', count, query: config.query },
        })
      } catch (error) {
        return degraded(config.sourceId, config.domain, error)
      }
    },
  }
}

function hnSearchAdapter(config: {
  sourceId: string
  domain: WorldSpectDomain
  query: string
  signalKey: SignalKey
  scale?: number
  trust?: number
}): WorldSpectAdapter {
  return {
    sourceId: config.sourceId,
    async observe() {
      try {
        const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(config.query)}&tags=story`
        const json = record(await fetchJsonWithRetry(url, { timeoutMs: 18000, attempts: 2, baseDelayMs: 1400 }))
        const hits = finite(json.nbHits, 0)
        if (hits === 0) {
          return emptyResult({
            sourceId: config.sourceId,
            domain: config.domain,
            signal: signal(config.signalKey, 0),
            raw: { provider: 'hn_algolia', query: config.query, hits, reason: 'empty_result' },
          })
        }
        const value = normalizeCount(hits, config.scale ?? 100000)
        return observation({
          sourceId: config.sourceId,
          domain: config.domain,
          value,
          trust: config.trust ?? 0.6,
          velocity: value,
          volatility: clamp01(value * 0.48),
          persistence: clamp01(value * 0.62),
          rawCount: hits,
          signal: signal(config.signalKey, value),
          raw: { provider: 'hn_algolia', query: config.query, hits },
        })
      } catch (error) {
        return degraded(config.sourceId, config.domain, error)
      }
    },
  }
}

function worldBankEconomyAdapter(): WorldSpectAdapter {
  return {
    sourceId: 'economy_worldbank_public',
    async observe() {
      try {
        const json = await fetchJson('https://api.worldbank.org/v2/country/WLD/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=5')
        const rows = array(array(json)[1])
        if (rows.length === 0) {
          return emptyResult({
            sourceId: 'economy_worldbank_public',
            domain: 'ECONOMY',
            signal: { economicStress: 0 },
            raw: { provider: 'worldbank', indicator: 'NY.GDP.MKTP.KD.ZG', reason: 'empty_result' },
          })
        }
        const latest = record(rows.find((row) => Number.isFinite(finite(record(row).value, NaN))) ?? rows[0])
        const growth = finite(latest.value, 0)
        const stress = clamp01(Math.abs(growth) / 8)
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
          raw: { provider: 'worldbank', indicator: 'NY.GDP.MKTP.KD.ZG', latest },
        })
      } catch (error) {
        return degraded('economy_worldbank_public', 'ECONOMY', error)
      }
    },
  }
}

function openMeteoClimateAdapter(): WorldSpectAdapter {
  return {
    sourceId: 'climate_open_meteo_public',
    async observe() {
      try {
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=20.6736&longitude=-103.344&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=UTC'
        const json = record(await fetchJsonWithRetry(url, { timeoutMs: 18000, attempts: 2, baseDelayMs: 1400 }))
        const current = record(json.current)
        const temp = finite(current.temperature_2m, 22)
        const humidity = finite(current.relative_humidity_2m, 50)
        const wind = finite(current.wind_speed_10m, 0)
        const heatStress = clamp01(Math.abs(temp - 22) / 22)
        const humidityStress = clamp01(Math.abs(humidity - 50) / 50)
        const windStress = clamp01(wind / 80)
        const value = clamp01(heatStress * 0.44 + humidityStress * 0.24 + windStress * 0.32)
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
        })
      } catch (error) {
        return degraded('climate_open_meteo_public', 'CLIMATE', error)
      }
    },
  }
}

function clinicalTrialsBioAdapter(): WorldSpectAdapter {
  return {
    sourceId: 'bio_clinicaltrials_public',
    async observe() {
      try {
        const json = record(await fetchJson('https://clinicaltrials.gov/api/v2/studies?query.term=health&format=json&pageSize=10'))
        const studies = array(json.studies)
        const count = studies.length
        if (count === 0) {
          return emptyResult({
            sourceId: 'bio_clinicaltrials_public',
            domain: 'BIO',
            signal: { bioStress: 0 },
            raw: { provider: 'clinicaltrials_gov', count, reason: 'empty_result' },
          })
        }
        const value = normalizeCount(count, 10)
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
        })
      } catch (error) {
        return degraded('bio_clinicaltrials_public', 'BIO', error)
      }
    },
  }
}

function githubTechAdapter(): WorldSpectAdapter {
  return {
    sourceId: 'tech_github_public',
    async observe() {
      try {
        const json = record(await fetchJson('https://api.github.com/search/repositories?q=AI+OR+machine-learning+OR+agent&sort=updated&order=desc&per_page=1'))
        const total = finite(json.total_count, 0)
        if (total === 0) {
          return emptyResult({
            sourceId: 'tech_github_public',
            domain: 'TECH',
            signal: { techStress: 0, attention: 0 },
            raw: { provider: 'github_search', total_count: total, reason: 'empty_result' },
          })
        }
        const value = normalizeCount(total, 10000000)
        return observation({
          sourceId: 'tech_github_public',
          domain: 'TECH',
          value,
          trust: 0.64,
          velocity: value,
          volatility: clamp01(value * 0.42),
          persistence: clamp01(value * 0.62),
          rawCount: total,
          signal: { techStress: value, attention: value },
          raw: { provider: 'github_search', total_count: total },
        })
      } catch (error) {
        return degraded('tech_github_public', 'TECH', error)
      }
    },
  }
}

async function readInternalCorpus(): Promise<string> {
  return ''
}

function countKeywords(text: string, keywords: string[]) {
  return keywords.reduce((sum, keyword) => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const matches = text.match(new RegExp(escaped, 'g'))
    return sum + (matches?.length ?? 0)
  }, 0)
}

function internalEvidenceScore(text: string, keywords: string[]) {
  const counts = keywords.map((keyword) => countKeywords(text, [keyword]))
  const total = counts.reduce((sum, count) => sum + count, 0)
  const matched = counts.filter((count) => count > 0).length
  const diversity = clamp01(matched / Math.max(1, keywords.length))
  // Softer than normalizeCount(total, 40). Prevents internal evidence from saturating every vector.
  const intensity = clamp01(Math.log10(total + 1) / Math.log10(180))
  const value = clamp01((intensity * 0.62 + diversity * 0.38) * 0.82)
  return { total, matched, diversity, intensity, value }
}

function internalEvidenceAdapter(config: {
  sourceId: string
  domain: WorldSpectDomain
  keywords: string[]
  signalKey: SignalKey
  trust?: number
}): WorldSpectAdapter {
  return {
    sourceId: config.sourceId,
    async observe() {
      try {
        const corpus = await readInternalCorpus()
        const score = internalEvidenceScore(corpus, config.keywords)
        if (score.total === 0) {
          return emptyResult({
            sourceId: config.sourceId,
            domain: config.domain,
            accessKind: 'internal-evidence',
            signal: signal(config.signalKey, 0),
            raw: {
              provider: 'sfi_internal_evidence',
              keyword_count: 0,
              matched_keywords: 0,
              reason: 'empty_result',
              keywords: config.keywords,
            },
          })
        }
        return observation({
          sourceId: config.sourceId,
          domain: config.domain,
          value: score.value,
          trust: clamp01((config.trust ?? 0.48) + score.diversity * 0.12),
          velocity: clamp01(score.value * 0.42),
          volatility: clamp01((1 - score.diversity) * 0.34 + score.value * 0.16),
          persistence: clamp01(score.value * 0.48 + score.diversity * 0.18),
          rawCount: score.total,
          accessKind: 'internal-evidence',
          signal: signal(config.signalKey, score.value),
          raw: {
            provider: 'sfi_internal_evidence',
            keyword_count: score.total,
            matched_keywords: score.matched,
            diversity: Number(score.diversity.toFixed(4)),
            intensity: Number(score.intensity.toFixed(4)),
            calibrated: true,
            keywords: config.keywords,
          },
        })
      } catch (error) {
        return degraded(config.sourceId, config.domain, error)
      }
    },
  }
}


function wikipediaSearchAdapter(config: {
  sourceId: string
  domain: WorldSpectDomain
  query: string
  signalKey: SignalKey
  scale?: number
  trust?: number
}): WorldSpectAdapter {
  return {
    sourceId: config.sourceId,
    async observe() {
      try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(config.query)}&srlimit=50&format=json&origin=*`
        const json = record(await fetchJsonWithRetry(url, { timeoutMs: 18000, attempts: 2, baseDelayMs: 900 }))
        const query = record(json.query)
        const search = array(query.search)
        const searchInfo = record(query.searchinfo)
        const totalHits = finite(searchInfo.totalhits, search.length)
        const count = Math.max(search.length, totalHits)

        if (count === 0) {
          return emptyResult({
            sourceId: config.sourceId,
            domain: config.domain,
            signal: signal(config.signalKey, 0),
            raw: { provider: 'wikipedia_search', query: config.query, count, reason: 'empty_result' },
          })
        }

        const value = normalizeCount(count, config.scale ?? 50000)
        const avgSnippetLength = search.reduce<number>((sum, item) => {
          const snippet = String(record(item).snippet ?? '')
          return sum + snippet.length
        }, 0) / Math.max(1, search.length)

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
        })
      } catch (error) {
        return degraded(config.sourceId, config.domain, error)
      }
    },
  }
}

function reliefWebReportsAdapter(config: {
  sourceId: string
  domain: WorldSpectDomain
  query: string
  signalKey: SignalKey
  scale?: number
  trust?: number
}): WorldSpectAdapter {
  return {
    sourceId: config.sourceId,
    async observe() {
      try {
        const url = `https://api.reliefweb.int/v1/reports?appname=systemfriction-worldspect&profile=list&preset=latest&limit=50&query[value]=${encodeURIComponent(config.query)}`
        const json = record(await fetchJsonWithRetry(url, { timeoutMs: 18000, attempts: 2, baseDelayMs: 900 }))
        const data = array(json.data)
        const totalCount = finite(record(json.totalCount).value, data.length)
        const count = Math.max(data.length, totalCount)

        if (count === 0) {
          return emptyResult({
            sourceId: config.sourceId,
            domain: config.domain,
            signal: signal(config.signalKey, 0),
            raw: { provider: 'reliefweb_reports', query: config.query, count, reason: 'empty_result' },
          })
        }

        const value = normalizeCount(count, config.scale ?? 5000)
        const recentItems = data.slice(0, 10).map((item) => {
          const fields = record(record(item).fields)
          return {
            title: fields.title ?? null,
            date: fields.date ?? null,
            country: fields.country ?? null,
            source: fields.source ?? null,
          }
        })

        return observation({
          sourceId: config.sourceId,
          domain: config.domain,
          value,
          trust: config.trust ?? 0.62,
          velocity: value,
          volatility: clamp01(value * 0.46),
          persistence: clamp01(value * 0.58),
          rawCount: count,
          signal: signal(config.signalKey, value),
          raw: {
            provider: 'reliefweb_reports',
            query: config.query,
            result_count: data.length,
            total_count: totalCount,
            recent_items: recentItems,
          },
        })
      } catch (error) {
        return degraded(config.sourceId, config.domain, error)
      }
    },
  }
}
export function getWorldSpectPublicAdapters(): WorldSpectAdapter[] {
  return [
    // EXTERNAL WORLD EYES ONLY.
    // WorldSpect observes the outside world.
    // Internal SFI evidence belongs to ScoreFriction / SFI Response.

    wikipediaSearchAdapter({
      sourceId: 'cultural_wikipedia_public',
      domain: 'CULTURAL',
      query: 'culture music film art literature festival',
      signalKey: 'attention',
      trust: 0.56,
      scale: 80000,
    }),

    worldBankEconomyAdapter(),

    hnSearchAdapter({
      sourceId: 'geo_digital_hn_public',
      domain: 'GEO_DIGITAL',
      query: 'platform network social AI infrastructure',
      signalKey: 'attention',
      scale: 100000,
      trust: 0.62,
    }),

    reliefWebReportsAdapter({
      sourceId: 'geopolitical_reliefweb_public',
      domain: 'GEOPOLITICAL',
      query: 'conflict displacement border election diplomacy sanctions',
      signalKey: 'geoStress',
      trust: 0.62,
      scale: 5000,
    }),

    clinicalTrialsBioAdapter(),

    openMeteoClimateAdapter(),

    reliefWebReportsAdapter({
      sourceId: 'institutional_reliefweb_public',
      domain: 'INSTITUTIONAL',
      query: 'governance coordination regulation institution policy response',
      signalKey: 'institutionalStress',
      trust: 0.60,
      scale: 5000,
    }),

    wikipediaSearchAdapter({
      sourceId: 'memetic_wikipedia_public',
      domain: 'MEMETIC',
      query: 'internet meme viral trend narrative attention social media',
      signalKey: 'memeticPressure',
      trust: 0.52,
      scale: 60000,
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

    wikipediaSearchAdapter({
      sourceId: 'affective_wikipedia_public',
      domain: 'AFFECTIVE',
      query: 'anxiety anger fear hope sentiment emotion society',
      signalKey: 'affect',
      trust: 0.52,
      scale: 60000,
    }),
  ]
}




