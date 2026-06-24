export type WorldSpectDomain =
  | 'CULTURAL' | 'ECONOMY' | 'GEO_DIGITAL' | 'GEOPOLITICAL' | 'BIO'
  | 'CLIMATE' | 'INSTITUTIONAL' | 'MEMETIC' | 'TECH' | 'AFFECTIVE'

export type WorldSpectLayer =
  | 'PHYSICAL'
  | 'MACRO'
  | 'MARKET'
  | 'ATTENTION'
  | 'DIGITAL_ACTIVITY'
  | 'INSTITUTIONAL_R_AND_D'
  | 'AFFECTIVE_PROXY'
  | 'GOVERNANCE'
  | 'BIO_HEALTH'
  | 'UNKNOWN'

export type SourceMeaning = {
  indicator: string
  description: string
  high_means: string
  low_means: string
}

export type SourceAccessKind =
  | 'public-api'
  | 'oauth'
  | 'official-feed'
  | 'manual-upload'
  | 'internal-evidence'
  | 'licensed-api'

export type SourceAdapterStatus =
  | 'ACTIVE'
  | 'BOOTSTRAPPED'
  | 'EMPTY_RESULT'
  | 'MISSING_DATA'
  | 'STALE_DATA'
  | 'AWAITING_CREDENTIALS'
  | 'RATE_LIMITED'
  | 'DEGRADED_BLOCKING'
  | 'DISABLED'

export type SourceObservation = {
  sourceId: string
  domain: WorldSpectDomain
  layer: WorldSpectLayer
  meaning: SourceMeaning
  observedAt: string
  accessKind: SourceAccessKind
  status: SourceAdapterStatus
  value: number | null
  velocity: number
  volatility: number
  persistence: number
  rawCount: number
  sourceCount: number
  trust: number
  degradation: number
  signal: {
    attention?: number
    recurrence?: number
    novelty?: number
    affect?: number
    controversy?: number
    institutionalStress?: number
    economicStress?: number
    geoStress?: number
    bioStress?: number
    climateStress?: number
    techStress?: number
    memeticPressure?: number
  }
  raw?: unknown
  error?: string | null
}

export type WorldSpectOperationalStatus =
  | 'ACTIVE'
  | 'BOOTSTRAPPED'
  | 'PARTIAL_EXTERNAL_FAILURE'
  | 'DEGRADED_BLOCKING'

export type WorldSpectVectorCell = {
  domain: WorldSpectDomain
  value: number | null
  velocity: number
  volatility: number
  persistence: number
  sourceCount: number
  trust: number
  degradation: number
  observedAt: string
  status: 'ACTIVE' | 'BOOTSTRAPPED' | 'DEGRADED_BLOCKING'
  sources: string[]
  layers?: Record<string, {
    value: number | null
    sourceCount: number
    sources: string[]
    status: 'ACTIVE' | 'MISSING'
    meaning: string[]
  }>
  interpretation?: string
}

export type WorldSpectVectorSnapshot = {
  observedAt: string
  status: WorldSpectOperationalStatus
  vectors: WorldSpectVectorCell[]
  wsi: number
  nti: number
  sourceCoverage: number
  degradedSources: string[]
}

export type WorldSpectAdapter = {
  sourceId: string
  observe(): Promise<SourceObservation>
}
