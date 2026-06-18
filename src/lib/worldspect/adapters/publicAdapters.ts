import fs from 'fs/promises'
import path from 'path'
import type { SourceObservation, WorldSpectAdapter, WorldSpectDomain, SourceAdapterStatus, SourceAccessKind } from '../source-adapter-contract'
import { clamp01 } from '../vector-aggregator'

type JsonRecord = Record<string, unknown>
type SignalKey = keyof SourceObservation['signal']

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
        'user-agent': 'SystemFrictionInstitute-WorldSpectrumVector/2.0',
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
        const json = record(await fetchJson(url))
        const hits = finite(json.nbHits, 0)
        const value = normalizeCount(hits, config.scale ?? 100000)
        return observation({
          sourceId: config.sourceId,
          domain: config.domain,
          value,
          trust: hits > 0 ? (config.trust ?? 0.6) : 0,
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
        const latest = record(rows.find((row) => Number.isFinite(finite(record(row).value, NaN))) ?? rows[0])
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
  }
}

function openMeteoClimateAdapter(): WorldSpectAdapter {
  return {
    sourceId: 'climate_open_meteo_public',
    async observe() {
      try {
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=20.6736&longitude=-103.344&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=UTC'
        const json = record(await fetchJson(url))
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
        const value = normalizeCount(count, 10)
        return observation({
          sourceId: 'bio_clinicaltrials_public',
          domain: 'BIO',
          value,
          trust: count > 0 ? 0.58 : 0,
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
  }
}

async function readInternalCorpus(): Promise<string> {
  const root = process.cwd()
  const candidates = [
    'data/amv-learning.jsonl',
    'data/logbook-visible.jsonl',
    'data/sfi-operational-events.json',
    'docs/QA_RUNTIME_REPORT.md',
    'docs/QA_SFI_CONVERGENCE_REPORT.md',
    'docs/qa/SFI_CLOSED_LOOP_QA.md',
    'docs/SFI_PIPELINE_MINIMAL_PATCH.md',
  ]

  const chunks = await Promise.all(candidates.map(async (relative) => {
    try {
      return await fs.readFile(path.join(root, relative), 'utf8')
    } catch {
      return ''
    }
  }))

  return chunks.join('\n').toLowerCase()
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
        return observation({
          sourceId: config.sourceId,
          domain: config.domain,
          value: score.value,
          trust: score.total > 0 ? clamp01((config.trust ?? 0.48) + score.diversity * 0.12) : 0,
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

export function getWorldSpectPublicAdapters(): WorldSpectAdapter[] {
  return [
    // PUBLIC EXTERNAL SIGNALS
    gdeltAdapter({
      sourceId: 'cultural_gdelt_public',
      domain: 'CULTURAL',
      query: '(culture OR music OR film OR art OR literature)',
      signalKey: 'attention',
    }),
    hnSearchAdapter({
      sourceId: 'cultural_hn_public',
      domain: 'CULTURAL',
      query: 'music culture film art writing',
      signalKey: 'attention',
      trust: 0.54,
    }),
    gdeltAdapter({
      sourceId: 'geopolitical_gdelt_public',
      domain: 'GEOPOLITICAL',
      query: '(geopolitical OR conflict OR election OR border OR diplomacy)',
      signalKey: 'geoStress',
    }),
    hnSearchAdapter({
      sourceId: 'geopolitical_hn_public',
      domain: 'GEOPOLITICAL',
      query: 'election policy conflict government regulation',
      signalKey: 'geoStress',
      trust: 0.52,
    }),
    gdeltAdapter({
      sourceId: 'bio_gdelt_public',
      domain: 'BIO',
      query: '(health OR disease OR outbreak OR hospital OR organism)',
      signalKey: 'bioStress',
    }),
    clinicalTrialsBioAdapter(),
    gdeltAdapter({
      sourceId: 'climate_gdelt_public',
      domain: 'CLIMATE',
      query: '(climate OR weather OR flood OR drought OR heatwave OR carbon)',
      signalKey: 'climateStress',
    }),
    openMeteoClimateAdapter(),
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
    hnSearchAdapter({
      sourceId: 'memetic_hn_public',
      domain: 'MEMETIC',
      query: 'viral meme trend narrative attention',
      signalKey: 'memeticPressure',
      trust: 0.53,
    }),
    gdeltAdapter({
      sourceId: 'affective_gdelt_public',
      domain: 'AFFECTIVE',
      query: '(emotion OR anger OR anxiety OR fear OR hope OR sentiment)',
      signalKey: 'affect',
    }),
    hnSearchAdapter({
      sourceId: 'affective_hn_public',
      domain: 'AFFECTIVE',
      query: 'anxiety anger fear hope sentiment',
      signalKey: 'affect',
      trust: 0.51,
    }),
    worldBankEconomyAdapter(),
    hnSearchAdapter({
      sourceId: 'geo_digital_hn_public',
      domain: 'GEO_DIGITAL',
      query: 'platform network social AI',
      signalKey: 'attention',
      scale: 100000,
      trust: 0.62,
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

    // REAL INTERNAL EVIDENCE BACKSTOPS.
    // These are not synthetic values. They are derived from persisted SFI evidence/logbooks/docs.
    internalEvidenceAdapter({
      sourceId: 'cultural_sfi_internal_evidence',
      domain: 'CULTURAL',
      keywords: ['culture', 'cultural', 'music', 'song', 'film', 'cinema', 'writing', 'art', 'campaign', 'kxtxr', 'rem618'],
      signalKey: 'attention',
    }),
    internalEvidenceAdapter({
      sourceId: 'geopolitical_sfi_internal_evidence',
      domain: 'GEOPOLITICAL',
      keywords: ['geopolitical', 'policy', 'political', 'government', 'regime', 'conflict', 'governance'],
      signalKey: 'geoStress',
    }),
    internalEvidenceAdapter({
      sourceId: 'bio_sfi_internal_evidence',
      domain: 'BIO',
      keywords: ['bio', 'health', 'body', 'organism', 'medical', 'disease', 'wellbeing'],
      signalKey: 'bioStress',
    }),
    internalEvidenceAdapter({
      sourceId: 'climate_sfi_internal_evidence',
      domain: 'CLIMATE',
      keywords: ['climate', 'weather', 'heat', 'temperature', 'carbon', 'flood', 'drought'],
      signalKey: 'climateStress',
    }),
    internalEvidenceAdapter({
      sourceId: 'institutional_sfi_internal_evidence',
      domain: 'INSTITUTIONAL',
      keywords: ['institution', 'governance', 'law', 'regulation', 'root', 'evidence', 'logbook', 'supabase'],
      signalKey: 'institutionalStress',
    }),
    internalEvidenceAdapter({
      sourceId: 'memetic_sfi_internal_evidence',
      domain: 'MEMETIC',
      keywords: ['meme', 'memetic', 'trend', 'viral', 'attention', 'narrative', 'signal'],
      signalKey: 'memeticPressure',
    }),
    internalEvidenceAdapter({
      sourceId: 'tech_sfi_internal_evidence',
      domain: 'TECH',
      keywords: ['tech', 'technology', 'ai', 'model', 'python', 'typescript', 'api', 'software', 'code', 'github'],
      signalKey: 'techStress',
    }),
    internalEvidenceAdapter({
      sourceId: 'affective_sfi_internal_evidence',
      domain: 'AFFECTIVE',
      keywords: ['affective', 'emotion', 'anger', 'fear', 'hope', 'anxiety', 'sentiment', 'friction'],
      signalKey: 'affect',
    }),
  ]
}
