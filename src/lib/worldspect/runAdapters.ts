import type { WorldSpectSource } from '../../../packages/api-contracts/src'
import type { SourceObservation } from './source-adapter-contract'
import { deriveWorldSpectSourceHealth } from './contract'
import { upsertWorldSpectSnapshot } from './snapshotStore'
import { aggregateWorldSpect } from './vector-aggregator'
import { getWorldSpectPublicAdapters } from './adapters/publicAdapters'

type WorldSpectIngestMode = 'daily_cron' | 'manual' | 'diagnostic' | 'fallback_runtime'

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
}

function observationToSource(obs: SourceObservation): WorldSpectSource {
  return {
    key: obs.sourceId,
    label: `${obs.domain} Ã‚Â· ${obs.sourceId}`,
    value: obs.status === 'ACTIVE' ? obs.value : null,
    raw: obs.raw,
    unit: 'normalized_0_1',
    nti: obs.trust,
    weight: obs.persistence,
    mihm_var: obs.domain,
    simulated: false,
    ts: obs.observedAt,
    error: obs.error ?? undefined,
  }
}

export async function persistWorldSpectObservations(
  observations: SourceObservation[],
  ingestMode: WorldSpectIngestMode = 'manual',
  rawPayload: Record<string, unknown> = {},
) {
  const snapshot = aggregateWorldSpect(observations)
  const ts = new Date().toISOString()
  const sources = observations.map(observationToSource)
  const degraded_sources = observations
    .filter((obs) => obs.status === 'DEGRADED_BLOCKING' || obs.status === 'RATE_LIMITED' || obs.status === 'AWAITING_CREDENTIALS')
    .map((obs) => obs.sourceId)

  const sourceHealth = deriveWorldSpectSourceHealth(sources, degraded_sources, ts)
  const activeSources = observations.filter((obs) => obs.status === 'ACTIVE')
  const totalSources = Math.max(1, observations.length)
  const sourceCoverage = clamp01(activeSources.length / totalSources)
  const degradationRatio = clamp01(degraded_sources.length / totalSources)
  const sourceState =
    activeSources.length === 0
      ? 'degraded'
      : sourceCoverage >= 0.75 && degradationRatio < 0.35
        ? 'observed'
        : 'degraded'
  const confidence = clamp01(activeSources.reduce((sum, obs) => sum + obs.trust, 0) / totalSources)
  const adapterError = degraded_sources.length > 0 ? `degraded_sources:${degraded_sources.join(',')}` : null

  const persistence = await upsertWorldSpectSnapshot({
    sourceState,
    evidenceLevel: 'direct',
    confidence,
    wsi: snapshot.wsi,
    nti: snapshot.nti,
    ts,
    sources,
    degraded_sources,
    sourceHealth,
    fieldStateSignal: null,
    rawPayload: {
      ...rawPayload,
      sources,
      wsi: snapshot.wsi,
      nti: snapshot.nti,
      ts,
      degraded_sources,
      source_health: sourceHealth,
      observations,
      source_coverage: sourceCoverage,
      degradation_ratio: degradationRatio,
      active_source_count: activeSources.length,
      total_source_count: observations.length,
      source_state_reason: sourceState === 'observed'
        ? 'coverage_above_threshold'
        : activeSources.length === 0
          ? 'no_active_sources'
          : 'coverage_or_degradation_below_threshold',
    },
    adapterStatus: sourceState === 'observed' ? 'observed' : 'degraded',
    adapterError,
    ingestMode,
  })

  return {
    ok: persistence.ok,
    status: snapshot.status,
    snapshot,
    observations,
    sources,
    degraded_sources,
    sourceHealth,
    persistence,
  }
}

export async function runWorldSpectAdapters(ingestMode: WorldSpectIngestMode = 'manual') {
  const adapters = getWorldSpectPublicAdapters()
  const settled = await Promise.allSettled(adapters.map(async (adapter) => adapter.observe()))

  const observations = settled.map((result, index): SourceObservation => {
    if (result.status === 'fulfilled') return result.value

    const adapter = adapters[index]
    return {
      sourceId: adapter?.sourceId ?? `worldspect_adapter_${index}`,
      domain: 'INSTITUTIONAL',
      observedAt: new Date().toISOString(),
      accessKind: 'public-api',
      status: 'DEGRADED_BLOCKING',
      value: 0,
      velocity: 0,
      volatility: 0,
      persistence: 0,
      rawCount: 0,
      sourceCount: 0,
      trust: 0,
      degradation: 1,
      signal: {},
      raw: { error: result.reason instanceof Error ? result.reason.message : String(result.reason) },
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    }
  })

  return persistWorldSpectObservations(observations, ingestMode, {
    adapter_count: adapters.length,
    adapter_ids: adapters.map((adapter) => adapter.sourceId),
  })
}



