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

export interface MemoryFact {
  id: string
  node_id: string
  audit_id?: string | null
  fact_type: 'objective' | 'loop' | 'constraint' | 'emotion_pattern' | 'missed_action' | 'direction_change' | 'external_signal'
  label: string
  value: string
  confidence: number
  first_seen_at: string
  last_seen_at: string
  recurrence_count: number
}

export type SocialProvider = 'x' | 'twitter' | 'instagram' | 'tiktok' | 'linkedin'

export interface PublicationMetadata {
  provider?: SocialProvider
  text?: string
  media_url?: string | null
  scheduled_for?: string | null
  external_post_id?: string | null
  external_url?: string | null
  autonomous_amv?: boolean
  metrics?: Record<string, number>
  error?: string | null
  attempts?: number
  published_at?: string | null
}

export interface OperationalAction {
  id: string
  node_id: string
  audit_id?: string | null
  description: string
  verification_criterion: string
  due_at?: string | null
  completed_at?: string | null
  status: 'pending' | 'completed' | 'missed' | 'invalidated'
  action_type?: 'operational' | 'publication' | string
  metadata?: PublicationMetadata | Record<string, unknown> | null
  created_at: string
}

export interface Metrics {
  ihg: number
  nti: number
  ldi: number
  loop_score: number
  divergence: number
  frictionLevel?: number
  narrativeDrift?: number
  executionStability?: number
  contradiction?: number
}

export interface NodeSnapshot {
  timestamp: string
  label: string
  note?: string
  status: 'operational' | 'standby' | 'critical' | 'frozen'
  metrics: Metrics
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
  memory_facts?: MemoryFact[]
  actions?: OperationalAction[]
  links: Array<{
    id: string
    token: string
    node_id: string
    expires_at: string
    used_at: string | null
    created_at: string
  }>
}

export interface SfiMeasurement {
  id?: string
  asset_id: string
  IHG: number | null
  NTI_obs: number | null
  LDI_hours: number | null
  xi_noise: number | null
  PHI_SF: number | null
  regime: string | null
  runway_days: number | null
  measured_at: string
}

export interface SfiIntervention {
  id?: string
  asset_id: string
  intervention_id?: string | null
  type?: string | null
  description?: string | null
  target_variable?: string | null
  expected_delta?: number | null
  actual_delta?: number | null
  verification?: boolean | null
  payload?: Record<string, unknown> | null
  occurred_at?: string | null
  created_at?: string | null
}

export interface SfiOutput {
  id?: string
  asset_id: string
  output_type: string
  file_name?: string | null
  storage_path?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
}

export interface SfiLogbookEntry {
  id?: string
  asset_id: string
  event_type: string
  payload: Record<string, unknown>
  created_by?: string | null
  created_at: string
  hash?: string | null
}

export interface SfiAsset {
  asset_id: string
  owner_user_id: string
  target_system: Record<string, unknown>
  objective: Record<string, unknown>
  state_vector: Record<string, unknown>
  current_phase?: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  measurements?: SfiMeasurement[]
  interventions?: SfiIntervention[]
  outputs?: SfiOutput[]
  logbook?: SfiLogbookEntry[]
}
