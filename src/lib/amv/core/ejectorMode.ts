import { AMV_FIELD_OPERATOR_DEFINITIONS } from './fieldOperatorTypes'

export const AMV_EJECTOR_MODE = {
  operator: AMV_FIELD_OPERATOR_DEFINITIONS.ejector,
  allowedOutputs: ['early_warning', 'risk_register', 'ejector_map', 'decision_record'] as const,
  rule: 'Ejector puede bloquear cierre fuerte cuando hay riesgo, contaminacion o falta de soporte.',
}

export type AmvEjectorMode = typeof AMV_EJECTOR_MODE
