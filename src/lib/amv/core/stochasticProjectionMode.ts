import { AMV_FIELD_OPERATOR_DEFINITIONS } from './fieldOperatorTypes'

export const AMV_STOCHASTIC_PROJECTION_MODE = {
  operator: AMV_FIELD_OPERATOR_DEFINITIONS.stochastic_projection,
  allowedOutputs: ['simulation_report', 'scenario_matrix', 'early_warning'] as const,
  sandbox: true,
  rule: 'Stochastic projection siempre queda sandbox hasta aprobacion humana explicita.',
}

export type AmvStochasticProjectionMode = typeof AMV_STOCHASTIC_PROJECTION_MODE
