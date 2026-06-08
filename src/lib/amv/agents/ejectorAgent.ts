import type { AmvEvidenceRecord } from '../core/evidenceTypes'

export type AmvEjectorAgentInput = {
  evidence: AmvEvidenceRecord[]
  closureCandidate?: boolean
}

export type AmvEjectorAgentResult = {
  operator: 'ejector'
  blocksStrongClosure: boolean
  canExecuteExternal: false
  warnings: string[]
}

export function evaluateAmvEjector(input: AmvEjectorAgentInput): AmvEjectorAgentResult {
  const risky = input.evidence.some((item) => item.changesRisk || item.trust === 'unknown' || item.trust === 'audit')
  const blocksStrongClosure = Boolean(input.closureCandidate && risky)

  return {
    operator: 'ejector',
    blocksStrongClosure,
    canExecuteExternal: false,
    warnings: blocksStrongClosure ? ['ejector_blocks_strong_closure'] : [],
  }
}
