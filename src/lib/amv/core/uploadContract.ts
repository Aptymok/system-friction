export type AmvUploadObjectType = 'evidencia' | 'cancion' | 'demo' | 'letra' | 'campana' | 'documento' | 'audit_mihm'

export type AmvUploadContract = {
  ok: true
  objectType: AmvUploadObjectType
  storageEnabled: false
  schemaRequired: boolean
  status: 'contract_only' | 'blocked_requires_schema'
  requiredEvidence: string[]
}

export function buildUploadContract(objectType: AmvUploadObjectType): AmvUploadContract {
  return {
    ok: true,
    objectType,
    storageEnabled: false,
    schemaRequired: true,
    status: 'blocked_requires_schema',
    requiredEvidence: ['origen', 'timestamp', 'objeto observado', 'nivel de confianza', 'linaje'],
  }
}
