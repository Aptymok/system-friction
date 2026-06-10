import type { AmvMemoryDelta, AmvMemoryReference } from './amv-core'

type AmvMemoryStore = {
  entries: AmvMemoryDelta[]
}

const GLOBAL_KEY = '__sfi_amv_memory_store__'

function store(): AmvMemoryStore {
  const globalStore = globalThis as typeof globalThis & { [GLOBAL_KEY]?: AmvMemoryStore }
  if (!globalStore[GLOBAL_KEY]) globalStore[GLOBAL_KEY] = { entries: [] }
  return globalStore[GLOBAL_KEY]
}

export function saveAmvMemory(delta: AmvMemoryDelta) {
  const current = store()
  current.entries = [delta, ...current.entries.filter((item) => item.id !== delta.id)].slice(0, 500)
  return delta
}

export function listAmvMemory(filter: { module?: string; sessionId?: string; limit?: number } = {}) {
  const limit = Math.max(1, Math.min(100, filter.limit ?? 25))
  return store().entries
    .filter((item) => !filter.module || item.module === filter.module)
    .filter((item) => !filter.sessionId || item.sessionId === filter.sessionId)
    .slice(0, limit)
}

export function listAmvMemoryReferences(filter: { module?: string; sessionId?: string; limit?: number } = {}): AmvMemoryReference[] {
  return listAmvMemory(filter).map((item) => ({
    id: item.id,
    createdAt: item.createdAt,
    module: item.module,
    summary: item.summary,
    evidenceHash: item.evidenceHash,
  }))
}

export function clearAmvMemory(filter: { module?: string; sessionId?: string } = {}) {
  const current = store()
  const before = current.entries.length
  current.entries = current.entries.filter((item) => {
    if (filter.module && item.module !== filter.module) return true
    if (filter.sessionId && item.sessionId !== filter.sessionId) return true
    return false
  })
  return { deleted: before - current.entries.length, remaining: current.entries.length }
}
