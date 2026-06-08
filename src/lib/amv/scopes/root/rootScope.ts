import { riskFromScore } from '../../core/amvDecisionPolicy'
import type { AmvDecision, AmvScopeDefinition } from '../../core/amvTypes'
import { buildRootScopeContext } from './rootContextBuilder'
import { dominantRootAction } from './rootActions'

function numberFrom(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function record(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export const rootScope: AmvScopeDefinition = {
  id: 'root',
  subject: 'ROOT',
  buildContext: buildRootScopeContext,
  decide({ request, scopeContext }): AmvDecision {
    const context = scopeContext.context
    const field = record(context.rootFieldState)
    const ejector = record(context.rootEjectorDetector)
    const mihm = record(context.rootMihmTranslator)
    const governance = record(context.rootGovernanceTranslator)
    const agentOutputs = record(context.agentOutputs)
    const metrics = record(agentOutputs.metrics)
    const audit = record(agentOutputs.audit)
    const longitudinal = record(agentOutputs.longitudinal)
    const cognitiveSeed = record(agentOutputs.cognitiveSeed)

    const divergence = numberFrom(metrics.divergence, 0)
    const avoidance = numberFrom(cognitiveSeed.avoidanceScore, 0)
    const hardStop = Boolean(ejector.hardStop) || Boolean(audit.hard_stop)
    const governanceReview = Boolean(governance.needsHumanReview)
    const riskScore = hardStop ? 0.9 : Math.max(divergence, avoidance, governanceReview ? 0.68 : 0.2)
    const risk = riskFromScore(riskScore)
    const action = dominantRootAction(risk)
    const routeChanging = hardStop || governanceReview || Boolean(ejector.closure) || risk !== 'low'
    const sourceState = String(field.sourceState ?? 'degraded')
    const mihmLabel = `MIHM basal · ${String(mihm.object ?? 'Aptymok')} / ${String(mihm.node ?? 'n_0')}`

    return {
      event: `ROOT recibe senal: ${request.message}`,
      result: hardStop
        ? 'Riesgo dominante detectado; no conviene ejecutar sin revision.'
        : `Lectura ROOT en ${mihmLabel}. ${String(audit.verdict ?? 'ciclo viable')}.`,
      effect: governanceReview
        ? 'Zero Trust y Risk Management retienen accion hasta evidencia humana.'
        : `El campo queda en estado ${sourceState}; AMV no abre rutas paralelas.`,
      window: risk === 'hard_stop' ? 'Ahora; bloquear antes de cualquier ejecucion.' : String(longitudinal.verificationCriterion ?? 'Siguiente ciclo operativo.'),
      route: action.route,
      risk,
      confidence: Math.max(0.35, Math.min(0.92, 1 - riskScore / 2)),
      sourceTrust: sourceState === 'observed' ? 'observed' : 'degraded',
      changedDecision: routeChanging,
      warnings: sourceState === 'observed' ? [] : ['root_context_degraded'],
    }
  },
}
