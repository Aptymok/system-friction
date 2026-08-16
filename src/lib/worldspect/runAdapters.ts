import type { WorldSpectSource } from '../../../packages/api-contracts/src'
import type { SourceObservation } from './source-adapter-contract'
import { deriveWorldSpectSourceHealth } from './contract'
import { recordWorldSpectPostObservationCognitiveSpineContrast } from './cognitiveSpineContrast'
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

    // SEM-01: semantic metadata for public canonical API.
    layer: obs.layer,
    status: obs.status,
    meaning: obs.meaning,
  } as WorldSpectSource
}

export async function persistWorldSpectObservations(
  observations: SourceObservation[],
  ingestMode: WorldSpectIngestMode = 'manual',
  rawPayload: Record<string, unknown> = {},
  options: { priorCognitiveStateCutoff?: string } = {},
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

  // Canonical WorldSpect observation is persisted before any Cognitive Spine
  // context is materialized. This preserves observation independence.
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

  let cognitiveSpineContrast: Awaited<ReturnType<typeof recordWorldSpectPostObservationCognitiveSpineContrast>> | null = null
  let cognitiveSpineContrastWarning: string | null = null
  if (persistence.ok && persistence.data?.id) {
    const observationTimes = observations
      .map((observation) => new Date(observation.observedAt).valueOf())
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b)
    const derivedPriorCutoff = observationTimes.length
      ? new Date(observationTimes[0]).toISOString()
      : ts
    const priorStateCutoff = options.priorCognitiveStateCutoff ?? derivedPriorCutoff

    try {
      cognitiveSpineContrast = await recordWorldSpectPostObservationCognitiveSpineContrast({
        worldspectSnapshotId: String(persistence.data.id),
        worldspectSnapshotHash: String(persistence.data.snapshot_hash ?? ''),
        observedAt: String(persistence.data.observed_at ?? ts),
        priorStateCutoff,
        sourceState,
        confidence,
        wsi: snapshot.wsi,
        nti: snapshot.nti,
        degradedSources: degraded_sources,
      })
    } catch (error) {
      cognitiveSpineContrastWarning = `worldspect_post_observation_ct_contrast_unavailable:${error instanceof Error ? error.message : String(error)}`
    }
  }

  return {
    ok: persistence.ok,
    status: snapshot.status,
    snapshot,
    observations,
    sources,
    degraded_sources,
    sourceHealth,
    persistence,
    cognitiveSpineContrast,
    cognitiveSpineContrastWarning,
  }
}

function failedObservation(adapter: { sourceId: string } | undefined, index: number, reason: unknown): SourceObservation {
  return {
    sourceId: adapter?.sourceId ?? `worldspect_adapter_${index}`,
    domain: 'INSTITUTIONAL',
    observedAt: new Date().toISOString(),
    layer: 'UNKNOWN',
    meaning: {
      indicator: adapter?.sourceId ?? 'worldspect_adapter_' + index,
      description: 'Failed WorldSpect adapter observation.',
      high_means: 'No operational meaning because the adapter failed.',
      low_means: 'No operational meaning because the adapter failed.',
    },
    accessKind: 'public-api',
    status: 'DEGRADED_BLOCKING',
    value: null,
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
  const observationStartedAt = new Date().toISOString()
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
  }, {
    priorCognitiveStateCutoff: observationStartedAt,
  })
}
