import type { AmvEvidenceDecisionSupport, AmvEvidenceRecord, AmvEvidenceTrust } from './evidenceTypes'

export type AmvEvidencePolicyRule = {
  trust: AmvEvidenceTrust
  support: AmvEvidenceDecisionSupport
  visibleByDefault: boolean
  canFeedRegime: boolean
  canSupportAttractor: boolean
  rule: string
}

export const AMV_EVIDENCE_POLICY: Record<AmvEvidenceTrust, AmvEvidencePolicyRule> = {
  verified: {
    trust: 'verified',
    support: 'strong_decision',
    visibleByDefault: true,
    canFeedRegime: true,
    canSupportAttractor: true,
    rule: 'verified puede sostener decision fuerte.',
  },
  declared: {
    trust: 'declared',
    support: 'operational_reading',
    visibleByDefault: true,
    canFeedRegime: true,
    canSupportAttractor: false,
    rule: 'declared puede sostener lectura operativa si tiene operador y timestamp.',
  },
  inferred: {
    trust: 'inferred',
    support: 'route_risk_closure_only',
    visibleByDefault: false,
    canFeedRegime: false,
    canSupportAttractor: false,
    rule: 'inferred no se muestra salvo que cambie ruta, riesgo o cierre.',
  },
  simulated: {
    trust: 'simulated',
    support: 'excluded_from_regime',
    visibleByDefault: false,
    canFeedRegime: false,
    canSupportAttractor: false,
    rule: 'simulated no alimenta regimen.',
  },
  sandbox: {
    trust: 'sandbox',
    support: 'excluded_from_regime',
    visibleByDefault: false,
    canFeedRegime: false,
    canSupportAttractor: false,
    rule: 'sandbox no alimenta regimen.',
  },
  audit: {
    trust: 'audit',
    support: 'audit_only',
    visibleByDefault: false,
    canFeedRegime: false,
    canSupportAttractor: false,
    rule: 'audit no gobierna experiencia principal.',
  },
  unknown: {
    trust: 'unknown',
    support: 'not_promoted',
    visibleByDefault: false,
    canFeedRegime: false,
    canSupportAttractor: false,
    rule: 'unknown no se promueve.',
  },
}

export function evidenceHasDeclaredOperatorAndTimestamp(evidence: AmvEvidenceRecord) {
  return Boolean(evidence.operator?.trim() && evidence.observedAt?.trim())
}

export function evidenceChangesRouteRiskOrClosure(evidence: AmvEvidenceRecord) {
  return Boolean(evidence.changesRoute || evidence.changesRisk || evidence.closesLoop)
}

export function evaluateEvidenceSupport(evidence: AmvEvidenceRecord): AmvEvidenceDecisionSupport {
  if (evidence.trust === 'declared' && !evidenceHasDeclaredOperatorAndTimestamp(evidence)) {
    return 'not_promoted'
  }
  if (evidence.trust === 'inferred' && !evidenceChangesRouteRiskOrClosure(evidence)) {
    return 'not_promoted'
  }
  return AMV_EVIDENCE_POLICY[evidence.trust].support
}

export function isEvidenceVisibleByPolicy(evidence: AmvEvidenceRecord) {
  if (evidence.trust === 'inferred') return evidenceChangesRouteRiskOrClosure(evidence)
  if (evidence.trust === 'declared') return evidenceHasDeclaredOperatorAndTimestamp(evidence)
  return AMV_EVIDENCE_POLICY[evidence.trust].visibleByDefault
}
