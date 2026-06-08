import type { AmvDecision, AmvPolicy, AmvRiskLevel } from './amvTypes'

export const AMV_DEFAULT_POLICY: AmvPolicy = {
  maxVisibleRoutes: 1,
  hideNonRouteChangingInference: true,
  requireZeroTrust: true,
  riskManagement: true,
  allowLogbookSelectionDemand: false,
}

export function riskFromScore(score: number): AmvRiskLevel {
  if (score >= 0.82) return 'hard_stop'
  if (score >= 0.62) return 'high'
  if (score >= 0.34) return 'medium'
  return 'low'
}

export function enforceDecisionPolicy(decision: AmvDecision, policy: AmvPolicy): AmvDecision {
  const warnings = [...decision.warnings]

  if (!decision.route.trim()) warnings.push('missing_dominant_route')
  if (!decision.changedDecision && policy.hideNonRouteChangingInference) {
    return {
      ...decision,
      result: 'No cambia ruta, riesgo, decision ni cierre.',
      effect: 'Se conserva el curso actual con minima inferencia visible.',
      route: decision.route || 'Mantener observacion y no ejecutar cambios.',
      warnings,
    }
  }

  return {
    ...decision,
    route: decision.route || 'Mantener observacion y no ejecutar cambios.',
    warnings,
  }
}
