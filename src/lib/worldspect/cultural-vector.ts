import type { SourceObservation } from './source-adapter-contract'
import { clamp01 } from './vector-aggregator'

export type CulturalVectorInput = {
  sourceId: string
  observedAt?: string
  evidenceCount: number
  trust: number
  semanticDensity: number
  affect: number
  recurrence: number
  novelty: number
}

export function buildCulturalSourceObservation(input: CulturalVectorInput): SourceObservation {
  const value = clamp01(input.semanticDensity * 0.32 + input.affect * 0.22 + input.recurrence * 0.26 + input.novelty * 0.20)
  const trust = clamp01(input.trust)
  return {
    sourceId: input.sourceId,
    domain: 'CULTURAL',
    observedAt: input.observedAt ?? new Date().toISOString(),
    accessKind: 'internal-evidence',
    status: input.evidenceCount > 0 ? 'ACTIVE' : 'BOOTSTRAPPED',
    value,
    velocity: clamp01(input.novelty),
    volatility: clamp01(Math.abs(input.affect - input.recurrence)),
    persistence: clamp01(input.recurrence),
    rawCount: Math.max(0, input.evidenceCount),
    sourceCount: input.evidenceCount > 0 ? 1 : 0,
    trust,
    degradation: clamp01(1 - trust),
    signal: {
      affect: clamp01(input.affect),
      recurrence: clamp01(input.recurrence),
      novelty: clamp01(input.novelty),
      attention: value,
    },
  }
}
