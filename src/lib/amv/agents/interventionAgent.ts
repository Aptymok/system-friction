export type AmvInterventionAgentInput = {
  planId?: string
  approved?: boolean
}

export type AmvInterventionAgentResult = {
  operator: 'intervention'
  planId: string
  approved: boolean
  canExecuteExternal: false
  warnings: string[]
}

export function evaluateAmvIntervention(input: AmvInterventionAgentInput = {}): AmvInterventionAgentResult {
  return {
    operator: 'intervention',
    planId: input.planId ?? 'intervention.plan.unassigned',
    approved: Boolean(input.approved),
    canExecuteExternal: false,
    warnings: ['intervention_plan_only_no_external_execution'],
  }
}
