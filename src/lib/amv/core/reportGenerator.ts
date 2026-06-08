import { AMV_REPORT_TEMPLATES } from '../registry/reportTemplateRegistry'
import type { AmvGeneratedReport, AmvReportTemplateId } from './reportTemplateTypes'

export function generateAmvReport(templateId: AmvReportTemplateId, context: Record<string, unknown> = {}): AmvGeneratedReport {
  const template = AMV_REPORT_TEMPLATES[templateId]
  return {
    templateId,
    generatedAt: new Date().toISOString(),
    degraded: Object.keys(context).length === 0,
    sections: template.sections.map((section) => ({
      title: section,
      content: Object.keys(context).length === 0 ? 'sin datos suficientes' : 'lectura derivada de contexto visible',
    })),
  }
}
