export const AMV_EVIDENCE_TRUST_LEVELS = [
  'verified',
  'declared',
  'inferred',
  'simulated',
  'sandbox',
  'audit',
  'unknown',
] as const

export type AmvEvidenceTrust = (typeof AMV_EVIDENCE_TRUST_LEVELS)[number]

export type AmvEvidenceRecord = {
  id: string
  trust: AmvEvidenceTrust
  sourceId: string
  sourceLabel: string
  observedAt?: string
  operator?: string
  summary: string
  lineage: string[]
  confidence?: number
  payloadHash?: string
  changesRoute?: boolean
  changesRisk?: boolean
  closesLoop?: boolean
}

export type AmvEvidenceDecisionSupport =
  | 'strong_decision'
  | 'operational_reading'
  | 'route_risk_closure_only'
  | 'excluded_from_regime'
  | 'audit_only'
  | 'not_promoted'

export function isAmvEvidenceTrust(value: unknown): value is AmvEvidenceTrust {
  return typeof value === 'string' && AMV_EVIDENCE_TRUST_LEVELS.includes(value as AmvEvidenceTrust)
}
