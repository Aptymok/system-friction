import type { AmvEvidenceRecord } from '../core/evidenceTypes'

export type AmvAttractorAgentInput = {
  evidence: AmvEvidenceRecord[]
  route?: string
}

export type AmvAttractorAgentResult = {
  operator: 'attractor'
  orientedRoute: string
  canExecuteExternal: false
  warnings: string[]
}

export function evaluateAmvAttractor(input: AmvAttractorAgentInput): AmvAttractorAgentResult {
  const support = input.evidence.filter((item) => item.trust === 'verified' || item.trust === 'declared')
  const warnings: string[] = []

  if (support.length === 0) warnings.push('attractor_without_strong_support')

  return {
    operator: 'attractor',
    orientedRoute: input.route ?? 'sin ruta dominante',
    canExecuteExternal: false,
    warnings,
  }
}
