import { createServiceSupabaseClient } from '@/runtime/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AmvScopeState } from '@/lib/amv/core/amvScopeStateTypes'
import type { AmvEvidenceTrust } from '@/lib/amv/core/evidenceTypes'
import type { AmvTrustLevel } from '@/lib/amv/core/amvTypes'
import { scorefrictionDashboardSpec } from './scorefrictionDashboardSpec'

type Row = Record<string, unknown>

const SUPABASE_CLIENT_FACTORY = 'createServiceSupabaseClient'
const SERVICE_ROLE_MISSING_WARNING = 'scorefriction_service_role_missing'
const MANUAL_TEST_WARNING = 'scorefriction_manual_test_not_regime_evidence'

function asRows(data: unknown): Row[] {
  return Array.isArray(data) ? data.filter((item): item is Row => !!item && typeof item === 'object' && !Array.isArray(item)) : []
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? parsed : fallback
}

function pushWarning(warnings: string[], warning: string | null | undefined) {
  if (warning && !warnings.includes(warning)) warnings.push(warning)
}

function logSupabaseClientDiagnostics() {
  const serviceRolePresent = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

  console.info(
    `[scorefrictionStateConnector] Supabase client = ${SUPABASE_CLIENT_FACTORY}; SUPABASE_SERVICE_ROLE_KEY present = ${serviceRolePresent}`,
  )

  if (!serviceRolePresent) {
    console.warn(`[scorefrictionStateConnector] ${SERVICE_ROLE_MISSING_WARNING}`)
  }

  return { serviceRolePresent }
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

function isScoreFrictionRootEvent(row: Row) {
  const source = record(row.source)
  const payload = record(row.payload)
  return (
    str(source.sourceId).toUpperCase() === 'SCOREFRICTION'
    || str(payload.logbookAlias).toUpperCase() === 'SCOREFRICTION'
    || str(row.event_name).startsWith('scorefriction.')
  )
}

function isManualTestObservation(row: Row | undefined) {
  if (!row) return false
  return (
    str(row.source_url).startsWith('manual://scorefriction-root-test')
    || str(row.evidence_hash).startsWith('manual-test-')
  )
}

function isManualTestEvent(row: Row | null | undefined) {
  if (!row) return false
  const source = record(row.source)
  const payload = record(row.payload)
  return (
    str(source.sourceType) === 'manual_supabase_test'
    || str(payload.sourceType) === 'manual_supabase_test'
    || str(payload.evidenceHash).startsWith('manual-test-')
  )
}

async function queryRows(
  service: SupabaseClient,
  table: string,
  select = '*',
  order = 'created_at',
  limit = 25,
  eq?: { column: string; value: string },
) {
  let query = service.from(table).select(select).order(order, { ascending: false }).limit(limit)
  if (eq) query = query.eq(eq.column, eq.value)
  const { data, error } = await query
  return { rows: asRows(data), warning: error ? `${table}: ${error.message}` : null }
}

export async function buildScoreFrictionSelectedContext() {
  const warnings: string[] = []
  const diagnostics = logSupabaseClientDiagnostics()

  let observations: Row[] = []
  let vectors: Row[] = []
  let prototypes: Row[] = []
  let verifications: Row[] = []
  let events: Row[] = []

  try {
    if (!diagnostics.serviceRolePresent) {
      pushWarning(warnings, SERVICE_ROLE_MISSING_WARNING)
      throw new Error(SERVICE_ROLE_MISSING_WARNING)
    }

    const service = createServiceSupabaseClient()
    const [obs, vec, proto, ver, evt] = await Promise.all([
      queryRows(service, 'scorefriction_observations'),
      queryRows(service, 'scorefriction_vectors'),
      queryRows(service, 'scorefriction_prototypes'),
      queryRows(service, 'scorefriction_verifications', '*', 'verified_at'),
      queryRows(service, 'epistemic_events', '*', 'created_at', 100, { column: 'logbook_id', value: 'ROOT' }),
    ])

    observations = obs.rows
    vectors = vec.rows
    prototypes = proto.rows
    verifications = ver.rows
    events = evt.rows.filter(isScoreFrictionRootEvent)
    ;[obs.warning, vec.warning, proto.warning, ver.warning, evt.warning].forEach((warning) => pushWarning(warnings, warning))
  } catch (error) {
    pushWarning(warnings, error instanceof Error ? error.message : 'scorefriction_state_not_ready')
  }

  const latestObservation = observations[0]
  const latestVectors = vectors.find((row) => str(row.observation_id) === str(latestObservation?.id)) ?? vectors[0] ?? null
  const latestEvent = events[0] ?? null
  const evidenceCount = observations.length + verifications.length
  const sourceCoverage = observations.reduce((sum, row) => sum + num(row.source_coverage_contribution, 0), 0)
  const latestReliability = num(latestObservation?.reliability_score, 0)
  const trust: AmvTrustLevel = evidenceCount === 0 ? 'degraded' : latestReliability >= 0.7 || verifications.length > 0 ? 'observed' : 'derived'
  const manualTest = isManualTestObservation(latestObservation) || isManualTestEvent(latestEvent)

  if (!latestObservation) pushWarning(warnings, 'scorefriction_state_degraded: no hay observaciones reales registradas')
  if (vectors.length === 0) pushWarning(warnings, 'scorefriction_vectors_missing')
  if (events.length === 0) pushWarning(warnings, 'scorefriction_logbook_missing')
  if (manualTest) pushWarning(warnings, MANUAL_TEST_WARNING)

  return {
    case_id: str(latestObservation?.case_id) || null,
    latest_observation: latestObservation ?? null,
    latest_vectors: latestVectors,
    evidence_count: evidenceCount,
    source_coverage: sourceCoverage,
    latest_event: latestEvent,
    warnings,
    trust,
    manual_test: manualTest,
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
  const canFeedRegime = liveEnough && !selectedContext.manual_test && selectedContext.trust === 'observed' && selectedContext.source_coverage > 0
  const canSupportAttractor = verified > 0 && !selectedContext.manual_test

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
      { layer: liveEnough ? 'living_observatory' : 'technical_audit', count: selectedContext.evidence_count, canFeedRegime },
      { layer: 'attractor', count: verified, canFeedRegime: canSupportAttractor },
      { layer: 'sandbox', count: selectedContext.manual_test ? 1 : 0, canFeedRegime: false },
    ],
    warnings: selectedContext.warnings,
    canFeedRegime,
    canSupportAttractor,
    selectedContext,
  }
}
