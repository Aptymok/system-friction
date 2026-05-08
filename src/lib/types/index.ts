export type Source = 'web' | 'whatsapp'

export interface Node {
  id: string
  source: Source
  whatsapp_phone: string | null
  user_id?: string | null
  alias?: string | null
  objective?: string | null
  current_ihg: number
  current_nti: number
  current_ldi: number
  current_severity?: number
  active_pattern?: string | null
  created_at: string
  updated_at: string
  last_sync: string | null
}

export interface Audit {
  id: string
  node_id: string
  source: Source
  narrative: string | null
  ihg: number
  nti: number
  ldi: number
  verdict: string
  diagnosis: string
  loop_score: number
  divergence: number
  pattern?: string
  hard_stop?: boolean
  proposed_action?: string
  created_at: string
  whatsapp_session_id?: string
}

export interface Metrics {
  ihg: number
  nti: number
  ldi: number
  loop_score: number
  divergence: number
}

export interface AuditRequest {
  source: Source
  nodeId?: string
  narrative?: string
  responses?: Array<{ question_number: number; answer: string }>
  whatsapp_phone?: string
}

export interface AuditResult extends Metrics {
  verdict: string
  diagnosis: string
  entities: Array<{ name: string; type: string }>
  pattern: string
  hard_stop: boolean
  proposed_action: string
}

export interface StoreSnapshot {
  nodes: Node[]
  audits: Audit[]
  links: Array<{
    id: string
    token: string
    node_id: string
    expires_at: string
    used_at: string | null
    created_at: string
  }>
}
