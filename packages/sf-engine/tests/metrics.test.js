import { describe, it, expect } from 'vitest'
import { snapshotToState, computeMetrics, classifyStatus } from '../src/metrics.js'
import { makeCognitiveSnapshot } from '@sf/core'

describe('snapshotToState', () => {
  it('calcula estado desde snapshot equilibrado', () => {
    const snap = makeCognitiveSnapshot({ valence: 0, arousal: 0.5, tension: 0.5, focus: 0.5 })
    const state = snapshotToState(snap)
    expect(state.IHG).toBeGreaterThanOrEqual(-1)
    expect(state.IHG).toBeLessThanOrEqual(1)
    expect(state.NTI).toBeGreaterThanOrEqual(0)
    expect(state.NTI).toBeLessThanOrEqual(1)
    expect(state.R).toBeGreaterThanOrEqual(0)
    expect(state.R).toBeLessThanOrEqual(1)
  })

  it('alta tensión → NTI alta, IHG baja', () => {
    const hi = makeCognitiveSnapshot({ valence: -0.5, tension: 0.9, arousal: 0.5, focus: 0.3 })
    const lo = makeCognitiveSnapshot({ valence: 0.5, tension: 0.1, arousal: 0.5, focus: 0.7 })
    const sHi = snapshotToState(hi)
    const sLo = snapshotToState(lo)
    expect(sHi.NTI).toBeGreaterThan(sLo.NTI)
    expect(sHi.IHG).toBeLessThan(sLo.IHG)
  })

  it('valores nunca NaN ni Inf', () => {
    const snap = makeCognitiveSnapshot({ valence: 0, arousal: 0, tension: 0, focus: 0 })
    const state = snapshotToState(snap)
    for (const v of Object.values(state)) {
      expect(isFinite(v)).toBe(true)
    }
  })

  it('estado determinista: mismo snapshot → mismo estado', () => {
    const snap = makeCognitiveSnapshot({ id: 'x', timestamp: 1000, valence: 0.3, arousal: 0.6, tension: 0.4, focus: 0.7 })
    const s1 = snapshotToState(snap)
    const s2 = snapshotToState(snap)
    expect(s1).toEqual(s2)
  })
})

describe('computeMetrics', () => {
  it('frictionScore ∈ [0,1]', () => {
    const tests = [
      { IHG: -0.8, NTI: 0.9, R: 0.1, IAD: 0.3, ETE: 0.2 },
      { IHG: 0.5, NTI: 0.1, R: 0.9, IAD: 0.8, ETE: 0.7 },
      { IHG: 0, NTI: 0.5, R: 0.5, IAD: 0.5, ETE: 0.5 },
    ]
    for (const state of tests) {
      const m = computeMetrics(state)
      expect(m.frictionScore).toBeGreaterThanOrEqual(0)
      expect(m.frictionScore).toBeLessThanOrEqual(1)
      expect(isFinite(m.frictionScore)).toBe(true)
    }
  })

  it('retorna status válido', () => {
    const validStatuses = ['OK', 'DEGRADED', 'CRITICAL', 'COLLAPSE']
    const m = computeMetrics({ IHG: 0, NTI: 0.5, R: 0.5, IAD: 0.5, ETE: 0.5 })
    expect(validStatuses).toContain(m.status)
  })
})

describe('classifyStatus', () => {
  it('IHG < -0.8 → COLLAPSE', () => {
    expect(classifyStatus(-0.9, 0.5, 0.9)).toBe('COLLAPSE')
  })
  it('IHG en rango ok, frictionScore bajo → OK', () => {
    expect(classifyStatus(0.5, 0.1, 0.1)).toBe('OK')
  })
  it('estado degradado → DEGRADED', () => {
    expect(classifyStatus(-0.3, 0.6, 0.5)).toBe('DEGRADED')
  })
})
