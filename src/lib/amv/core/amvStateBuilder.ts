import { getAmvDashboardByScope, listAmvDashboards } from '../registry/dashboardRegistry'
import { getAmvScope, listAmvScopes } from '../registry/scopeRegistry'
import { buildScoreFrictionScopeState } from '../scopes/scorefriction/scorefrictionStateConnector'
import { getPredictiveEngineHealth } from '@/lib/predictive-engine/service'
import type { AmvScopeState, AmvScopeStateError } from './amvScopeStateTypes'

function labelForScope(scope: string) {
  return scope.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

export function buildDegradedAmvScopeState(scope: string, warning?: string): AmvScopeState {
  const dashboardSpec = getAmvDashboardByScope(scope)
  return {
    ok: true,
    scope,
    label: dashboardSpec?.title ?? labelForScope(scope),
    state: 'degraded',
    dashboardSpec,
    latestReading: null,
    sourceTrust: 'degraded',
    evidenceSummary: {
      count: 0,
      verified: 0,
      declared: 0,
      derived: 0,
      degraded: 1,
      sandbox: 0,
      sourceCoverage: 0,
    },
    recentEvents: [],
    archiveLayerSummary: [
      { layer: 'technical_audit', count: 1, canFeedRegime: false },
      { layer: 'living_observatory', count: 0, canFeedRegime: false },
      { layer: 'sandbox', count: 0, canFeedRegime: false },
    ],
    warnings: [warning ?? 'Contrato observable disponible. Sin estado vivo suficiente.'],
    canFeedRegime: false,
    canSupportAttractor: false,
  }
}

async function buildPredictiveEngineScopeState(): Promise<AmvScopeState> {
  try {
    const health = await getPredictiveEngineHealth()
    const modelCoverage = health.models > 0 ? Math.min(1, health.activeModels / health.models) : 0
    return {
      ok: true,
      scope: 'predictive-engine',
      label: 'SFI Predictive Learning Engine',
      state: health.ok ? 'live' : 'degraded',
      dashboardSpec: getAmvDashboardByScope('predictive-engine'),
      latestReading: {
        label: 'Predictive engine health',
        summary: `${health.runs} run(s); ${health.openRuns} open; ${health.dueRuns} due; ${health.verifiedOutcomes} verified outcome(s); ${health.appliedLearningEvents} applied learning event(s).`,
        trust: health.ok ? 'audit' : 'unknown',
        source: 'sfi_predictive_models|sfi_predictive_runs|sfi_predictive_outcomes|sfi_predictive_learning_events',
        payload: health,
      },
      sourceTrust: health.ok ? 'observed' : 'degraded',
      evidenceSummary: {
        count: health.verifiedOutcomes,
        verified: health.verifiedOutcomes,
        declared: 0,
        derived: 0,
        degraded: health.ok ? 0 : 1,
        sandbox: 0,
        sourceCoverage: modelCoverage,
      },
      recentEvents: [],
      archiveLayerSummary: [
        { layer: 'technical_audit', count: 1, canFeedRegime: false },
        { layer: 'living_observatory', count: 0, canFeedRegime: false },
        { layer: 'sandbox', count: 0, canFeedRegime: false },
      ],
      warnings: health.warnings,
      canFeedRegime: false,
      canSupportAttractor: false,
    }
  } catch (error) {
    return buildDegradedAmvScopeState(
      'predictive-engine',
      `PREDICTIVE_ENGINE_STATE_UNAVAILABLE:${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export async function buildAmvScopeState(scopeInput: string): Promise<AmvScopeState | AmvScopeStateError> {
  const scope = scopeInput.trim().toLowerCase()
  if (!scope) return { ok: false, error: 'missing_scope', availableScopes: listAmvScopes() }
  if (!getAmvScope(scope)) return { ok: false, error: 'unknown_scope', availableScopes: listAmvScopes() }
  if (scope === 'scorefriction') return buildScoreFrictionScopeState()
  if (scope === 'predictive-engine') return buildPredictiveEngineScopeState()
  return buildDegradedAmvScopeState(scope)
}

export async function buildAllAmvScopeStates() {
  const scopes = listAmvScopes()
  const states = await Promise.all(scopes.map((scope) => buildAmvScopeState(scope)))
  return states.filter((state): state is AmvScopeState => state.ok)
}

export function listAmvDashboardContracts() {
  return listAmvDashboards().map((dashboard) => ({
    scope: dashboard.scope,
    title: dashboard.title,
    panels: dashboard.panels.length,
    lanes: dashboard.lanes,
    hasStateConnector: dashboard.scope === 'scorefriction',
  }))
}
