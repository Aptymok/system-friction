import type { AmvScopeState, AmvScopeStateError } from './amvScopeStateTypes';

/**
 * Explicitly allowlisted public ScoreFriction/AMV state.
 * Internal service-role rows, case keys, event payloads and provider errors
 * must not be serialized into an unauthenticated HTTP response.
 */
export function publicAmvStateProjection(
  result: AmvScopeState | AmvScopeStateError,
): AmvScopeState | AmvScopeStateError {
  if (!result.ok) return result;
  return {
    ok: true,
    scope: result.scope,
    label: result.label,
    state: result.state,
    dashboardSpec: result.dashboardSpec,
    latestReading: result.latestReading
      ? {
          label: 'Observación agregada',
          summary: 'Existe una observación. El detalle de casos y evidencias requiere acceso institucional.',
          trust: result.latestReading.trust,
        }
      : null,
    sourceTrust: result.sourceTrust,
    evidenceSummary: result.evidenceSummary,
    recentEvents: [],
    archiveLayerSummary: result.archiveLayerSummary,
    warnings: result.warnings.length > 0
      ? ['Existen limitaciones o fuentes incompletas. El diagnóstico interno está reservado.']
      : [],
    canFeedRegime: result.canFeedRegime,
    canSupportAttractor: result.canSupportAttractor,
  };
}
