import type { Audit, Metrics, MemoryFact, OperationalAction } from '@/lib/types'

export type LongitudinalAction = OperationalAction
export type LongitudinalMemoryFact = MemoryFact

export interface LongitudinalEngineInput {
  currentNarrative: string
  currentMetrics: Metrics
  audits: Audit[]
  actions: LongitudinalAction[]
  memoryFacts: MemoryFact[]
}

export interface LongitudinalEngineResult {
  nextQuestion: string
  pattern: string
  severity: number
  risk: 'low' | 'medium' | 'high' | 'hard_stop'
  minimumAction: string
  verificationCriterion: string
}

export const LongitudinalEngine = {
  evaluate({ currentNarrative, currentMetrics, audits, actions, memoryFacts }: LongitudinalEngineInput): LongitudinalEngineResult {
    const lastPattern = audits?.[0]?.pattern || memoryFacts?.[0]?.fact_type || 'estado neutro'
    const severity = Math.min(1, Math.max(0, currentMetrics.divergence + (audits?.[0]?.loop_score ?? 0) * 0.15))
    const risk = severity >= 0.8 ? 'hard_stop' : severity >= 0.55 ? 'high' : severity >= 0.3 ? 'medium' : 'low'
    let nextQuestion = '¿Qué acción mínima concreta puedes ejecutar en los próximos 30 minutos?'
    if (currentNarrative.includes('no puedo') || String(lastPattern).includes('contradiccion')) {
      nextQuestion = '¿Qué evidencia externa valida la decisión más importante de este ciclo?'
    }
    return {
      nextQuestion,
      pattern: String(lastPattern),
      severity,
      risk,
      minimumAction: actions?.[0]?.description || 'Definir un criterio observable para el siguiente ciclo.',
      verificationCriterion: actions?.[0]?.verification_criterion || 'Debe existir un resultado observable antes de la próxima iteración.',
    }
  },
}
