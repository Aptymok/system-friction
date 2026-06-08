import { getAmvDashboardByScope } from '../registry/dashboardRegistry'
import type { AmvGraphEdge, AmvGraphNode, AmvGraphState } from './amvGraphTypes'

export function buildAmvGraph(scope = 'root', subject = scope): AmvGraphState {
  const spec = getAmvDashboardByScope(scope)
  const now = new Date().toISOString()
  const nodes: AmvGraphNode[] = spec
    ? [
        {
          id: `${scope}.scope`,
          type: 'scope',
          label: spec.title,
          scope,
          evidenceTrust: 'declared',
          archiveLayer: 'living_observatory',
        },
        ...spec.panels.map((panel) => ({
          id: panel.id,
          type: panel.lane === 'attractor' ? 'atractor' as const : panel.lane === 'ejector' ? 'eyector' as const : 'output' as const,
          label: panel.title,
          scope,
          evidenceTrust: panel.evidenceTrust?.[0] ?? 'unknown',
          archiveLayer: spec.instrument.archiveLayers?.[0] ?? 'technical_audit',
          payload: { question: panel.question, observes: panel.observes },
        })),
      ]
    : []
  const edges: AmvGraphEdge[] = nodes.slice(1).map((node) => ({
    id: `${scope}.scope.${node.id}`,
    source: `${scope}.scope`,
    target: node.id,
    type: 'sostiene',
    weight: 0.5,
    evidenceTrust: node.evidenceTrust,
  }))

  return {
    ok: true,
    runtime: 'amv_core_scoped',
    globalU: {
      subject,
      scope,
      fecha: now,
      WSV: 'degradado si no hay fuente visible',
      MIHM: 'requiere objeto declarado',
      regimen: 'no alimentado por sandbox',
      atractorDominante: spec?.instrument.name ?? 'sin scope registrado',
      eyectores: spec?.instrument.prohibitedActions.map((action) => action.label) ?? ['unknown_scope'],
      deuda: 'sin persistencia autorizada',
      permisos: ['read_visible_context', 'no_db_write', 'no_python_execution'],
      evidenceTrust: spec ? 'declared' : 'unknown',
      archiveLayer: spec ? 'living_observatory' : 'technical_audit',
    },
    nodes,
    edges,
    degraded: !spec,
    warnings: spec ? [] : ['unknown_scope'],
  }
}
