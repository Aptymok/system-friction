/**
 * Global store — SystemFriction v2 EIDELON
 * Context + reducer shared by all panels.
 */
import React, { useReducer, createContext, useContext } from 'react'
import { snapshotToState, computeMetrics } from './engine.js'
import { DEFAULT_PSI, computeFSoc } from './socsim.js'

// ── Seed MIHM state from a demo snapshot ────────────────────────────────────

const DEMO_SNAPSHOT = { valence: 0.24, arousal: 0.52, tension: 0.35, focus: 0.62 }
const INIT_MIHM = computeMetrics(snapshotToState(DEMO_SNAPSHOT))

// Build a plausible history using a simple LCG
function seedTimeline(base, n = 30) {
  let s = 0xDEAD
  const rng = () => { s = ((1664525 * s + 1013904223) >>> 0); return s / 2 ** 32 }
  const pts = []
  let IHG = base.IHG, NTI = base.NTI, R = base.R
  for (let i = 0; i < n; i++) {
    IHG = Math.max(-1, Math.min(1, IHG + (rng() - 0.5) * 0.06))
    NTI = Math.max(0, Math.min(1, NTI + (rng() - 0.5) * 0.05))
    R   = Math.max(0, Math.min(1, R   + (rng() - 0.5) * 0.03))
    pts.push({ t: i * 0.5, IHG, NTI, R })
  }
  return pts
}

// ── Initial state ────────────────────────────────────────────────────────────

export const INITIAL_STATE = {
  tab: 'dashboard',
  mihm: INIT_MIHM,
  timeline: seedTimeline(INIT_MIHM),
  socsim: { ...DEFAULT_PSI },
  socsimHistory: [{ ...DEFAULT_PSI }],
  socsimRunning: false,
  socsimTick: 0,
  socsimParams: { frictionCoef: 0.1, shockAmplitude: 0.0, noiseLevel: 0.025, tickSeconds: 2 },
  retroMode: false,
  chat: [{ role: 'eidolon', text: 'Bienvenido a Sala Eidolón. ¿Cómo estás en este momento?' }],
  retroactivity: [],
  futureScenarios: [],
  attractor: null,
  selectedNode: null,
  snapshots: [],
}

// ── Reducer ──────────────────────────────────────────────────────────────────

export function reducer(state, action) {
  switch (action.type) {

    case 'SET_TAB':
      return { ...state, tab: action.tab }

    case 'UPDATE_MIHM': {
      const m = computeMetrics(action.mihm)
      const pt = { t: +(state.timeline.at(-1)?.t ?? 0) + 0.5, ...m }
      return {
        ...state,
        mihm: m,
        timeline: [...state.timeline.slice(-79), pt],
      }
    }

    case 'SOCSIM_STEP': {
      const newPsi = action.psi
      const hist = [...state.socsimHistory.slice(-99), newPsi]
      const pt = { t: +(state.timeline.at(-1)?.t ?? 0) + 0.5, ...state.mihm }
      return {
        ...state,
        socsim: newPsi,
        socsimHistory: hist,
        socsimTick: state.socsimTick + 1,
        // Keep timeline fresh
        timeline: [...state.timeline.slice(-79), { ...pt, FSoc: computeFSoc(newPsi) }],
      }
    }

    case 'SET_SOCSIM_RUNNING':
      return { ...state, socsimRunning: action.running }

    case 'SET_SOCSIM_PARAMS':
      return { ...state, socsimParams: { ...state.socsimParams, ...action.params } }

    case 'SET_RETRO_MODE':
      return { ...state, retroMode: action.retro }

    case 'RESET_SOCSIM':
      return {
        ...state,
        socsim: { ...DEFAULT_PSI },
        socsimHistory: [{ ...DEFAULT_PSI }],
        socsimTick: 0,
        socsimRunning: false,
      }

    case 'SAVE_SNAPSHOT':
      return {
        ...state,
        snapshots: [
          ...state.snapshots,
          {
            id: `snap-${Date.now()}`,
            t: Date.now(),
            tick: state.socsimTick,
            mihm: { ...state.mihm },
            psi: { ...state.socsim },
            params: { ...state.socsimParams },
          },
        ],
      }

    case 'ADD_CHAT':
      return { ...state, chat: [...state.chat, ...action.messages] }

    case 'SET_RETRO':
      return { ...state, retroactivity: action.items }

    case 'SET_FUTURE':
      return { ...state, futureScenarios: action.scenarios }

    case 'SET_ATTRACTOR':
      return { ...state, attractor: action.attractor }

    case 'SELECT_NODE':
      return { ...state, selectedNode: action.node }

    default:
      return state
  }
}

// ── Context + hook ────────────────────────────────────────────────────────────

export const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [store, dispatch] = useReducer(reducer, INITIAL_STATE)
  return (
    <StoreContext.Provider value={{ store, dispatch }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  return useContext(StoreContext)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function statusClass(status) {
  return status === 'OK' ? 'ok' : status === 'DEGRADED' ? 'wa' : 'al'
}

export function valClass(v, highIsGood = true) {
  if (highIsGood) return v > 0.6 ? 'ok' : v < 0.3 ? 'al' : 'wa'
  return v < 0.3 ? 'ok' : v > 0.6 ? 'al' : 'wa'
}

export function fmt2(v) {
  return typeof v === 'number' ? v.toFixed(2) : '—'
}
