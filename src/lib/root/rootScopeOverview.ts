import { buildAllAmvScopeStates } from '@/lib/amv/core/amvStateBuilder'

export async function buildRootScopeOverview() {
  const scopes = await buildAllAmvScopeStates()

  return scopes.map((scope) => ({
    scope: scope.scope,
    label: scope.label,
    state: scope.state,
    sourceTrust: scope.sourceTrust,
    latestReading: scope.latestReading,
    evidenceCount: scope.evidenceSummary.count,
    canFeedRegime: scope.canFeedRegime,
    canSupportAttractor: scope.canSupportAttractor,
    warnings: scope.warnings,
  }))
}
