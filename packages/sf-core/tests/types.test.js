import { describe, it, expect } from 'vitest'
import {
  makeCognitiveSnapshot,
  makeScenario,
  makeTickGoal,
  makeAgentVote,
  makeTraceInfo,
} from '../src/types.js'

describe('makeCognitiveSnapshot', () => {
  it('crea snapshot con valores por defecto válidos', () => {
    const s = makeCognitiveSnapshot()
    expect(s.id).toBeTruthy()
    expect(s.timestamp).toBeGreaterThan(0)
    expect(s.valence).toBe(0)
    expect(s.arousal).toBe(0.5)
    expect(s.tension).toBe(0.5)
    expect(s.focus).toBe(0.5)
    expect(s.source).toBe('manual')
  })

  it('clamp: valence fuera de rango [-1,1] se ajusta', () => {
    const s = makeCognitiveSnapshot({ valence: 5, arousal: -2, tension: 99 })
    expect(s.valence).toBe(1)
    expect(s.arousal).toBe(0)
    expect(s.tension).toBe(1)
  })

  it('clamp: NaN se convierte al mínimo del rango', () => {
    const s = makeCognitiveSnapshot({ valence: NaN, focus: NaN })
    expect(s.valence).toBe(-1)
    expect(s.focus).toBe(0)
  })

  it('serialización estable: mismo JSON para mismos campos', () => {
    const s1 = makeCognitiveSnapshot({ id: 'x', timestamp: 100, text: 'hola', valence: 0.5, arousal: 0.3, tension: 0.2, focus: 0.8 })
    const s2 = makeCognitiveSnapshot({ id: 'x', timestamp: 100, text: 'hola', valence: 0.5, arousal: 0.3, tension: 0.2, focus: 0.8 })
    expect(JSON.stringify(s1)).toBe(JSON.stringify(s2))
  })
})

describe('makeScenario', () => {
  it('probability clamped a [0,1]', () => {
    const s = makeScenario({ probability: 1.5 })
    expect(s.probability).toBe(1)
  })

  it('tiene trace por defecto', () => {
    const s = makeScenario()
    expect(s.trace).toBeDefined()
    expect(s.trace.engineVersion).toBe('2.0.0')
  })
})

describe('makeTickGoal', () => {
  it('covered es false por defecto', () => {
    const t = makeTickGoal({ objective: 'Reducir tensión', microGoals: ['respirar', 'descansar'] })
    expect(t.covered).toBe(false)
    expect(t.microGoals).toHaveLength(2)
  })
})

describe('makeAgentVote', () => {
  it('score clamped a [0,1]', () => {
    const v = makeAgentVote({ agentId: 'SHADOW', score: -0.5 })
    expect(v.score).toBe(0)
    expect(v.agentId).toBe('SHADOW')
  })
})

describe('makeTraceInfo', () => {
  it('engineVersion default 2.0.0', () => {
    const t = makeTraceInfo()
    expect(t.engineVersion).toBe('2.0.0')
    expect(t.method).toBe('unknown')
  })
})
