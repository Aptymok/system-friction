import {
  evaluateEvidenceSupport,
  isEvidenceVisibleByPolicy,
  type AmvEvidencePolicyRule,
  AMV_EVIDENCE_POLICY,
} from '../core/evidencePolicy'
import type { AmvEvidenceDecisionSupport, AmvEvidenceRecord, AmvEvidenceTrust } from '../core/evidenceTypes'

export type AmvEvidenceAgentResult = {
  evidenceId: string
  trust: AmvEvidenceTrust
  support: AmvEvidenceDecisionSupport
  visible: boolean
  canFeedRegime: boolean
  canSupportAttractor: boolean
  rule: AmvEvidencePolicyRule
  warnings: string[]
}

export function evaluateAmvEvidence(evidence: AmvEvidenceRecord): AmvEvidenceAgentResult {
  const support = evaluateEvidenceSupport(evidence)
  const rule = AMV_EVIDENCE_POLICY[evidence.trust]
  const warnings: string[] = []

  if (support === 'not_promoted') warnings.push('evidence_not_promoted')
  if (evidence.trust === 'declared' && support === 'not_promoted') warnings.push('declared_missing_operator_or_timestamp')
  if (evidence.trust === 'inferred' && support === 'not_promoted') warnings.push('inferred_does_not_change_route_risk_or_closure')
  if (evidence.trust === 'simulated' || evidence.trust === 'sandbox') warnings.push('excluded_from_regime')
  if (evidence.trust === 'audit') warnings.push('audit_only')
  if (evidence.trust === 'unknown') warnings.push('unknown_not_promoted')

  return {
    evidenceId: evidence.id,
    trust: evidence.trust,
    support,
    visible: isEvidenceVisibleByPolicy(evidence),
    canFeedRegime: support === rule.support && rule.canFeedRegime,
    canSupportAttractor: support === rule.support && rule.canSupportAttractor,
    rule,
    warnings,
  }
}

export function summarizeEvidenceSet(evidence: AmvEvidenceRecord[]) {
  const results = evidence.map(evaluateAmvEvidence)
  return {
    total: results.length,
    strongDecision: results.filter((result) => result.support === 'strong_decision').length,
    operationalReading: results.filter((result) => result.support === 'operational_reading').length,
    visible: results.filter((result) => result.visible).length,
    regimeEligible: results.filter((result) => result.canFeedRegime).length,
    attractorEligible: results.filter((result) => result.canSupportAttractor).length,
    results,
  }
}
