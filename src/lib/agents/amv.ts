import { LongitudinalEngine, type LongitudinalAction, type MemoryFact } from './longitudinal'
import type { Audit, Metrics } from '@/lib/types'

export interface AMVContext {
  nodeId: string
  objective?: string | null
  audits: Audit[]
  actions: LongitudinalAction[]
  memoryFacts: MemoryFact[]
  metrics: Metrics
}

export function buildAMVQuestion(context: AMVContext, questionIndex: number, latestAnswer = '') {
  if (questionIndex >= 2) {
    return 'Cierra el ciclo: que accion minima puedes ejecutar y comprobar antes del siguiente umbral?'
  }

  const evaluation = LongitudinalEngine.evaluate({
    currentNarrative: latestAnswer || context.objective || context.audits[0]?.narrative || '',
    currentMetrics: context.metrics,
    audits: context.audits,
    actions: context.actions,
    memoryFacts: context.memoryFacts
  })

  if (questionIndex === 0) return evaluation.nextQuestion
  if (evaluation.pattern.includes('contradiccion')) return 'Que parte de esa contradiccion tiene evidencia externa y cual parte solo se esta sosteniendo por inercia?'
  if (evaluation.pattern.includes('accion minima')) return 'Que hizo que la accion anterior no cerrara: tamano, miedo, dependencia externa o falta de criterio?'
  return 'Que variable concreta cambio desde la ultima vez que este patron aparecio?'
}

export function finalizeAMV(context: AMVContext, finalAnswer: string) {
  const evaluation = LongitudinalEngine.evaluate({
    currentNarrative: finalAnswer,
    currentMetrics: context.metrics,
    audits: context.audits,
    actions: context.actions,
    memoryFacts: context.memoryFacts
  })

  return {
    reading: `Lectura operacional: ${evaluation.pattern}. Severidad ${evaluation.severity.toFixed(3)}.`,
    pattern: evaluation.pattern,
    risk: evaluation.risk,
    minimum_action: evaluation.minimumAction,
    verification_criterion: evaluation.verificationCriterion,
    deadline: new Date(Date.now() + (evaluation.risk === 'hard_stop' ? 2 : 24) * 60 * 60 * 1000).toISOString()
  }
}
