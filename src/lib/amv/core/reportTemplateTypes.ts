import type { AmvOutputMode } from './outputModeTypes'

export type AmvReportTemplateId =
  | 'executive_summary'
  | 'policy_memo'
  | 'creative_brief'
  | 'early_warning'
  | 'scenario_matrix'
  | 'audit_report'
  | 'reality_debt_report'
  | 'phenomenon_card'
  | 'attractor_map'
  | 'ejector_map'
  | 'evidence_packet'

export type AmvReportTemplate = {
  id: AmvReportTemplateId
  outputMode: AmvOutputMode
  title: string
  sections: string[]
  boundary: string
}

export type AmvGeneratedReport = {
  templateId: AmvReportTemplateId
  generatedAt: string
  sections: Array<{ title: string; content: string }>
  degraded: boolean
}
