import { AMV_FIELD_OPERATOR_DEFINITIONS } from './fieldOperatorTypes'

export const AMV_INTERVENTION_MODE = {
  operator: AMV_FIELD_OPERATOR_DEFINITIONS.intervention,
  allowedOutputs: ['intervention_plan', 'risk_register', 'decision_record'] as const,
  executesExternal: false,
  rule: 'Intervention formula planes revisables; no ejecuta nada externo.',
}

export type AmvInterventionMode = typeof AMV_INTERVENTION_MODE
