import type { SfiMetrics } from '@/lib/sfi/math'
import type { EvidenceEnvelope } from '@/lib/sfi/evidence'
import type { WorldSpectVectorSnapshot } from '@/lib/worldspect/vector-contract'

export type Row = Record<string, unknown>

export type ScoreFrictionPipeline = {
  status: 'idle' | 'running' | 'complete' | 'error'
  message: string
  evidence: (EvidenceEnvelope & { id: string; module: string; caseId: string }) | null
  stored: boolean
  world: { ok?: boolean; error?: string; snapshot?: WorldSpectVectorSnapshot | null } | null
  engine: Row | null
  montecarlo: Row | null
  attractors: Row | null
  amv: Row | null
  warnings: string[]
}

export type ScoreFrictionPanelContext = {
  caseId: string
  metrics: SfiMetrics
  world: WorldSpectVectorSnapshot | null
  pipeline: ScoreFrictionPipeline
  runtime: {
    chronology: Row[]
    proto: Row[]
    hypotheses: Row[]
    proposals: Row[]
    verifications: Row[]
    messages: Record<string, string>
  }
}

export function n(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function s(value: unknown, fallback = 'sin datos') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}
