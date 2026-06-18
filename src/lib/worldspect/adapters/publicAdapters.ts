import type { SourceObservation, WorldSpectAdapter, WorldSpectDomain, SourceAdapterStatus } from '../source-adapter-contract'
import { clamp01 } from '../vector-aggregator'

type JsonRecord = Record<string, unknown>

const DEFAULT_TIMEOUT_MS = 8500

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

async function fetchJson(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json,text/plain;q=0.8,*/*;q=0.5',
        'user-agent': 'SystemFrictionInstitute-WorldSpectrumVector/1.0',
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
  signal?: SourceObservation['signal']
  raw?: unknown
  error?: string | null
}): SourceObservation {
  const trust = clamp01(input.trust)
  const status = input.status ?? (trust > 0 ? 'ACTIVE' : 'DEGRADED_BLOCKING')
  return {
    sourceId: input.sourceId,
    domain: input.domain,
    observedAt: new Date().toISOString(),
    accessKind: 'public-api',
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

function gdeltAdapter(config: {
  sourceId: string
  domain: WorldSpectDomain
  query: string
  signalKey: keyof SourceObservation['signal']
  scale?: number
}): WorldSpectAdapter {
  return {
    sourceId: config.sourceId,
    async observe() {
      try {
        const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(config.query)}&mode=artlist&format=json&maxrecords=50&sort=hybridrel`
        const json = record(await fetchJson(url))
        const articles = array(json.articles)
        const count = articles.length
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
          trust: count > 0 ? 0.66 : 0,
          velocity: value,
          volatility,
          persistence: clamp01(value * 0.72),
          rawCount: count,
          signal: { [config.signalKey]: value },
          raw: { provider: 'gdelt', count, query: config.query },
        })
      } catch (error) {
        return degraded(config.sourceId, config.domain, error)
      }
    },
  }
}

export function getWorldSpectPublicAdapters(): WorldSpectAdapter[] {
  return [
    gdeltAdapter({
      sourceId: 'cultural_gdelt_public',
      domain: 'CULTURAL',
      query: '(culture OR music OR film OR art OR literature)',
      signalKey: 'attention',
    }),
    gdeltAdapter({
      sourceId: 'geopolitical_gdelt_public',
      domain: 'GEOPOLITICAL',
      query: '(geopolitical OR conflict OR election OR border OR diplomacy)',
      signalKey: 'geoStress',
    }),
    gdeltAdapter({
      sourceId: 'bio_gdelt_public',
      domain: 'BIO',
      query: '(health OR disease OR outbreak OR hospital OR organism)',
      signalKey: 'bioStress',
    }),
    gdeltAdapter({
      sourceId: 'climate_gdelt_public',
      domain: 'CLIMATE',
      query: '(climate OR weather OR flood OR drought OR heatwave OR carbon)',
      signalKey: 'climateStress',
    }),
    gdeltAdapter({
      sourceId: 'institutional_gdelt_public',
      domain: 'INSTITUTIONAL',
      query: '(institution OR governance OR regulation OR law OR public policy)',
      signalKey: 'institutionalStress',
    }),
    gdeltAdapter({
      sourceId: 'memetic_gdelt_public',
      domain: 'MEMETIC',
      query: '(viral OR meme OR trend OR narrative OR attention)',
      signalKey: 'memeticPressure',
    }),
    gdeltAdapter({
      sourceId: 'affective_gdelt_public',
      domain: 'AFFECTIVE',
      query: '(emotion OR anger OR anxiety OR fear OR hope OR sentiment)',
      signalKey: 'affect',
    }),
    {
      sourceId: 'economy_worldbank_public',
      async observe() {
        try {
          const json = await fetchJson('https://api.worldbank.org/v2/country/WLD/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=3')
          const rows = array(array(json)[1])
          const latest = record(rows.find((row) => finite(record(row).value, NaN) === finite(record(row).value, NaN)) ?? rows[0])
          const growth = finite(latest.value, 0)
          const stress = clamp01(Math.abs(growth) / 8)
          return observation({
            sourceId: 'economy_worldbank_public',
            domain: 'ECONOMY',
            value: stress,
            trust: rows.length > 0 ? 0.72 : 0,
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
    },
    {
      sourceId: 'geo_digital_hn_public',
      async observe() {
        try {
          const json = record(await fetchJson('https://hn.algolia.com/api/v1/search?query=platform%20network%20social%20AI&tags=story'))
          const hits = finite(json.nbHits, 0)
          const value = normalizeCount(hits, 100000)
          return observation({
            sourceId: 'geo_digital_hn_public',
            domain: 'GEO_DIGITAL',
            value,
            trust: hits > 0 ? 0.62 : 0,
            velocity: value,
            volatility: clamp01(value * 0.5),
            persistence: clamp01(value * 0.58),
            rawCount: hits,
            signal: { attention: value },
            raw: { provider: 'hn_algolia', hits },
          })
        } catch (error) {
          return degraded('geo_digital_hn_public', 'GEO_DIGITAL', error)
        }
      },
    },
    {
      sourceId: 'tech_github_public',
      async observe() {
        try {
          const json = record(await fetchJson('https://api.github.com/search/repositories?q=AI+OR+machine-learning+OR+agent&sort=updated&order=desc&per_page=1'))
          const total = finite(json.total_count, 0)
          const value = normalizeCount(total, 10000000)
          return observation({
            sourceId: 'tech_github_public',
            domain: 'TECH',
            value,
            trust: total > 0 ? 0.64 : 0,
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
    },
  ]
}
