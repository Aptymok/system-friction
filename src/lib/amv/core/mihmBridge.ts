export type MihmBridgeState = {
  ok: true
  objectDeclared: boolean
  state: 'available_not_invoked' | 'degraded'
  boundary: string
}

export function getMihmBridge(objectDeclared: boolean): MihmBridgeState {
  return {
    ok: true,
    objectDeclared,
    state: objectDeclared ? 'available_not_invoked' : 'degraded',
    boundary: objectDeclared ? 'MIHM puede leerse como contrato.' : 'No MIHM sin objeto declarado.',
  }
}
