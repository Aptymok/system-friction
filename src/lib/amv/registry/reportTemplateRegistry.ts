import type { AmvReportTemplate, AmvReportTemplateId } from '../core/reportTemplateTypes'

const ids: AmvReportTemplateId[] = [
  'executive_summary',
  'policy_memo',
  'creative_brief',
  'early_warning',
  'scenario_matrix',
  'audit_report',
  'reality_debt_report',
  'phenomenon_card',
  'attractor_map',
  'ejector_map',
  'evidence_packet',
]

export const AMV_REPORT_TEMPLATES: Record<AmvReportTemplateId, AmvReportTemplate> = Object.fromEntries(ids.map((id) => [id, {
  id,
  outputMode: id,
  title: id.replaceAll('_', ' '),
  sections: ['observacion', 'evidencia', 'riesgo', 'limite', 'ruta'],
  boundary: 'Plantilla de reporte; no sustituye evidencia ni escribe DB.',
}])) as Record<AmvReportTemplateId, AmvReportTemplate>

export function listAmvReportTemplates() {
  return Object.values(AMV_REPORT_TEMPLATES)
}
