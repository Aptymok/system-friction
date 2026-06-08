import type { AmvArchiveLayer } from './archiveLayerPolicy'
import type { AmvEvidenceDecisionSupport, AmvEvidenceTrust } from './evidenceTypes'

export type AmvLogbookRoute = {
  layer: AmvArchiveLayer | 'not_promoted'
  decisionSupport: AmvEvidenceDecisionSupport
  canPromote: boolean
  reason: string
}

export function routeAmvReadingToLogbook(input: {
  trust: AmvEvidenceTrust | 'derived' | 'degraded'
  hasOperator?: boolean
  hasTimestamp?: boolean
  closesLoop?: boolean
  changesRoute?: boolean
}): AmvLogbookRoute {
  if (input.trust === 'verified') {
    return {
      layer: input.closesLoop || input.changesRoute ? 'attractor' : 'living_observatory',
      decisionSupport: input.closesLoop || input.changesRoute ? 'strong_decision' : 'operational_reading',
      canPromote: true,
      reason: 'Evidencia verificada con criterio suficiente para lectura fuerte.',
    }
  }

  if (input.trust === 'declared') {
    const canPromote = Boolean(input.hasOperator && input.hasTimestamp)
    return {
      layer: canPromote ? 'living_observatory' : 'technical_audit',
      decisionSupport: canPromote ? 'operational_reading' : 'audit_only',
      canPromote,
      reason: canPromote ? 'Declaracion con operador y fecha.' : 'Declaracion incompleta; falta operador o timestamp.',
    }
  }

  if (input.trust === 'inferred' || input.trust === 'derived') {
    return {
      layer: 'technical_audit',
      decisionSupport: 'route_risk_closure_only',
      canPromote: false,
      reason: 'Inferencia util para auditoria o lectura operativa, no para decision fuerte.',
    }
  }

  if (input.trust === 'simulated' || input.trust === 'sandbox') {
    return {
      layer: 'sandbox',
      decisionSupport: 'excluded_from_regime',
      canPromote: false,
      reason: 'Sandbox o simulacion; no alimenta regimen.',
    }
  }

  if (input.trust === 'audit' || input.trust === 'degraded') {
    return {
      layer: 'technical_audit',
      decisionSupport: 'audit_only',
      canPromote: false,
      reason: 'Estado degradado o tecnico; queda en auditoria.',
    }
  }

  return {
    layer: 'not_promoted',
    decisionSupport: 'not_promoted',
    canPromote: false,
    reason: 'Trust desconocido; no se promueve.',
  }
}
