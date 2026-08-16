export type MihmContextState = {
  ok: true
  objectDeclared: boolean
  state: 'available_not_invoked' | 'degraded'
  boundary: string
}

export function getMihmContext(objectDeclared: boolean): MihmContextState {
  return {
    ok: true,
    objectDeclared,
    state: objectDeclared ? 'available_not_invoked' : 'degraded',
    boundary: objectDeclared ? 'MIHM puede leerse como contrato.' : 'No MIHM sin objeto declarado.',
  }
}


export type WorldSpectContextState = {
  ok: true
  source: 'contract_only'
  state: 'degraded' | 'available_not_invoked'
  boundary: string
}

export function getWorldSpectContext(): WorldSpectContextState {
  return {
    ok: true,
    source: 'contract_only',
    state: 'available_not_invoked',
    boundary: 'WorldSpect no se ejecuta desde AMV; se consume como contexto visible si existe.',
  }
}
