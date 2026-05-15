import { create } from 'zustand'
import type { Audit, MemoryFact, Node, OperationalAction } from '@/lib/types'

interface NodeState {
  node: Node | null
  audits: Audit[]
  memoryFacts: MemoryFact[]
  actions: OperationalAction[]
  syncWithToken: (token: string) => Promise<boolean>
  metrics: {
    ihg: number
    nti: number
    divergence: number
  }
  status: 'operational' | 'standby' | 'critical' | 'frozen'
  logs: Array<{ type: string; content: string; timestamp: string }>
  updateMetrics: (newMetrics: Partial<NodeState['metrics']>) => void
  addLog: (content: string, type?: string) => void
  setStatus: (status: NodeState['status']) => void
  setNode: (node: Node | null) => void
  setAudits: (audits: Audit[]) => void
  setMemoryFacts: (facts: MemoryFact[]) => void
  setActions: (actions: OperationalAction[]) => void
}

export const useNodeStore = create<NodeState>((set) => ({
  node: null,
  audits: [],
  memoryFacts: [],
  actions: [],
  syncWithToken: async (token: string) => {
    try {
      const response = await fetch(`/api/link/verify?token=${encodeURIComponent(token)}`)
      if (!response.ok) return false
      const result = await response.json()
      return result?.valid === true
    } catch {
      return false
    }
  },
  metrics: { ihg: 0.85, nti: 0.92, divergence: 0.05 },
  status: 'operational',
  logs: [{ type: 'system', content: 'Nodo Soberano Iniciado', timestamp: new Date().toISOString() }],

  updateMetrics: (newMetrics) =>
    set((state) => ({
      metrics: { ...state.metrics, ...newMetrics },
    })),

  addLog: (content, type = 'info') =>
    set((state) => ({
      logs: [{ type, content, timestamp: new Date().toISOString() }, ...state.logs].slice(0, 50),
    })),

  setStatus: (status) => set({ status }),
  setNode: (node) => set({ node }),
  setAudits: (audits) => set({ audits }),
  setMemoryFacts: (facts) => set({ memoryFacts: facts }),
  setActions: (actions) => set({ actions }),
}))
