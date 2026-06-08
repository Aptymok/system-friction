export const AMV_FIELD_OPERATORS = [
  'attractor',
  'ejector',
  'stochastic_projection',
  'intervention',
  'perturbation',
  'regime_shift',
  'threshold',
  'signal',
  'pattern',
  'cluster',
  'phenomenon',
  'debt',
  'rce',
  'latency',
  'coherence',
  'dissonance',
  'coupling',
  'decoupling',
  'contamination',
  'verification',
  'closure',
  'memory',
  'simulation',
] as const

export type AmvFieldOperator = (typeof AMV_FIELD_OPERATORS)[number]

export type AmvFieldOperatorDefinition = {
  id: AmvFieldOperator
  label: string
  purpose: string
  boundary: string
  canExecuteExternal: false
  requiresApproval?: boolean
  canBlockClosure?: boolean
}

export const AMV_FIELD_OPERATOR_DEFINITIONS: Record<AmvFieldOperator, AmvFieldOperatorDefinition> = {
  attractor: {
    id: 'attractor',
    label: 'Attractor',
    purpose: 'Orientar tendencia, ruta y peso direccional visible.',
    boundary: 'Orienta ruta; no ejecuta acciones.',
    canExecuteExternal: false,
  },
  ejector: {
    id: 'ejector',
    label: 'Ejector',
    purpose: 'Detectar fuerza que expulsa energia, bloquea continuidad o contamina cierre.',
    boundary: 'Puede bloquear cierre fuerte cuando la evidencia no sostiene cierre seguro.',
    canExecuteExternal: false,
    canBlockClosure: true,
  },
  stochastic_projection: {
    id: 'stochastic_projection',
    label: 'Stochastic projection',
    purpose: 'Proyectar escenarios probabilisticos sin promoverlos a regimen.',
    boundary: 'Siempre sandbox hasta aprobacion humana explicita.',
    canExecuteExternal: false,
    requiresApproval: true,
  },
  intervention: {
    id: 'intervention',
    label: 'Intervention',
    purpose: 'Formular una intervencion posible como plan, no como ejecucion.',
    boundary: 'No ejecuta nada externo.',
    canExecuteExternal: false,
    requiresApproval: true,
  },
  perturbation: {
    id: 'perturbation',
    label: 'Perturbation',
    purpose: 'Nombrar una alteracion deliberada o ambiental que cambia lectura.',
    boundary: 'No simula ni aplica perturbaciones reales desde AMV.',
    canExecuteExternal: false,
  },
  regime_shift: {
    id: 'regime_shift',
    label: 'Regime shift',
    purpose: 'Marcar posible cambio de regimen interpretativo.',
    boundary: 'Requiere evidencia; la etiqueta no es evidencia por si misma.',
    canExecuteExternal: false,
  },
  threshold: {
    id: 'threshold',
    label: 'Threshold',
    purpose: 'Detectar umbral de acceso, riesgo, cierre o decision.',
    boundary: 'No cruza umbrales operativos sin aprobacion.',
    canExecuteExternal: false,
  },
  signal: {
    id: 'signal',
    label: 'Signal',
    purpose: 'Leer senal observable y su linaje minimo.',
    boundary: 'No convierte senal aislada en certeza.',
    canExecuteExternal: false,
  },
  pattern: {
    id: 'pattern',
    label: 'Pattern',
    purpose: 'Agrupar recurrencias observables.',
    boundary: 'No sustituye evidencia primaria.',
    canExecuteExternal: false,
  },
  cluster: {
    id: 'cluster',
    label: 'Cluster',
    purpose: 'Agrupar fenomenos, senales o nodos por proximidad operativa.',
    boundary: 'No crea entidades nuevas por agrupacion.',
    canExecuteExternal: false,
  },
  phenomenon: {
    id: 'phenomenon',
    label: 'Phenomenon',
    purpose: 'Nombrar el fenomeno observado sin resolverlo prematuramente.',
    boundary: 'No presume causa unica.',
    canExecuteExternal: false,
  },
  debt: {
    id: 'debt',
    label: 'Debt',
    purpose: 'Leer deuda de realidad, decision o mantenimiento.',
    boundary: 'No declara deuda cerrada sin evidencia de cierre.',
    canExecuteExternal: false,
  },
  rce: {
    id: 'rce',
    label: 'RCE',
    purpose: 'Leer conversion de realidad cuando exista soporte visible.',
    boundary: 'No inventa conversion ni metrica.',
    canExecuteExternal: false,
  },
  latency: {
    id: 'latency',
    label: 'Latency',
    purpose: 'Detectar demora entre senal, decision y accion.',
    boundary: 'No convierte demora en falla sin contexto.',
    canExecuteExternal: false,
  },
  coherence: {
    id: 'coherence',
    label: 'Coherence',
    purpose: 'Leer alineacion entre evidencia, decision y ruta.',
    boundary: 'No es prueba de verdad por si misma.',
    canExecuteExternal: false,
  },
  dissonance: {
    id: 'dissonance',
    label: 'Dissonance',
    purpose: 'Leer contradiccion, friccion o incompatibilidad entre capas.',
    boundary: 'No bloquea por si sola sin riesgo o evidencia.',
    canExecuteExternal: false,
  },
  coupling: {
    id: 'coupling',
    label: 'Coupling',
    purpose: 'Leer dependencia fuerte entre senales, actores o decisiones.',
    boundary: 'No implica causalidad automatica.',
    canExecuteExternal: false,
  },
  decoupling: {
    id: 'decoupling',
    label: 'Decoupling',
    purpose: 'Leer separacion entre capas antes acopladas.',
    boundary: 'No borra historial ni linaje.',
    canExecuteExternal: false,
  },
  contamination: {
    id: 'contamination',
    label: 'Contamination',
    purpose: 'Detectar entrada que degrada lectura, evidencia o decision.',
    boundary: 'Puede elevar riesgo; no ejecuta limpieza.',
    canExecuteExternal: false,
  },
  verification: {
    id: 'verification',
    label: 'Verification',
    purpose: 'Pedir o registrar confirmacion de soporte.',
    boundary: 'No crea evidencia que no exista.',
    canExecuteExternal: false,
  },
  closure: {
    id: 'closure',
    label: 'Closure',
    purpose: 'Evaluar si un circuito puede cerrarse con criterio verificable.',
    boundary: 'No ejecuta cierre; solo lo declara candidato o bloqueado.',
    canExecuteExternal: false,
  },
  memory: {
    id: 'memory',
    label: 'Memory',
    purpose: 'Usar memoria declarada o archivo como contexto.',
    boundary: 'No reescribe memoria ni la promueve a evidencia activa.',
    canExecuteExternal: false,
  },
  simulation: {
    id: 'simulation',
    label: 'Simulation',
    purpose: 'Representar ensayo o escenario no operativo.',
    boundary: 'Permanece sandbox y no alimenta regimen.',
    canExecuteExternal: false,
    requiresApproval: true,
  },
}

export function isAmvFieldOperator(value: unknown): value is AmvFieldOperator {
  return typeof value === 'string' && AMV_FIELD_OPERATORS.includes(value as AmvFieldOperator)
}
