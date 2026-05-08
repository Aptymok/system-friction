import type { AuditResult } from '@/lib/types'

export function extractMemoryFacts(input: {
  node_id: string
  audit_id?: string
  narrative: string
  result: AuditResult
}) {
  const text = input.narrative.toLowerCase()
  const facts: Array<{
    node_id: string
    audit_id?: string
    fact_type: string
    label: string
    value: string
    confidence: number
  }> = []

  if (input.result.pattern) {
    facts.push({
      node_id: input.node_id,
      audit_id: input.audit_id,
      fact_type: input.result.pattern.includes('loop') ? 'loop' : 'constraint',
      label: input.result.pattern,
      value: input.result.diagnosis,
      confidence: 0.72
    })
  }

  if (text.includes('quiero') || text.includes('objetivo')) {
    facts.push({
      node_id: input.node_id,
      audit_id: input.audit_id,
      fact_type: 'objective',
      label: 'objetivo declarado',
      value: input.narrative.slice(0, 500),
      confidence: 0.58
    })
  }

  if (input.result.proposed_action) {
    facts.push({
      node_id: input.node_id,
      audit_id: input.audit_id,
      fact_type: 'missed_action',
      label: 'accion minima propuesta',
      value: input.result.proposed_action,
      confidence: 0.64
    })
  }

  return facts
}
