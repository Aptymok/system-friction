import { create } from 'zustand'
import type { Audit, MemoryFact, Metrics, Node, NodeSnapshot, OperationalAction } from '@/lib/types'
import { applySignalEffect, normalizeMetrics, type TelemetrySignal } from '@/observatory/store/pulseEngine'

const SNAPSHOT_STORAGE_KEY = 'sfi-node-snapshots'

interface NodeState {
  node: Node | null
  audits: Audit[]
  memoryFacts: MemoryFact[]
  actions: OperationalAction[]
  snapshotHistory: NodeSnapshot[]
  phase: number
  syncWithToken: (token: string) => Promise<boolean>
  metrics: Metrics
  status: 'operational' | 'standby' | 'critical' | 'frozen'
  logs: Array<{ type: string; content: string; timestamp: string }>
  updateMetrics: (newMetrics: Partial<Metrics>) => void
  setPhase: (phase: number) => void
  addLog: (content: string, type?: string, signal?: TelemetrySignal) => void
  ingestSignal: (signal: TelemetrySignal, detail?: string) => void
  addSnapshot: (label: string, note?: string) => void
  loadSnapshotHistory: () => void
  setStatus: (status: NodeState['status']) => void
  setNode: (node: Node | null) => void
  setAudits: (audits: Audit[]) => void
  setMemoryFacts: (facts: MemoryFact[]) => void
  setActions: (actions: OperationalAction[]) => void
  bootstrap: () => Promise<void>
}

function persistSnapshots(snapshots: NodeSnapshot[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots))
  } catch {
    // silently ignore storage failures
  }
}

function createSnapshot(label: string, note: string | undefined, state: Pick<NodeState, 'metrics' | 'status'>): NodeSnapshot {
  return {
    timestamp: new Date().toISOString(),
    label,
    note,
    status: state.status,
    metrics: state.metrics,
  }
}

const defaultMetrics: Metrics = normalizeMetrics({ ihg: 0.85, nti: 0.92, ldi: 0.05, divergence: 0.05, loop_score: 0 })

export const useNodeStore = create<NodeState>((set, get) => ({
  node: null,
  audits: [],
  memoryFacts: [],
  actions: [],
  snapshotHistory: [],
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
  metrics: defaultMetrics,
  phase: 1,
  status: 'operational',
  logs: [{ type: 'system', content: 'Nodo Soberano Iniciado', timestamp: new Date().toISOString() }],

  setPhase: (phase) => set({ phase }),
  updateMetrics: (newMetrics) =>
    set((state) => {
      const nextMetrics = normalizeMetrics({ ...state.metrics, ...newMetrics })
      const snapshot = createSnapshot('Metric update', 'Ajuste de telemetría sistémica', { metrics: nextMetrics, status: state.status })
      const nextSnapshots = [snapshot, ...state.snapshotHistory].slice(0, 60)
      persistSnapshots(nextSnapshots)
      return {
        metrics: nextMetrics,
        snapshotHistory: nextSnapshots,
      }
    }),

  addLog: (content, type = 'info', signal) =>
    set((state) => {
      const logs = [{ type, content, timestamp: new Date().toISOString() }, ...state.logs].slice(0, 50)
      let metrics = state.metrics
      if (signal) {
        metrics = applySignalEffect(metrics, signal)
      } else if (/contradicci/i.test(content)) {
        metrics = applySignalEffect(metrics, 'contradiction')
      } else if (/evasión|evasión/i.test(content)) {
        metrics = applySignalEffect(metrics, 'evasion')
      }
      const snapshot = createSnapshot('Log event', content, { metrics, status: state.status })
      const nextSnapshots = [snapshot, ...state.snapshotHistory].slice(0, 60)
      persistSnapshots(nextSnapshots)
      return {
        logs,
        metrics,
        snapshotHistory: nextSnapshots,
      }
    }),

  ingestSignal: (signal, detail) =>
    set((state) => {
      const nextMetrics = applySignalEffect(state.metrics, signal)
      const logs = [
        {
          type: 'telemetry',
          content: `Señal ${signal}: ${detail ?? 'Pulse de infraestructura'}`,
          timestamp: new Date().toISOString(),
        },
        ...state.logs,
      ].slice(0, 50)
      const snapshot = createSnapshot(`Signal ${signal}`, detail, { metrics: nextMetrics, status: state.status })
      const nextSnapshots = [snapshot, ...state.snapshotHistory].slice(0, 60)
      persistSnapshots(nextSnapshots)
      return {
        metrics: nextMetrics,
        logs,
        snapshotHistory: nextSnapshots,
      }
    }),

  addSnapshot: (label, note) =>
    set((state) => {
      const snapshot = createSnapshot(label, note, state)
      const nextSnapshots = [snapshot, ...state.snapshotHistory].slice(0, 60)
      persistSnapshots(nextSnapshots)
      return { snapshotHistory: nextSnapshots }
    }),

  loadSnapshotHistory: () => {
    if (typeof window === 'undefined') return
    try {
      const stored = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY)
      if (!stored) return
      const parsed = JSON.parse(stored) as NodeSnapshot[]
      set({ snapshotHistory: parsed })
    } catch {
      // ignore invalid storage content
    }
  },

  setStatus: (status) => set({ status }),
  setNode: (node) => set({ node }),
  setAudits: (audits) => set({ audits }),
  setMemoryFacts: (facts) => set({ memoryFacts: facts }),
  setActions: (actions) => set({ actions }),
  bootstrap: async () => {
    try {
      const response = await fetch('/api/node/bootstrap', { cache: 'no-store' })
      if (!response.ok) {
        get().addLog('Bootstrap de nodo rechazado por capa auth', 'auth', 'evasion')
        return
      }
      const result = await response.json()
      const node = result.node as Node | null
      const audits = (result.audits || []) as Audit[]
      const memoryFacts = (result.memory_facts || []) as MemoryFact[]
      const actions = (result.actions || []) as OperationalAction[]

      set({
        node,
        audits,
        memoryFacts,
        actions,
        status: 'operational',
        metrics: normalizeMetrics({
          ihg: Number(node?.current_ihg ?? audits[0]?.ihg ?? defaultMetrics.ihg),
          nti: Number(node?.current_nti ?? audits[0]?.nti ?? defaultMetrics.nti),
          ldi: Number(node?.current_ldi ?? audits[0]?.ldi ?? defaultMetrics.ldi),
          divergence: Number(audits[0]?.divergence ?? defaultMetrics.divergence),
          loop_score: Number(audits[0]?.loop_score ?? defaultMetrics.loop_score),
        }),
      })
      get().addLog('Sesion hidratada: nodo longitudinal sincronizado', 'auth', 'syncPulse')
    } catch {
      get().addLog('Bootstrap local activo: telemetria sin persistencia remota', 'system', 'evasion')
    }
  },
}))
