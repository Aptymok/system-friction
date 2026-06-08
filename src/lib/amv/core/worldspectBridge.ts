export type WorldSpectBridgeState = {
  ok: true
  source: 'contract_only'
  state: 'degraded' | 'available_not_invoked'
  boundary: string
}

export function getWorldSpectBridge(): WorldSpectBridgeState {
  return {
    ok: true,
    source: 'contract_only',
    state: 'available_not_invoked',
    boundary: 'WorldSpect no se ejecuta desde AMV; se consume como contexto visible si existe.',
  }
}
