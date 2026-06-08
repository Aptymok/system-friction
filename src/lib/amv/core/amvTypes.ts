export type AmvRiskLevel = 'low' | 'medium' | 'high' | 'hard_stop'

export type AmvTrustLevel = 'observed' | 'derived' | 'degraded' | 'untrusted'

export type AmvVisibleResponse = {
  evento: string
  resultado: string
  efecto: string
  ventana: string
  ruta_unica: string
}

export type AmvRuntimeRequest = {
  scope: string
  message: string
  selectedContext?: unknown
}

export type AmvAgentDescriptor = {
  id: string
  label: string
  source: string
  status: 'available' | 'adapter' | 'deferred'
  trust: AmvTrustLevel
}

export type AmvPolicy = {
  maxVisibleRoutes: 1
  hideNonRouteChangingInference: boolean
  requireZeroTrust: boolean
  riskManagement: boolean
  allowLogbookSelectionDemand: false
}

export type AmvSourceSignal = {
  id: string
  label: string
  trust: AmvTrustLevel
  reason: string
}

export type AmvDecision = {
  event: string
  result: string
  effect: string
  window: string
  route: string
  risk: AmvRiskLevel
  confidence: number
  sourceTrust: AmvTrustLevel
  changedDecision: boolean
  warnings: string[]
}

export type AmvScopeContext = {
  subject: string
  scope: string
  context: Record<string, unknown>
  agents: AmvAgentDescriptor[]
  policy: AmvPolicy
  sources: AmvSourceSignal[]
}

export type AmvScopeDefinition = {
  id: string
  subject: string
  buildContext: (request: AmvRuntimeRequest) => Promise<AmvScopeContext> | AmvScopeContext
  decide: (input: {
    request: AmvRuntimeRequest
    scopeContext: AmvScopeContext
  }) => Promise<AmvDecision> | AmvDecision
}

export type AmvRuntimeResponse = {
  ok: true
  scope: string
  subject: string
  response: AmvVisibleResponse
  decision: AmvDecision
  agents: AmvAgentDescriptor[]
  policy: AmvPolicy
  sourceTrust: AmvTrustLevel
  warnings: string[]
}

export type AmvRuntimeError = {
  ok: false
  error: string
  availableScopes?: string[]
}
