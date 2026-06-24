import type {
  SourceObservation,
  WorldSpectDomain,
  WorldSpectLayer,
  WorldSpectVectorCell,
  WorldSpectVectorSnapshot,
} from './source-adapter-contract'

export function clamp01(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0
}

export const AGGREGATOR_DOMAINS: WorldSpectDomain[] = [
  'CULTURAL', 'ECONOMY', 'GEO_DIGITAL', 'GEOPOLITICAL', 'BIO',
  'CLIMATE', 'INSTITUTIONAL', 'MEMETIC', 'TECH', 'AFFECTIVE',
]

function average(values: number[]) {
  if (values.length === 0) return null
  return clamp01(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function usableObservation(obs: SourceObservation) {
  return obs.status === 'ACTIVE'
    && typeof obs.value === 'number'
    && Number.isFinite(obs.value)
    && obs.trust > 0
    && obs.degradation < 1
}

function buildLayerSummary(observations: SourceObservation[]) {
  const byLayer = new Map<WorldSpectLayer, SourceObservation[]>()

  for (const obs of observations) {
    const list = byLayer.get(obs.layer) ?? []
    list.push(obs)
    byLayer.set(obs.layer, list)
  }

  const result: WorldSpectVectorCell['layers'] = {}

  for (const [layer, layerObs] of byLayer.entries()) {
    const usable = layerObs.filter(usableObservation)
    result[layer] = {
      value: average(usable.map((obs) => obs.value as number)),
      sourceCount: usable.length,
      sources: usable.map((obs) => obs.sourceId),
      status: usable.length > 0 ? 'ACTIVE' : 'MISSING',
      meaning: layerObs.map((obs) => `${obs.meaning.indicator}: ${obs.meaning.description}`),
    }
  }

  return result
}

function priorityLayers(domain: WorldSpectDomain): WorldSpectLayer[] {
  if (domain === 'ECONOMY') return ['MACRO', 'MARKET', 'ATTENTION', 'DIGITAL_ACTIVITY']
  if (domain === 'CLIMATE') return ['PHYSICAL', 'ATTENTION']
  if (domain === 'BIO') return ['BIO_HEALTH', 'INSTITUTIONAL_R_AND_D', 'ATTENTION']
  if (domain === 'TECH') return ['DIGITAL_ACTIVITY', 'ATTENTION']
  if (domain === 'AFFECTIVE') return ['AFFECTIVE_PROXY', 'ATTENTION', 'DIGITAL_ACTIVITY']
  if (domain === 'INSTITUTIONAL') return ['GOVERNANCE', 'ATTENTION']
  if (domain === 'MEMETIC') return ['ATTENTION', 'DIGITAL_ACTIVITY']
  if (domain === 'GEO_DIGITAL') return ['DIGITAL_ACTIVITY', 'ATTENTION']
  if (domain === 'GEOPOLITICAL') return ['GOVERNANCE', 'ATTENTION']
  if (domain === 'CULTURAL') return ['ATTENTION']
  return ['UNKNOWN', 'ATTENTION']
}

function chooseDomainValue(domain: WorldSpectDomain, layers: WorldSpectVectorCell['layers']) {
  const priorities = priorityLayers(domain)

  for (const layer of priorities) {
    const found = layers?.[layer]
    if (found && typeof found.value === 'number' && found.sourceCount > 0) {
      return {
        value: found.value,
        selectedLayer: layer,
      }
    }
  }

  return {
    value: null,
    selectedLayer: null,
  }
}

function layerInterpretation(domain: WorldSpectDomain, selectedLayer: WorldSpectLayer | null) {
  if (!selectedLayer) return `${domain}: sin dato usable para este ciclo.`
  if (domain === 'ECONOMY' && selectedLayer === 'MACRO') return 'ECONOMY: lectura basada en dato macro duro.'
  if (domain === 'ECONOMY' && selectedLayer === 'MARKET') return 'ECONOMY: macro ausente; lectura basada en mercado.'
  if (domain === 'ECONOMY' && selectedLayer === 'ATTENTION') return 'ECONOMY: macro/mercado ausente; lectura basada en atención.'
  if (domain === 'CLIMATE' && selectedLayer === 'PHYSICAL') return 'CLIMATE: lectura física prioritaria.'
  if (domain === 'CLIMATE' && selectedLayer === 'ATTENTION') return 'CLIMATE: sin lectura física; lectura de atención.'
  return `${domain}: lectura basada en capa ${selectedLayer}.`
}

export function aggregateDomain(domain: WorldSpectDomain, observations: SourceObservation[]): WorldSpectVectorCell {
  const domainObs = observations.filter((obs) => obs.domain === domain)

  if (domainObs.length === 0) {
    return {
      domain,
      value: null,
      velocity: 0,
      volatility: 0,
      persistence: 0,
      sourceCount: 0,
      trust: 0,
      degradation: 1,
      observedAt: new Date().toISOString(),
      status: 'BOOTSTRAPPED',
      sources: [],
      layers: {},
      interpretation: `${domain}: sin fuentes registradas.`,
    }
  }

  const usable = domainObs.filter(usableObservation)
  const layers = buildLayerSummary(domainObs)
  const selected = chooseDomainValue(domain, layers)

  if (usable.length === 0 || selected.value === null) {
    return {
      domain,
      value: null,
      velocity: 0,
      volatility: 0,
      persistence: 0,
      sourceCount: 0,
      trust: 0,
      degradation: 1,
      observedAt: new Date().toISOString(),
      status: 'BOOTSTRAPPED',
      sources: [],
      layers,
      interpretation: layerInterpretation(domain, null),
    }
  }

  const denominator = Math.max(1, usable.reduce((sum, obs) => sum + obs.trust * (1 - obs.degradation), 0))

  const weighted = (key: 'velocity' | 'volatility' | 'persistence') =>
    clamp01(usable.reduce((sum, obs) => sum + clamp01(Number(obs[key])) * obs.trust * (1 - obs.degradation), 0) / denominator)

  const trust = clamp01(usable.reduce((sum, obs) => sum + obs.trust, 0) / Math.max(1, usable.length))
  const degradation = clamp01(usable.reduce((sum, obs) => sum + obs.degradation, 0) / Math.max(1, usable.length))

  return {
    domain,
    value: selected.value,
    velocity: weighted('velocity'),
    volatility: weighted('volatility'),
    persistence: weighted('persistence'),
    sourceCount: usable.length,
    trust,
    degradation,
    observedAt: new Date().toISOString(),
    status: 'ACTIVE',
    sources: usable.map((obs) => obs.sourceId),
    layers,
    interpretation: layerInterpretation(domain, selected.selectedLayer),
  }
}

export function aggregateWorldSpect(observations: SourceObservation[]): WorldSpectVectorSnapshot {
  const vectors = AGGREGATOR_DOMAINS.map((domain) => aggregateDomain(domain, observations))
  const activeVectors = vectors.filter((vector) => vector.status === 'ACTIVE' && typeof vector.value === 'number')

  const values = activeVectors.map((vector) => vector.value as number)
  const maxSector = values.length ? Math.max(...values) : 0
  const weightedAverage = activeVectors.reduce(
    (sum, vector) => sum + (vector.value as number) * vector.trust * (1 - vector.degradation),
    0,
  ) / Math.max(1, activeVectors.length)

  const persistenceAverage = activeVectors.reduce((sum, vector) => sum + vector.persistence, 0) / Math.max(1, activeVectors.length)
  const volatilityAverage = activeVectors.reduce((sum, vector) => sum + vector.volatility, 0) / Math.max(1, activeVectors.length)

  const wsi = clamp01(
    0.35 * maxSector
    + 0.35 * weightedAverage
    + 0.15 * persistenceAverage
    + 0.15 * volatilityAverage,
  )

  const nti = clamp01(
    activeVectors.reduce((sum, vector) => sum + ((vector.velocity + vector.volatility) / 2) * Math.max(0.2, vector.trust), 0)
    / Math.max(1, activeVectors.length),
  )

  const degradedSources = observations
    .filter((obs) => obs.status === 'DEGRADED_BLOCKING' || obs.status === 'RATE_LIMITED')
    .map((obs) => obs.sourceId)

  const hasReading = activeVectors.length > 0

  return {
    observedAt: new Date().toISOString(),
    status: degradedSources.length > 0
      ? (hasReading ? 'PARTIAL_EXTERNAL_FAILURE' : 'DEGRADED_BLOCKING')
      : activeVectors.length > 0
        ? 'ACTIVE'
        : 'BOOTSTRAPPED',
    vectors,
    wsi,
    nti,
    sourceCoverage: clamp01(activeVectors.length / vectors.length),
    degradedSources,
  }
}

