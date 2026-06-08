import type { AmvEvidenceTrust } from './evidenceTypes'

export const AMV_OBSERVATION_MODES = [
  'audit',
  'mihm',
  'worldspect',
  'focus',
  'longitudinal',
  'comparative',
  'counterfactual',
  'forensic',
  'diagnostic',
  'predictive',
  'prescriptive',
  'retrospective',
  'prospective',
] as const

export type AmvObservationMode = (typeof AMV_OBSERVATION_MODES)[number]

export type AmvObservationModeDefinition = {
  id: AmvObservationMode
  label: string
  question: string
  purpose: string
  allowedEvidenceTrust: AmvEvidenceTrust[]
  decisionBoundary: string
}

export const AMV_OBSERVATION_MODE_DEFINITIONS: Record<AmvObservationMode, AmvObservationModeDefinition> = {
  audit: {
    id: 'audit',
    label: 'Audit',
    question: 'Que ocurrio internamente y que linaje lo sostiene?',
    purpose: 'Leer trazabilidad, fallos, cambios y evidencia secundaria sin gobernar la experiencia principal.',
    allowedEvidenceTrust: ['audit', 'verified', 'declared', 'unknown'],
    decisionBoundary: 'Puede explicar linaje o riesgo tecnico; no gobierna regimen ni ruta principal.',
  },
  mihm: {
    id: 'mihm',
    label: 'MIHM',
    question: 'Que objeto esta siendo observado homeostaticamente?',
    purpose: 'Leer integracion, tension, latencia y densidad del objeto declarado.',
    allowedEvidenceTrust: ['verified', 'declared', 'inferred'],
    decisionBoundary: 'Debe declarar objeto observado; sin objeto queda como lectura incompleta.',
  },
  worldspect: {
    id: 'worldspect',
    label: 'WorldSpect',
    question: 'Como esta el mundo observado?',
    purpose: 'Leer contexto externo, fuente, timestamp y degradacion del campo observado.',
    allowedEvidenceTrust: ['verified', 'declared', 'inferred'],
    decisionBoundary: 'No puede presentar fuente degradada, missing o simulada como observacion fuerte.',
  },
  focus: {
    id: 'focus',
    label: 'Focus',
    question: 'Que variable focal cambia ruta, riesgo o cierre?',
    purpose: 'Aislar una variable operacional para decidir si altera observacion, riesgo o accion.',
    allowedEvidenceTrust: ['verified', 'declared', 'inferred', 'unknown'],
    decisionBoundary: 'La inferencia no se muestra salvo que cambie ruta, riesgo o cierre.',
  },
  longitudinal: {
    id: 'longitudinal',
    label: 'Longitudinal',
    question: 'Como cambia el fenomeno en el tiempo?',
    purpose: 'Leer continuidad, tendencia, memoria y variacion temporal.',
    allowedEvidenceTrust: ['verified', 'declared', 'inferred', 'audit'],
    decisionBoundary: 'No convierte serie incompleta en tendencia fuerte.',
  },
  comparative: {
    id: 'comparative',
    label: 'Comparative',
    question: 'Que cambia al comparar objetos, escenarios o cortes?',
    purpose: 'Contrastar lecturas observables bajo el mismo contrato.',
    allowedEvidenceTrust: ['verified', 'declared', 'inferred'],
    decisionBoundary: 'La comparacion exige criterios equivalentes y fuente declarada.',
  },
  counterfactual: {
    id: 'counterfactual',
    label: 'Counterfactual',
    question: 'Que habria cambiado bajo otra condicion?',
    purpose: 'Explorar alternativas sin tratarlas como realidad observada.',
    allowedEvidenceTrust: ['simulated', 'sandbox', 'declared'],
    decisionBoundary: 'Permanece sandbox; no alimenta regimen ni cierre fuerte.',
  },
  forensic: {
    id: 'forensic',
    label: 'Forensic',
    question: 'Que linaje, falla o contaminacion explica el estado observado?',
    purpose: 'Reconstruir evidencia, secuencia y responsabilidad tecnica u operativa.',
    allowedEvidenceTrust: ['verified', 'audit', 'declared', 'unknown'],
    decisionBoundary: 'Puede elevar riesgo; no acusa intencion sin evidencia.',
  },
  diagnostic: {
    id: 'diagnostic',
    label: 'Diagnostic',
    question: 'Que condicion explica mejor el estado actual?',
    purpose: 'Nombrar condicion operativa con soporte visible.',
    allowedEvidenceTrust: ['verified', 'declared', 'inferred', 'audit'],
    decisionBoundary: 'Diagnostico no ejecuta intervencion.',
  },
  predictive: {
    id: 'predictive',
    label: 'Predictive',
    question: 'Que podria pasar si la tendencia continua?',
    purpose: 'Proyectar riesgo o oportunidad con incertidumbre explicita.',
    allowedEvidenceTrust: ['verified', 'declared', 'inferred', 'simulated', 'sandbox'],
    decisionBoundary: 'No presenta prediccion como hecho observado.',
  },
  prescriptive: {
    id: 'prescriptive',
    label: 'Prescriptive',
    question: 'Que ruta conviene proponer bajo el contrato visible?',
    purpose: 'Formular recomendacion o plan revisable.',
    allowedEvidenceTrust: ['verified', 'declared', 'inferred'],
    decisionBoundary: 'Recomienda; no ejecuta acciones externas.',
  },
  retrospective: {
    id: 'retrospective',
    label: 'Retrospective',
    question: 'Que se aprende de lo ya ocurrido?',
    purpose: 'Leer eventos pasados, cierre y deuda restante.',
    allowedEvidenceTrust: ['verified', 'declared', 'audit', 'unknown'],
    decisionBoundary: 'No reescribe memoria ni cambia linaje.',
  },
  prospective: {
    id: 'prospective',
    label: 'Prospective',
    question: 'Que condiciones futuras deben observarse?',
    purpose: 'Preparar vigilancia, umbrales y senales tempranas.',
    allowedEvidenceTrust: ['verified', 'declared', 'inferred', 'sandbox'],
    decisionBoundary: 'No crea obligaciones externas ni dashboards.',
  },
}

export function isAmvObservationMode(value: unknown): value is AmvObservationMode {
  return typeof value === 'string' && AMV_OBSERVATION_MODES.includes(value as AmvObservationMode)
}
