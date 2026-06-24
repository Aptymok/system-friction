import { executeAudit } from './auditor'
import { CognitiveTwin } from './cognitive-twin'
import { useNodeStore } from '@/observatory/store/nodeStore'
import { createServerSupabaseClient } from '@/runtime/supabase/server'
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

    const minimumAction = actions?.[0]?.description || 'Definir un criterio observable para el siguiente ciclo.'
    const verificationCriterion = actions?.[0]?.verification_criterion || 'Debe existir un resultado observable antes de la próxima iteración.'

    return {
      nextQuestion,
      pattern: String(lastPattern),
      severity,
      risk,
      minimumAction,
      verificationCriterion,
    }
  },
}

export interface LongitudinalOutput {
  status: 'active' | 'completed' | 'failed'
  metrics: Record<string, unknown>
  recommendations: string[]
  entropyScore: number
}

export class LongitudinalAgent {
  static async process(userId: string, input: string): Promise<LongitudinalOutput> {
    const supabase = await createServerSupabaseClient()
    const addLog = useNodeStore.getState().addLog

    try {
      addLog(`Iniciando auditoría longitudinal para nodo: ${userId}`, 'info')
      const cognitiveSeed = await CognitiveTwin.extractSeed(input)
      const auditResult = await executeAudit({ source: 'web', narrative: input })

      const { data: node, error: nodeError } = await supabase
        .from('nodes')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (nodeError || !node) {
        throw new Error(`Nodo no encontrado para usuario ${userId}`)
      }

      const { error: insertError } = await supabase.from('audits').insert({
        node_id: node.id,
        source: 'web',
        narrative: input,
        ihg: auditResult.ihg,
        nti: auditResult.nti,
        ldi: auditResult.ldi,
        verdict: auditResult.verdict,
        diagnosis: auditResult.diagnosis,
        loop_score: auditResult.loop_score,
        divergence: auditResult.divergence,
        pattern: auditResult.pattern,
        hard_stop: auditResult.hard_stop,
        proposed_action: auditResult.proposed_action,
      })

      if (insertError) throw insertError

      addLog(`Auditoría completada. IHG: ${auditResult.ihg.toFixed(3)}`, 'success')

      return {
        status: 'completed',
        metrics: {
          ihg: auditResult.ihg,
          nti: auditResult.nti,
          ldi: auditResult.ldi,
          loop_score: auditResult.loop_score,
          divergence: auditResult.divergence,
          pattern: auditResult.pattern,
          hard_stop: auditResult.hard_stop,
        },
        recommendations: [auditResult.proposed_action],
        entropyScore: auditResult.ihg < 0 ? Math.abs(auditResult.ihg) : 0,
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido en auditoría'
      addLog(`Fallo en proceso longitudinal: ${message}`, 'error')
      return {
        status: 'failed',
        metrics: {},
        recommendations: ['Reintentar sincronización de nodo'],
        entropyScore: 1.0,
      }
    }
  }

  static async analyze(data: unknown) {
    const size = Array.isArray(data) ? data.length : 0
    const friction = size * 0.15
    return {
      complexity: friction > 0.8 ? 'high' : 'stable',
      timestamp: new Date().toISOString(),
    }
  }
}
