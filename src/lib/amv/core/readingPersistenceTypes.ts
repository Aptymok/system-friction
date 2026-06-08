export type AmvReadingPersistenceStatus = 'safe_saved_contract' | 'degraded_no_persistence' | 'blocked_not_authorized'

export type AmvReadingPersistenceResult = {
  ok: true
  status: AmvReadingPersistenceStatus
  writesDatabase: false
  readingId: string
  reason: string
}

export function buildReadingPersistenceContract(scope: string, authorized = false): AmvReadingPersistenceResult {
  return {
    ok: true,
    status: authorized ? 'safe_saved_contract' : 'degraded_no_persistence',
    writesDatabase: false,
    readingId: `amv_reading_${scope}_${Date.now().toString(36)}`,
    reason: authorized ? 'Contrato preparado; DB write no ejecutado.' : 'No hay persistencia autorizada; no se simula escritura.',
  }
}
