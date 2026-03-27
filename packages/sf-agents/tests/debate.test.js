import { describe, it, expect } from 'vitest'
import { runDebate } from '../src/debate.js'
import { makeCognitiveSnapshot } from '@sf/core'

function makeSnap(fields = {}) {
  return makeCognitiveSnapshot({ valence: 0.1, arousal: 0.5, tension: 0.4, focus: 0.6, ...fields })
}

describe('runDebate — determinismo', () => {
  it('mismo seed → mismos escenarios y votos', () => {
    const snap = makeSnap()
    const r1 = runDebate(snap, { seed: 42, T: 10, dt: 1 })
    const r2 = runDebate(snap, { seed: 42, T: 10, dt: 1 })
    expect(r1.scenarios.map(s => s.label)).toEqual(r2.scenarios.map(s => s.label))
    expect(r1.votes.map(v => v.score)).toEqual(r2.votes.map(v => v.score))
    expect(r1.top3.consensus.id).toBe(r2.top3.consensus.id)
    expect(r1.top3.efficiency.id).toBe(r2.top3.efficiency.id)
    expect(r1.top3.wildcard.id).toBe(r2.top3.wildcard.id)
  })

  it('distinto seed → resultado puede diferir', () => {
    const snap = makeSnap({ valence: -0.5, tension: 0.8 })
    const r1 = runDebate(snap, { seed: 1, T: 10, dt: 1 })
    const r2 = runDebate(snap, { seed: 999, T: 10, dt: 1 })
    // Probabilidades deben diferir (no todos iguales)
    const probs1 = r1.scenarios.map(s => s.probability)
    const probs2 = r2.scenarios.map(s => s.probability)
    expect(probs1).not.toEqual(probs2)
  })
})

describe('runDebate — formato de salida', () => {
  it('top3 tiene los 3 campos requeridos', () => {
    const snap = makeSnap()
    const { top3 } = runDebate(snap, { seed: 7, T: 5, dt: 1 })
    expect(top3).toHaveProperty('consensus')
    expect(top3).toHaveProperty('efficiency')
    expect(top3).toHaveProperty('wildcard')
  })

  it('cada escenario tiene trace con inputsHash', () => {
    const snap = makeSnap()
    const { scenarios } = runDebate(snap, { seed: 3, T: 5, dt: 1 })
    for (const s of scenarios) {
      expect(s.trace).toBeDefined()
      expect(s.trace.inputsHash).toBeTruthy()
      expect(s.trace.seed).toBeTruthy()
    }
  })

  it('votos tienen los 4 agentes APTYMOK', () => {
    const snap = makeSnap()
    const { votes } = runDebate(snap, { seed: 5, T: 5, dt: 1 })
    const agentIds = [...new Set(votes.map(v => v.agentId))]
    expect(agentIds).toContain('SHINJI')
    expect(agentIds).toContain('REI')
    expect(agentIds).toContain('SHADOW')
    expect(agentIds).toContain('KAWORU')
  })

  it('scores de votos en [0,1]', () => {
    const snap = makeSnap()
    const { votes } = runDebate(snap, { seed: 11, T: 5, dt: 1 })
    for (const v of votes) {
      expect(v.score).toBeGreaterThanOrEqual(0)
      expect(v.score).toBeLessThanOrEqual(1)
    }
  })

  it('probabilidades de escenarios en [0,1]', () => {
    const snap = makeSnap()
    const { scenarios } = runDebate(snap, { seed: 13, T: 5, dt: 1 })
    for (const s of scenarios) {
      expect(s.probability).toBeGreaterThanOrEqual(0)
      expect(s.probability).toBeLessThanOrEqual(1)
    }
  })
})

describe('runDebate — diversidad del wildcard', () => {
  it('wildcard es diferente al consenso', () => {
    const snap = makeSnap()
    const { top3 } = runDebate(snap, { seed: 42, T: 10, dt: 1 })
    expect(top3.wildcard.id).not.toBe(top3.consensus.id)
  })

  it('wildcard es diferente a efficiency', () => {
    const snap = makeSnap()
    const { top3 } = runDebate(snap, { seed: 42, T: 10, dt: 1 })
    expect(top3.wildcard.id).not.toBe(top3.efficiency.id)
  })

  it('los 3 escenarios seleccionados tienen labels distintos', () => {
    const snap = makeSnap()
    const { top3 } = runDebate(snap, { seed: 42, T: 10, dt: 1 })
    const labels = [top3.consensus.label, top3.efficiency.label, top3.wildcard.label]
    const unique = new Set(labels)
    expect(unique.size).toBe(3)
  })
})

describe('runDebate — argumentos', () => {
  it('cada voto tiene argument no vacío', () => {
    const snap = makeSnap()
    const { votes } = runDebate(snap, { seed: 17, T: 5, dt: 1 })
    for (const v of votes) {
      expect(v.argument).toBeTruthy()
      expect(v.argument.length).toBeGreaterThan(5)
    }
  })
})
