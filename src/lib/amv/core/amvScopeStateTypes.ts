import type { AmvArchiveLayer } from './archiveLayerPolicy'
import type { AmvDashboardSpec } from './dashboardSpecTypes'
import type { AmvEvidenceTrust } from './evidenceTypes'
import type { AmvTrustLevel } from './amvTypes'

export type AmvScopeLiveState = 'live' | 'degraded' | 'sandbox' | 'missing'

export type AmvLatestReading = {
  id?: string
  label: string
  observedAt?: string
  summary: string
  trust: AmvEvidenceTrust
  source?: string
  payload?: unknown
}

export type AmvEvidenceSummary = {
  count: number
  verified: number
  declared: number
  derived: number
  degraded: number
  sandbox: number
  sourceCoverage: number
  latestObservedAt?: string
}

export type AmvRecentEvent = {
  id?: string
  label: string
  occurredAt?: string
  trust: AmvEvidenceTrust
  summary?: string
}

export type AmvArchiveLayerSummary = {
  layer: AmvArchiveLayer
  count: number
  canFeedRegime: boolean
}

export type AmvScopeState = {
  ok: true
  scope: string
  label: string
  state: AmvScopeLiveState
  dashboardSpec?: AmvDashboardSpec
  latestReading: AmvLatestReading | null
  sourceTrust: AmvTrustLevel
  evidenceSummary: AmvEvidenceSummary
  recentEvents: AmvRecentEvent[]
  archiveLayerSummary: AmvArchiveLayerSummary[]
  warnings: string[]
  canFeedRegime: boolean
  canSupportAttractor: boolean
  selectedContext?: unknown
}

export type AmvScopeStateError = {
  ok: false
  error: string
  availableScopes?: string[]
}
