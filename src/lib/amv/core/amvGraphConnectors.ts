import type { AmvGraphEdgeType } from './amvGraphTypes'

export const AMV_GRAPH_CONNECTOR_POLICY: Record<AmvGraphEdgeType, string> = {
  sostiene: 'Relaciona evidencia o scope con lectura visible.',
  contradice: 'Marca incompatibilidad sin resolver causalidad.',
  degrada: 'Reduce confianza o capa permitida.',
  converge: 'Indica direccion compartida hacia atractor.',
  eyecta: 'Indica salida de energia, cierre o coherencia.',
  depende: 'Declara dependencia operativa.',
  hereda: 'Conserva linaje entre capas.',
  valida: 'Solo aplica con evidencia suficiente.',
  temporaliza: 'Ordena memoria sin inventar continuidad.',
  acopla: 'Indica dependencia fuerte sin causalidad automatica.',
  desacopla: 'Separa capas sin borrar linaje.',
  contamina: 'Marca entrada que degrada lectura.',
  proyecta: 'Permanece sandbox si es simulacion.',
  recomienda: 'Propone ruta; no ejecuta.',
}
