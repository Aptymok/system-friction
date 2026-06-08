import type { AmvDecision, AmvScopeContext } from './amvTypes'

export function buildAmvDailyBriefing(scopeContext: AmvScopeContext, decision: AmvDecision) {
  return {
    subject: scopeContext.subject,
    scope: scopeContext.scope,
    event: decision.event,
    risk: decision.risk,
    route: decision.route,
    generatedAt: new Date().toISOString(),
  }
}
