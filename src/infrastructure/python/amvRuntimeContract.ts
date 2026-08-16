export type AmvPythonRuntimeState =
  | 'available_not_invoked'
  | 'degraded'
  | 'timeout'
  | 'contract_error'
  | 'sandbox_only'

export type AmvPythonRuntimeContract = {
  ok: true
  state: AmvPythonRuntimeState
  importsServicesPython: false
  executesPythonByDefault: false
  reason: string
}

export function getPythonRuntimeContract(state: AmvPythonRuntimeState = 'available_not_invoked'): AmvPythonRuntimeContract {
  return {
    ok: true,
    state,
    importsServicesPython: false,
    executesPythonByDefault: false,
    reason: 'AMV expone contrato TS; no importa ni ejecuta services/python.',
  }
}
