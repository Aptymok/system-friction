import { WORLDSPECT_DOMAINS, type WorldSpectVectorSnapshot } from './vector-contract'

export function createBootstrappedWorldSpectSnapshot(): WorldSpectVectorSnapshot {
  const observedAt = new Date().toISOString()
  return {
    id: `worldspect_bootstrapped_${Date.now().toString(36)}`,
    observed_at: observedAt,
    status: 'BOOTSTRAPPED',
    vectors: WORLDSPECT_DOMAINS.map((domain) => ({
      domain,
      value: 0,
      velocity: 0,
      volatility: 0,
      persistence: 0,
      source_count: 0,
      trust: 0,
      degradation: 1,
      observed_at: observedAt,
      status: 'BOOTSTRAPPED',
      sources: [],
    })),
    wsi: 0,
    nti: 0,
    regime: 'LOW',
    sourceCoverage: 0,
    degradedSources: [],
  }
}
