import { describe, it, expect } from 'vitest'
import { simulate } from '../src/simulate.js'
import { snapshotToState } from '../src/metrics.js'
import { makeCognitiveSnapshot } from '@sf/core'

function makeX0(fields = {}) {
  const snap = makeCognitiveSnapshot(fields)
  return snapshotToState(snap)
}

describe('simulate — determinismo', () => {
  it('mismo seed → trayectoria idéntica', () => {
    const x0 = makeX0({ valence: 0.2, arousal: 0.6, tension: 0.4, focus: 0.7 })
    const r1 = simulate(x0, {}, 42, 10, 0.5)
    const r2 = simulate(x0, {}, 42, 10, 0.5)
    expect(r1.trajectory).toEqual(r2.trajectory)
    expect(r1.finalMetrics).toEqual(r2.finalMetrics)
  })

  it('distinto seed → trayectoria diferente', () => {
    const x0 = makeX0({ valence: 0.2, arousal: 0.6, tension: 0.4, focus: 0.7 })
    const r1 = simulate(x0, {}, 42, 10, 0.5)
    const r2 = simulate(x0, {}, 99, 10, 0.5)
    // No es imposible que sean iguales por azar, pero muy improbable con 10 pasos
    expect(r1.trajectory.map(p => p.IHG)).not.toEqual(r2.trajectory.map(p => p.IHG))
  })
})

describe('simulate — sanity checks', () => {
  it('no NaN ni Inf en trayectoria', () => {
    const x0 = makeX0({ valence: -0.5, arousal: 0.8, tension: 0.9, focus: 0.2 })
    const { trajectory } = simulate(x0, {}, 'test-seed', 20, 0.1)
    for (const pt of trajectory) {
      for (const [k, v] of Object.entries(pt)) {
        if (typeof v === 'number') {
          expect(isFinite(v), `${k} debe ser finito`).toBe(true)
        }
      }
    }
  })

  it('IHG siempre en [-1.5, 1.5]', () => {
    const x0 = makeX0({ valence: -0.9, tension: 0.95, arousal: 0.1, focus: 0.1 })
    const { trajectory } = simulate(x0, {}, 'clamp-test', 30, 0.1)
    for (const pt of trajectory) {
      expect(pt.IHG).toBeGreaterThanOrEqual(-1.5)
      expect(pt.IHG).toBeLessThanOrEqual(1.5)
    }
  })

  it('NTI siempre >= 0', () => {
    const x0 = makeX0({ valence: 0.8, tension: 0.05, arousal: 0.5, focus: 0.9 })
    const { trajectory } = simulate(x0, {}, 'nti-test', 20, 0.2)
    for (const pt of trajectory) {
      expect(pt.NTI).toBeGreaterThanOrEqual(0)
    }
  })

  it('T pequeño (T=2, dt=0.1) corre rápido (< 200ms)', () => {
    const x0 = makeX0({ valence: 0, arousal: 0.5, tension: 0.5, focus: 0.5 })
    const t0 = Date.now()
    simulate(x0, {}, 1, 2, 0.1)
    expect(Date.now() - t0).toBeLessThan(200)
  })

  it('trayectoria tiene el número correcto de puntos', () => {
    const x0 = makeX0({ valence: 0.1, arousal: 0.5, tension: 0.3, focus: 0.6 })
    const { trajectory } = simulate(x0, {}, 7, 10, 1.0)
    // Con dt=1.0 y T=10, se guardan ~10 puntos + el t=0
    expect(trajectory.length).toBeGreaterThanOrEqual(10)
    expect(trajectory.length).toBeLessThanOrEqual(15)
  })

  it('finalMetrics tiene todos los campos requeridos', () => {
    const x0 = makeX0()
    const { finalMetrics } = simulate(x0)
    expect(finalMetrics).toHaveProperty('IHG')
    expect(finalMetrics).toHaveProperty('NTI')
    expect(finalMetrics).toHaveProperty('R')
    expect(finalMetrics).toHaveProperty('IAD')
    expect(finalMetrics).toHaveProperty('ETE')
    expect(finalMetrics).toHaveProperty('frictionScore')
    expect(finalMetrics).toHaveProperty('status')
  })
})

describe('simulate — rangos básicos', () => {
  it('estado de alta tensión: frictionScore > 0.1', () => {
    const x0 = makeX0({ valence: -0.8, tension: 0.9, arousal: 0.9, focus: 0.1 })
    const { finalMetrics } = simulate(x0, {}, 42, 5, 0.5)
    expect(finalMetrics.frictionScore).toBeGreaterThan(0.1)
  })

  it('estado equilibrado: frictionScore < 0.9', () => {
    const x0 = makeX0({ valence: 0, arousal: 0.5, tension: 0.5, focus: 0.5 })
    const { finalMetrics } = simulate(x0, {}, 42, 30, 0.5)
    expect(finalMetrics.frictionScore).toBeLessThan(0.9)
  })
})
