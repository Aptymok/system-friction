export type AmvStochasticProjectionAgentResult = {
  operator: 'stochastic_projection'
  sandbox: true
  requiresApproval: true
  canFeedRegime: false
  canExecuteExternal: false
  warnings: string[]
}

export function evaluateAmvStochasticProjection(): AmvStochasticProjectionAgentResult {
  return {
    operator: 'stochastic_projection',
    sandbox: true,
    requiresApproval: true,
    canFeedRegime: false,
    canExecuteExternal: false,
    warnings: ['stochastic_projection_sandbox_until_approval'],
  }
}
