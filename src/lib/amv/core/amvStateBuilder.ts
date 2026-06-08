import { getAmvDashboardByScope, listAmvDashboards } from '../registry/dashboardRegistry'
import { getAmvScope, listAmvScopes } from '../registry/scopeRegistry'
import { buildScoreFrictionScopeState } from '../scopes/scorefriction/scorefrictionStateConnector'
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

export async function buildAmvScopeState(scopeInput: string): Promise<AmvScopeState | AmvScopeStateError> {
  const scope = scopeInput.trim().toLowerCase()
  if (!scope) return { ok: false, error: 'missing_scope', availableScopes: listAmvScopes() }
  if (!getAmvScope(scope)) return { ok: false, error: 'unknown_scope', availableScopes: listAmvScopes() }
  if (scope === 'scorefriction') return buildScoreFrictionScopeState()
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
