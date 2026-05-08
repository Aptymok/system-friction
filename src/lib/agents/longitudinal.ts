import type { Audit, Metrics } from '@/lib/types'

export interface LongitudinalAction {
  id: string
  description: string
  verification_criterion: string
  status: 'pending' | 'completed' | 'missed' | 'invalidated'
  due_at?: string | null
  completed_at?: string | null
}

export interface MemoryFact {
  fact_type: 'objective' | 'loop' | 'constraint' | 'emotion_pattern' | 'missed_action' | 'direction_change' | 'external_signal'
  label: string
  value: string
  confidence: number
  recurrence_count: number
}

export interface LongitudinalInput {
  currentNarrative: string
  currentMetrics: Metrics
  audits: Audit[]
  actions: LongitudinalAction[]
  memoryFacts: MemoryFact[]
}

export interface LongitudinalOutput {
  adjustedMetrics: Metrics
  pattern: string
  severity: number
  risk: 'low' | 'medium' | 'high' | 'hard_stop'
  nextQuestion: string
  minimumAction: string
  verificationCriterion: string
}

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
}

export class LongitudinalEngine {
  static evaluate(input: LongitudinalInput): LongitudinalOutput {
    const text = normalize(input.currentNarrative)
    const pendingActions = input.actions.filter((action) => action.status === 'pending')
    const missedActions = input.actions.filter((action) => action.status === 'missed')
    const recurringFacts = input.memoryFacts.filter((fact) => fact.recurrence_count >= 2)
    const hasContradiction = /\b(quiero|necesito|debo)\b/.test(text) && /\bpero|aunque|sin embargo\b/.test(text)
    const avoidance = /\b(evito|pospongo|manana|luego|no puedo|me cuesta)\b/.test(text)
    const loopPenalty = clamp((recurringFacts.length + missedActions.length) / 6)
    const actionPenalty = clamp(pendingActions.length / 4)

    const adjustedMetrics: Metrics = {
      ihg: Math.max(-1, Math.min(1, input.currentMetrics.ihg - loopPenalty * 0.22 - actionPenalty * 0.18)),
      nti: clamp(input.currentMetrics.nti + (hasContradiction ? 0.18 : 0) + (avoidance ? 0.14 : 0)),
      ldi: input.currentMetrics.ldi + missedActions.length * 24 + recurringFacts.length * 12,
      loop_score: clamp(input.currentMetrics.loop_score + loopPenalty * 0.35),
      divergence: clamp(input.currentMetrics.divergence + (hasContradiction ? 0.15 : 0) + actionPenalty * 0.1)
    }

    const severity = clamp(
      Math.abs(Math.min(adjustedMetrics.ihg, 0)) * 0.35 +
        adjustedMetrics.nti * 0.3 +
        Math.min(adjustedMetrics.ldi / 168, 1) * 0.2 +
        adjustedMetrics.loop_score * 0.15
    )

    const risk = severity > 0.82 ? 'hard_stop' : severity > 0.62 ? 'high' : severity > 0.38 ? 'medium' : 'low'
    const pattern = hasContradiction
      ? 'contradiccion longitudinal'
      : missedActions.length > 0
        ? 'accion minima no ejecutada'
        : recurringFacts.length > 0
          ? 'loop recurrente'
          : avoidance
            ? 'evitacion operacional'
            : 'observacion base'

    return {
      adjustedMetrics,
      pattern,
      severity,
      risk,
      nextQuestion: this.nextQuestion({ pattern, pendingActions, recurringFacts }),
      minimumAction: this.minimumAction({ risk, pattern, pendingActions }),
      verificationCriterion: this.verificationCriterion({ pattern, pendingActions })
    }
  }

  private static nextQuestion(input: {
    pattern: string
    pendingActions: LongitudinalAction[]
    recurringFacts: MemoryFact[]
  }) {
    if (input.pendingActions.length > 0) {
      return `La accion pendiente sigue abierta: "${input.pendingActions[0].description}". Que evidencia concreta existe hoy de avance o bloqueo?`
    }
    if (input.pattern.includes('contradiccion')) {
      return 'Que costo operacional estas pagando por sostener ambas posiciones al mismo tiempo?'
    }
    if (input.recurringFacts.length > 0) {
      return `Este patron ya aparecio antes: "${input.recurringFacts[0].label}". Que dato nuevo existe hoy?`
    }
    return 'Cual es el punto minimo donde la intencion deja de convertirse en ejecucion?'
  }

  private static minimumAction(input: {
    risk: LongitudinalOutput['risk']
    pattern: string
    pendingActions: LongitudinalAction[]
  }) {
    if (input.risk === 'hard_stop') {
      return 'Pausar toda accion expansiva durante 2 horas y aislar el nodo critico en una sola frase verificable.'
    }
    if (input.pendingActions.length > 0) {
      return `Cerrar o invalidar la accion pendiente: "${input.pendingActions[0].description}".`
    }
    if (input.pattern.includes('contradiccion')) {
      return 'Elegir una de las dos posiciones en conflicto y escribir que decision queda suspendida por 24 horas.'
    }
    return 'Registrar una accion de menos de 15 minutos con responsable, hora y criterio de cierre.'
  }

  private static verificationCriterion(input: {
    pattern: string
    pendingActions: LongitudinalAction[]
  }) {
    if (input.pendingActions.length > 0) return 'Existe evidencia fechada de cierre, avance o invalidacion consciente.'
    if (input.pattern.includes('contradiccion')) return 'La decision suspendida queda nombrada por escrito y no se ejecuta durante 24 horas.'
    return 'La accion queda completada o rechazada antes del siguiente ciclo de auditoria.'
  }
}

