import type { Audit, Node, StoreSnapshot } from '@/lib/types'

const globalStore = globalThis as typeof globalThis & { __sfiStore?: StoreSnapshot }

function now() {
  return new Date().toISOString()
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`
}

export function getRuntimeStore(): StoreSnapshot {
  if (!globalStore.__sfiStore) {
    const node: Node = {
      id: id('node'),
      source: 'web',
      whatsapp_phone: null,
      current_ihg: 0,
      current_nti: 0.5,
      current_ldi: 72,
      created_at: now(),
      updated_at: now(),
      last_sync: null
    }
    globalStore.__sfiStore = { nodes: [node], audits: [], links: [] }
  }
  return globalStore.__sfiStore
}

export function createNode(source: Node['source'], whatsapp_phone?: string | null) {
  const store = getRuntimeStore()
  const existing = whatsapp_phone ? store.nodes.find((node) => node.whatsapp_phone === whatsapp_phone) : undefined
  if (existing) return existing

  const node: Node = {
    id: id('node'),
    source,
    whatsapp_phone: whatsapp_phone || null,
    current_ihg: 0,
    current_nti: 0.5,
    current_ldi: 72,
    created_at: now(),
    updated_at: now(),
    last_sync: null
  }
  store.nodes.unshift(node)
  return node
}

export function getNode(nodeId?: string, whatsapp_phone?: string) {
  const store = getRuntimeStore()
  if (nodeId) return store.nodes.find((node) => node.id === nodeId)
  if (whatsapp_phone) return store.nodes.find((node) => node.whatsapp_phone === whatsapp_phone)
  return undefined
}

export function updateNodeMetrics(nodeId: string, audit: Audit) {
  const node = getNode(nodeId)
  if (!node) return
  node.current_ihg = audit.ihg
  node.current_nti = audit.nti
  node.current_ldi = audit.ldi
  node.updated_at = now()
  node.last_sync = now()
}

export function createAudit(audit: Omit<Audit, 'id' | 'created_at'>) {
  const store = getRuntimeStore()
  const row: Audit = { ...audit, id: id('audit'), created_at: now() }
  store.audits.unshift(row)
  updateNodeMetrics(row.node_id, row)
  return row
}

export function getAudits(nodeId: string, limit = 30) {
  return getRuntimeStore().audits.filter((audit) => audit.node_id === nodeId).slice(0, limit)
}

export function createLink(node_id: string, token: string, expires_at: string) {
  const store = getRuntimeStore()
  const link = { id: id('link'), token, node_id, expires_at, used_at: null, created_at: now() }
  store.links.unshift(link)
  return link
}

export function verifyLink(token: string) {
  const link = getRuntimeStore().links.find((item) => item.token === token)
  if (!link) return null
  if (new Date(link.expires_at) < new Date()) return null
  link.used_at ||= now()
  return { link, node: getNode(link.node_id) }
}
