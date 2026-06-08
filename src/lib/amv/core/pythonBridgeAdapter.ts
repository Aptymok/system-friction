export type AmvPythonBridgeState =
  | 'available_not_invoked'
  | 'degraded'
  | 'timeout'
  | 'contract_error'
  | 'sandbox_only'

export type AmvPythonBridgeContract = {
  ok: true
  state: AmvPythonBridgeState
  importsServicesPython: false
  executesPythonByDefault: false
  reason: string
}

export function getPythonBridgeContract(state: AmvPythonBridgeState = 'available_not_invoked'): AmvPythonBridgeContract {
  return {
    ok: true,
    state,
    importsServicesPython: false,
    executesPythonByDefault: false,
    reason: 'AMV expone contrato TS; no importa ni ejecuta services/python.',
  }
}
