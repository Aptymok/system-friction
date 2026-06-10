export type WorldSpectDomain =
  | 'CULTURAL' | 'ECONOMY' | 'GEO_DIGITAL' | 'GEOPOLITICAL' | 'BIO'
  | 'CLIMATE' | 'INSTITUTIONAL' | 'MEMETIC' | 'TECH' | 'AFFECTIVE'

export type SourceAccessKind = 'public-api' | 'oauth' | 'official-feed' | 'manual-upload' | 'internal-evidence' | 'licensed-api'
export type SourceAdapterStatus = 'ACTIVE' | 'BOOTSTRAPPED' | 'AWAITING_CREDENTIALS' | 'RATE_LIMITED' | 'DEGRADED_BLOCKING' | 'DISABLED'

export type SourceObservation = {
  sourceId: string
  domain: WorldSpectDomain
  observedAt: string
  accessKind: SourceAccessKind
  status: SourceAdapterStatus
  value: number
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

export type WorldSpectVectorCell = {
  domain: WorldSpectDomain
  value: number
  velocity: number
  volatility: number
  persistence: number
  sourceCount: number
  trust: number
  degradation: number
  observedAt: string
  status: 'ACTIVE' | 'BOOTSTRAPPED' | 'DEGRADED_BLOCKING'
  sources: string[]
}

export type WorldSpectVectorSnapshot = {
  observedAt: string
  status: 'ACTIVE' | 'BOOTSTRAPPED' | 'DEGRADED_BLOCKING'
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
