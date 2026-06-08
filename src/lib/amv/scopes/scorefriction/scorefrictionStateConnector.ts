import { createServiceSupabaseClient } from '@/runtime/supabase/server'
import type { AmvScopeState } from '@/lib/amv/core/amvScopeStateTypes'
import type { AmvEvidenceTrust } from '@/lib/amv/core/evidenceTypes'
import type { AmvTrustLevel } from '@/lib/amv/core/amvTypes'
import { scorefrictionDashboardSpec } from './scorefrictionDashboardSpec'

type Row = Record<string, unknown>

function asRows(data: unknown): Row[] {
  return Array.isArray(data) ? data.filter((item): item is Row => !!item && typeof item === 'object' && !Array.isArray(item)) : []
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? parsed : fallback
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
}

function trustFromEvent(row: Row): AmvEvidenceTrust {
  const klass = str(row.epistemic_class)
  if (klass === 'observed') return 'verified'
  if (klass === 'declared') return 'declared'
  if (klass === 'derived' || klass === 'inferred') return 'inferred'
  if (klass === 'simulated' || klass === 'fixture') return 'sandbox'
  return 'unknown'
}

function latestLabel(row: Row | undefined) {
  if (!row) return 'Sin lectura viva'
  const normalized = record(row.normalized_payload)
  const raw = record(row.raw_payload)
  return str(normalized.title) || str(raw.title) || str(row.case_id) || 'Observacion ScoreFriction'
}

async function queryRows(table: string, select = '*', order = 'created_at', limit = 25, eq?: { column: string; value: string }) {
  const service = createServiceSupabaseClient()
  let query = service.from(table).select(select).order(order, { ascending: false }).limit(limit)
  if (eq) query = query.eq(eq.column, eq.value)
  const { data, error } = await query
  return { rows: asRows(data), warning: error ? `${table}: ${error.message}` : null }
}

export async function buildScoreFrictionSelectedContext() {
  const warnings: string[] = []

  let observations: Row[] = []
  let vectors: Row[] = []
  let prototypes: Row[] = []
  let verifications: Row[] = []
  let events: Row[] = []

  try {
    const [obs, vec, proto, ver, evt] = await Promise.all([
      queryRows('scorefriction_observations'),
      queryRows('scorefriction_vectors'),
      queryRows('scorefriction_prototypes'),
      queryRows('scorefriction_verifications', '*', 'verified_at'),
      queryRows('epistemic_events', '*', 'created_at', 25, { column: 'logbook_id', value: 'SCOREFRICTION' }),
    ])

    observations = obs.rows
    vectors = vec.rows
    prototypes = proto.rows
    verifications = ver.rows
    events = evt.rows
    warnings.push(...[obs.warning, vec.warning, proto.warning, ver.warning, evt.warning].filter((item): item is string => Boolean(item)))
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : 'scorefriction_state_unavailable')
  }

  const latestObservation = observations[0]
  const latestVectors = vectors.find((row) => str(row.observation_id) === str(latestObservation?.id)) ?? vectors[0] ?? null
  const latestEvent = events[0] ?? null
  const evidenceCount = observations.length + verifications.length
  const sourceCoverage = observations.reduce((sum, row) => sum + num(row.source_coverage_contribution, 0), 0)
  const latestReliability = num(latestObservation?.reliability_score, 0)
  const trust: AmvTrustLevel = evidenceCount === 0 ? 'degraded' : latestReliability >= 0.7 || verifications.length > 0 ? 'observed' : 'derived'

  if (!latestObservation) warnings.push('scorefriction_state_degraded: no hay observaciones reales registradas')
  if (vectors.length === 0) warnings.push('scorefriction_vectors_missing')
  if (events.length === 0) warnings.push('scorefriction_logbook_missing')

  return {
    case_id: str(latestObservation?.case_id) || null,
    latest_observation: latestObservation ?? null,
    latest_vectors: latestVectors,
    evidence_count: evidenceCount,
    source_coverage: sourceCoverage,
    latest_event: latestEvent,
    warnings,
    trust,
    tables: {
      observations: observations.length,
      vectors: vectors.length,
      prototypes: prototypes.length,
      verifications: verifications.length,
      events: events.length,
    },
  }
}

export async function buildScoreFrictionScopeState(): Promise<AmvScopeState> {
  const selectedContext = await buildScoreFrictionSelectedContext()
  const latestObservation = record(selectedContext.latest_observation)
  const latestEvent = record(selectedContext.latest_event)
  const latestObservedAt = str(latestObservation.created_at) || str(latestEvent.created_at) || undefined
  const liveEnough = selectedContext.evidence_count > 0 && Boolean(selectedContext.latest_observation)
  const verified = selectedContext.trust === 'observed' ? 1 : 0
  const derived = liveEnough && selectedContext.trust !== 'observed' ? 1 : 0

  return {
    ok: true,
    scope: 'scorefriction',
    label: 'ScoreFriction',
    state: liveEnough ? 'live' : 'degraded',
    dashboardSpec: scorefrictionDashboardSpec,
    latestReading: liveEnough ? {
      id: str(latestObservation.id) || undefined,
      label: latestLabel(latestObservation),
      observedAt: latestObservedAt,
      summary: `Caso ${str(latestObservation.case_id, 'sin caso')} con ${selectedContext.evidence_count} piezas de evidencia conectadas.`,
      trust: selectedContext.trust === 'observed' ? 'verified' : 'inferred',
      source: str(latestObservation.source_name, 'scorefriction'),
      payload: selectedContext,
    } : null,
    sourceTrust: selectedContext.trust,
    evidenceSummary: {
      count: selectedContext.evidence_count,
      verified,
      declared: 0,
      derived,
      degraded: liveEnough ? 0 : 1,
      sandbox: 0,
      sourceCoverage: selectedContext.source_coverage,
      latestObservedAt,
    },
    recentEvents: latestEvent ? [{
      id: str(latestEvent.event_id) || str(latestEvent.id) || undefined,
      label: str(latestEvent.event_name, 'scorefriction.event'),
      occurredAt: str(latestEvent.occurred_at) || str(latestEvent.created_at) || undefined,
      trust: trustFromEvent(latestEvent),
      summary: str(latestEvent.uncertainty) || undefined,
    }] : [],
    archiveLayerSummary: [
      { layer: liveEnough ? 'living_observatory' : 'technical_audit', count: selectedContext.evidence_count, canFeedRegime: liveEnough },
      { layer: 'attractor', count: verified, canFeedRegime: verified > 0 },
      { layer: 'sandbox', count: 0, canFeedRegime: false },
    ],
    warnings: selectedContext.warnings,
    canFeedRegime: liveEnough && selectedContext.source_coverage > 0,
    canSupportAttractor: verified > 0,
    selectedContext,
  }
}
