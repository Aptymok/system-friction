import { compressAmvResponse } from './amvResponseCompressor'
import { enforceDecisionPolicy } from './amvDecisionPolicy'
import { buildAmvDailyBriefing } from './amvDailyBriefing'
import { trustWarning, weakestTrust } from './amvSourceTrust'
import { getAmvScope, listAmvScopes } from '../registry/scopeRegistry'
import type { AmvRuntimeError, AmvRuntimeRequest, AmvRuntimeResponse } from './amvTypes'

export async function runAmvRuntime(request: AmvRuntimeRequest): Promise<AmvRuntimeResponse | AmvRuntimeError> {
  const scopeId = request.scope.trim().toLowerCase()
  const message = request.message.trim()

  if (!scopeId) return { ok: false, error: 'missing_scope', availableScopes: listAmvScopes() }
  if (!message) return { ok: false, error: 'missing_message', availableScopes: listAmvScopes() }

  const scope = getAmvScope(scopeId)
  if (!scope) return { ok: false, error: 'unknown_scope', availableScopes: listAmvScopes() }

  const scopeContext = await scope.buildContext({ ...request, scope: scopeId, message })
  const rawDecision = await scope.decide({ request: { ...request, scope: scopeId, message }, scopeContext })
  const decision = enforceDecisionPolicy(rawDecision, scopeContext.policy)
  const sourceTrust = weakestTrust(scopeContext.sources)
  const warning = trustWarning(sourceTrust)
  const warnings = [...new Set([...decision.warnings, ...(warning ? [warning] : [])])]

  return {
    ok: true,
    scope: scope.id,
    subject: scope.subject,
    response: compressAmvResponse(decision),
    decision: {
      ...decision,
      warnings,
    },
    agents: scopeContext.agents,
    policy: scopeContext.policy,
    sourceTrust,
    warnings,
  }
}

export function createAmvSession(scope = 'root') {
  return {
    ok: true,
    sessionId: `amv_${scope}_${Date.now().toString(36)}`,
    scope,
    runtime: 'amv_core_scoped',
    briefing: buildAmvDailyBriefing({
      subject: scope,
      scope,
      context: {},
      agents: [],
      policy: {
        maxVisibleRoutes: 1,
        hideNonRouteChangingInference: true,
        requireZeroTrust: true,
        riskManagement: true,
        allowLogbookSelectionDemand: false,
      },
      sources: [],
    }, {
      event: 'Sesion AMV iniciada.',
      result: 'Runtime scoped disponible.',
      effect: 'No se escribio en base de datos.',
      window: 'Uso inmediato.',
      route: 'Enviar mensaje a /api/amv con scope=root.',
      risk: 'low',
      confidence: 1,
      sourceTrust: 'derived',
      changedDecision: true,
      warnings: [],
    }),
  }
}
