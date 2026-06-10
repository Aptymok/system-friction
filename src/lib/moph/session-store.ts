import { createServiceSupabaseClient } from '@/runtime/supabase/server'
import type { MophSessionPayload } from './session-contract'

type StoredMophSession = MophSessionPayload & {
  id: string
  stored: boolean
  createdAt: string
  warnings: string[]
}

const GLOBAL_KEY = '__sfi_moph_session_store__'

function fallbackStore() {
  const globalStore = globalThis as typeof globalThis & { [GLOBAL_KEY]?: Map<string, StoredMophSession> }
  if (!globalStore[GLOBAL_KEY]) globalStore[GLOBAL_KEY] = new Map()
  return globalStore[GLOBAL_KEY]
}

function rowToSession(row: Record<string, unknown>): StoredMophSession {
  return {
    id: String(row.id),
    sessionKey: String(row.session_key),
    consentState: row.consent_state === 'account_persisted' ? 'account_persisted' : row.consent_state === 'anonymous_persisted' ? 'anonymous_persisted' : 'local_only',
    movementTraceDigest: String(row.movement_trace_digest),
    choices: Array.isArray(row.choices) ? row.choices as StoredMophSession['choices'] : [],
    texts: Array.isArray(row.texts) ? row.texts as StoredMophSession['texts'] : [],
    behavioralNodes: Array.isArray(row.behavioral_nodes) ? row.behavioral_nodes.map(String) : [],
    metrics: row.metrics && typeof row.metrics === 'object' ? row.metrics as StoredMophSession['metrics'] : { ihg: 0, nti: 0, ldi: 0, go: 0, epsilon: 0, phi: 0 },
    publicSummary: row.public_summary && typeof row.public_summary === 'object' ? row.public_summary as Record<string, unknown> : {},
    stored: true,
    createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    warnings: [],
  }
}

export async function saveMophSession(payload: MophSessionPayload): Promise<StoredMophSession> {
  const warnings: string[] = []
  try {
    const service = createServiceSupabaseClient()
    const { data, error } = await service
      .from('sfi_moph_sessions')
      .upsert({
        session_key: payload.sessionKey,
        consent_state: payload.consentState,
        movement_trace_digest: payload.movementTraceDigest,
        choices: payload.choices,
        texts: payload.texts,
        behavioral_nodes: payload.behavioralNodes,
        metrics: payload.metrics,
        public_summary: payload.publicSummary,
        observed_at: new Date().toISOString(),
      }, { onConflict: 'session_key' })
      .select('*')
      .single()

    if (error) {
      warnings.push(`moph_sessions_write_failed:${error.message}`)
    } else if (data) {
      return rowToSession(data as Record<string, unknown>)
    }
  } catch (error) {
    warnings.push(`moph_sessions_not_ready:${error instanceof Error ? error.message : 'unknown'}`)
  }

  const fallback: StoredMophSession = {
    ...payload,
    id: `moph_local_${payload.sessionKey}`,
    stored: false,
    createdAt: new Date().toISOString(),
    warnings,
  }
  fallbackStore().set(payload.sessionKey, fallback)
  return fallback
}

export async function getMophSession(sessionKey: string): Promise<StoredMophSession | null> {
  try {
    const service = createServiceSupabaseClient()
    const { data, error } = await service
      .from('sfi_moph_sessions')
      .select('*')
      .eq('session_key', sessionKey)
      .maybeSingle()

    if (!error && data) return rowToSession(data as Record<string, unknown>)
  } catch {
    // fallback below
  }

  return fallbackStore().get(sessionKey) ?? null
}
