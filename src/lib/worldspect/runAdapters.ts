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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function observationToSource(obs: SourceObservation): WorldSpectSource {
  return {
    key: obs.sourceId,
    label: `${obs.domain} · ${obs.sourceId}`,
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

function failedObservation(adapter: { sourceId: string } | undefined, index: number, reason: unknown): SourceObservation {
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
    raw: { error: reason instanceof Error ? reason.message : String(reason) },
    error: reason instanceof Error ? reason.message : String(reason),
  }
}

export async function runWorldSpectAdapters(ingestMode: WorldSpectIngestMode = 'manual') {
  const adapters = getWorldSpectPublicAdapters()
  const gdeltAdapters = adapters.filter((adapter) => adapter.sourceId.includes('_gdelt_'))
  const otherAdapters = adapters.filter((adapter) => !adapter.sourceId.includes('_gdelt_'))

  const otherSettled = await Promise.allSettled(otherAdapters.map(async (adapter) => adapter.observe()))
  const observations: SourceObservation[] = otherSettled.map((result, index): SourceObservation => {
    if (result.status === 'fulfilled') return result.value
    return failedObservation(otherAdapters[index], index, result.reason)
  })

  for (const adapter of gdeltAdapters) {
    try {
      observations.push(await adapter.observe())
    } catch (error) {
      observations.push(failedObservation(adapter, observations.length, error))
    }

    // GDELT is public and rate-limits aggressively. Do not hammer it.
    await sleep(1200)
  }

  return persistWorldSpectObservations(observations, ingestMode, {
    adapter_count: adapters.length,
    adapter_ids: adapters.map((adapter) => adapter.sourceId),
    gdelt_mode: 'sequential_backoff',
  })
}




