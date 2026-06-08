import type { AmvArchiveLayer } from './archiveLayerPolicy'
import type { AmvEvidenceTrust } from './evidenceTypes'

export const AMV_GRAPH_NODE_TYPES = [
  'bitacora',
  'evidencia',
  'patron',
  'agente',
  'atractor',
  'eyector',
  'simulacion',
  'documento',
  'accion',
  'degradacion',
  'senal',
  'objetivo',
  'fenomeno',
  'cluster',
  'decision',
  'scope',
  'output',
] as const

export const AMV_GRAPH_EDGE_TYPES = [
  'sostiene',
  'contradice',
  'degrada',
  'converge',
  'eyecta',
  'depende',
  'hereda',
  'valida',
  'temporaliza',
  'acopla',
  'desacopla',
  'contamina',
  'proyecta',
  'recomienda',
] as const

export type AmvGraphNodeType = (typeof AMV_GRAPH_NODE_TYPES)[number]
export type AmvGraphEdgeType = (typeof AMV_GRAPH_EDGE_TYPES)[number]

export type AmvGraphNode = {
  id: string
  type: AmvGraphNodeType
  label: string
  scope: string
  evidenceTrust: AmvEvidenceTrust
  archiveLayer: AmvArchiveLayer
  payload?: Record<string, unknown>
}

export type AmvGraphEdge = {
  id: string
  source: string
  target: string
  type: AmvGraphEdgeType
  weight: number
  evidenceTrust: AmvEvidenceTrust
}

export type AmvGraphGlobalU = {
  subject: string
  scope: string
  fecha: string
  WSV: string
  MIHM: string
  regimen: string
  atractorDominante: string
  eyectores: string[]
  deuda: string
  permisos: string[]
  evidenceTrust: AmvEvidenceTrust
  archiveLayer: AmvArchiveLayer
}

export type AmvGraphState = {
  ok: true
  runtime: 'amv_core_scoped'
  globalU: AmvGraphGlobalU
  nodes: AmvGraphNode[]
  edges: AmvGraphEdge[]
  degraded: boolean
  warnings: string[]
}
