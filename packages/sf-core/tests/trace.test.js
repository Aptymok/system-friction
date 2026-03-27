import { describe, it, expect } from 'vitest'
import {
  hashInputsSync,
  stableStringify,
  snapshotToSeed,
  seededRandom,
} from '../src/trace.js'
import { makeCognitiveSnapshot } from '../src/types.js'

describe('stableStringify', () => {
  it('produce mismo resultado independientemente del orden de keys', () => {
    const a = { z: 1, a: 2, m: 3 }
    const b = { m: 3, z: 1, a: 2 }
    expect(stableStringify(a)).toBe(stableStringify(b))
  })

  it('arrays en mismo orden', () => {
    expect(stableStringify([1, 2, 3])).toBe('[1,2,3]')
    expect(stableStringify([3, 2, 1])).toBe('[3,2,1]')
  })

  it('null se serializa como null', () => {
    expect(stableStringify(null)).toBe('null')
  })
})

describe('hashInputsSync', () => {
  it('mismo input → mismo hash', () => {
    const data = { x: 1, y: 'hola', z: [1, 2, 3] }
    expect(hashInputsSync(data)).toBe(hashInputsSync(data))
  })

  it('distinto input → distinto hash (muy probable)', () => {
    expect(hashInputsSync({ x: 1 })).not.toBe(hashInputsSync({ x: 2 }))
  })

  it('retorna string hex', () => {
    const h = hashInputsSync({ test: true })
    expect(typeof h).toBe('string')
    expect(h).toMatch(/^[0-9a-f]+$/)
  })

  it('hash es estable entre llamadas', () => {
    const h1 = hashInputsSync({ valence: 0.5, tension: 0.3 })
    const h2 = hashInputsSync({ valence: 0.5, tension: 0.3 })
    expect(h1).toBe(h2)
  })
})

describe('snapshotToSeed', () => {
  it('mismo snapshot → mismo seed', () => {
    const snap = makeCognitiveSnapshot({ valence: 0.2, arousal: 0.6, tension: 0.4, focus: 0.7, text: 'test' })
    const s1 = snapshotToSeed(snap)
    const s2 = snapshotToSeed(snap)
    expect(s1).toBe(s2)
  })

  it('snapshot diferente → seed diferente', () => {
    const s1 = snapshotToSeed(makeCognitiveSnapshot({ valence: 0.1 }))
    const s2 = snapshotToSeed(makeCognitiveSnapshot({ valence: 0.9 }))
    expect(s1).not.toBe(s2)
  })
})

describe('seededRandom', () => {
  it('mismo seed → misma secuencia', () => {
    const rand1 = seededRandom(42)
    const rand2 = seededRandom(42)
    const seq1 = Array.from({ length: 10 }, () => rand1())
    const seq2 = Array.from({ length: 10 }, () => rand2())
    expect(seq1).toEqual(seq2)
  })

  it('distinto seed → distinta secuencia', () => {
    const rand1 = seededRandom(42)
    const rand2 = seededRandom(99)
    const seq1 = Array.from({ length: 5 }, () => rand1())
    const seq2 = Array.from({ length: 5 }, () => rand2())
    expect(seq1).not.toEqual(seq2)
  })

  it('valores en [0, 1)', () => {
    const rand = seededRandom('test-seed')
    for (let i = 0; i < 100; i++) {
      const v = rand()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('seed string produce secuencia reproducible', () => {
    const r1 = seededRandom('seed-abc')
    const r2 = seededRandom('seed-abc')
    expect(r1()).toBe(r2())
    expect(r1()).toBe(r2())
  })
})
