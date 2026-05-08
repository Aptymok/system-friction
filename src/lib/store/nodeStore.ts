'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Audit, Metrics, Node } from '@/lib/types'

interface NodeState {
  node: Node | null
  audits: Audit[]
  metrics: Metrics
  isAuthenticated: boolean
  loading: boolean
  setNode: (node: Node | null) => void
  setAudits: (audits: Audit[]) => void
  addAudit: (audit: Audit) => void
  updateMetrics: (metrics: Partial<Metrics>) => void
  createAnonymousNode: () => Promise<Node | null>
  loadAudits: (nodeId: string) => Promise<void>
  syncWithToken: (token: string) => Promise<boolean>
  clear: () => void
}

const emptyMetrics: Metrics = { ihg: 0, nti: 0.5, ldi: 72, loop_score: 0, divergence: 0 }

export const useNodeStore = create<NodeState>()(
  persist(
    (set, get) => ({
      node: null,
      audits: [],
      metrics: emptyMetrics,
      isAuthenticated: false,
      loading: false,
      setNode: (node) => set({ node, isAuthenticated: Boolean(node) }),
      setAudits: (audits) => set({ audits }),
      addAudit: (audit) => set((state) => ({ audits: [audit, ...state.audits].slice(0, 50) })),
      updateMetrics: (metrics) => set((state) => ({ metrics: { ...state.metrics, ...metrics } })),
      createAnonymousNode: async () => {
        set({ loading: true })
        const response = await fetch('/api/node/bootstrap', { method: 'POST' })
        const result = (await response.json()) as { node?: Node }
        if (result.node) set({ node: result.node, isAuthenticated: true })
        set({ loading: false })
        return result.node || null
      },
      loadAudits: async (nodeId) => {
        const response = await fetch(`/api/node/${nodeId}`)
        const result = (await response.json()) as { node?: Node; audits?: Audit[] }
        if (result.node) set({ node: result.node, isAuthenticated: true })
        if (result.audits) {
          set({ audits: result.audits })
          const last = result.audits[0]
          if (last) {
            get().updateMetrics({
              ihg: last.ihg,
              nti: last.nti,
              ldi: last.ldi,
              loop_score: last.loop_score,
              divergence: last.divergence
            })
          }
        }
      },
      syncWithToken: async (token) => {
        set({ loading: true })
        const response = await fetch('/api/link/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })
        const result = (await response.json()) as { valid: boolean; node?: Node }
        if (result.valid && result.node) {
          set({ node: result.node, isAuthenticated: true })
          await get().loadAudits(result.node.id)
          set({ loading: false })
          return true
        }
        set({ loading: false })
        return false
      },
      clear: () => set({ node: null, audits: [], metrics: emptyMetrics, isAuthenticated: false })
    }),
    {
      name: 'sf-node-storage',
      partialize: (state) => ({ node: state.node, isAuthenticated: state.isAuthenticated })
    }
  )
)
