import { AMV_FIELD_OPERATOR_DEFINITIONS } from './fieldOperatorTypes'

export const AMV_ATTRACTOR_MODE = {
  operator: AMV_FIELD_OPERATOR_DEFINITIONS.attractor,
  allowedOutputs: ['briefing', 'field_reading', 'attractor_map', 'decision_record'] as const,
  rule: 'Attractor orienta ruta y peso direccional; no ejecuta acciones.',
}

export type AmvAttractorMode = typeof AMV_ATTRACTOR_MODE
