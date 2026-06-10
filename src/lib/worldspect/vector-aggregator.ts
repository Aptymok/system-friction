import type { SourceObservation, WorldSpectDomain, WorldSpectVectorCell, WorldSpectVectorSnapshot } from './source-adapter-contract'

export function clamp01(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0
}

export const AGGREGATOR_DOMAINS: WorldSpectDomain[] = [
  'CULTURAL', 'ECONOMY', 'GEO_DIGITAL', 'GEOPOLITICAL', 'BIO',
  'CLIMATE', 'INSTITUTIONAL', 'MEMETIC', 'TECH', 'AFFECTIVE',
]

export function aggregateDomain(domain: WorldSpectDomain, observations: SourceObservation[]): WorldSpectVectorCell {
  const domainObs = observations.filter((obs) => obs.domain === domain)
  if (domainObs.length === 0) {
    return { domain, value: 0, velocity: 0, volatility: 0, persistence: 0, sourceCount: 0, trust: 0, degradation: 1, observedAt: new Date().toISOString(), status: 'BOOTSTRAPPED', sources: [] }
  }
  const usable = domainObs.filter((obs) => obs.status === 'ACTIVE' || obs.status === 'BOOTSTRAPPED')
  const denominator = Math.max(1, usable.reduce((sum, obs) => sum + obs.trust * (1 - obs.degradation), 0))
  const weighted = (key: 'value' | 'velocity' | 'volatility' | 'persistence') =>
    clamp01(usable.reduce((sum, obs) => sum + clamp01(Number(obs[key])) * obs.trust * (1 - obs.degradation), 0) / denominator)
  const trust = clamp01(usable.reduce((sum, obs) => sum + obs.trust, 0) / Math.max(1, usable.length))
  const degradation = clamp01(usable.reduce((sum, obs) => sum + obs.degradation, 0) / Math.max(1, usable.length))
  return {
    domain,
    value: weighted('value'),
    velocity: weighted('velocity'),
    volatility: weighted('volatility'),
    persistence: weighted('persistence'),
    sourceCount: usable.length,
    trust,
    degradation,
    observedAt: new Date().toISOString(),
    status: usable.some((obs) => obs.status === 'ACTIVE') ? 'ACTIVE' : 'BOOTSTRAPPED',
    sources: usable.map((obs) => obs.sourceId),
  }
}

export function aggregateWorldSpect(observations: SourceObservation[]): WorldSpectVectorSnapshot {
  const vectors = AGGREGATOR_DOMAINS.map((domain) => aggregateDomain(domain, observations))
  const activeVectors = vectors.filter((vector) => vector.status === 'ACTIVE')
  const wsi = clamp01(vectors.reduce((sum, vector) => sum + vector.value * vector.trust * (1 - vector.degradation), 0) / Math.max(1, vectors.length))
  const nti = clamp01(vectors.reduce((sum, vector) => sum + ((vector.velocity + vector.volatility) / 2) * Math.max(0.2, vector.trust), 0) / Math.max(1, vectors.length))
  const degradedSources = observations.filter((obs) => obs.status === 'DEGRADED_BLOCKING' || obs.status === 'RATE_LIMITED').map((obs) => obs.sourceId)
  return {
    observedAt: new Date().toISOString(),
    status: degradedSources.length > 0 ? 'DEGRADED_BLOCKING' : activeVectors.length > 0 ? 'ACTIVE' : 'BOOTSTRAPPED',
    vectors,
    wsi,
    nti,
    sourceCoverage: clamp01(activeVectors.length / vectors.length),
    degradedSources,
  }
}
