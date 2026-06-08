import type { AmvSubjectContext } from './amvSubjectContext'

export type AmvAccessDecision = {
  allowed: boolean
  status: 'allowed' | 'degraded' | 'blocked'
  reason: string
}

export function decideAmvAccess(context: AmvSubjectContext): AmvAccessDecision {
  if (context.isRootContext) return { allowed: true, status: 'allowed', reason: 'ROOT puede montar contexto global.' }
  if (context.authorizedScopes.includes(context.scope)) return { allowed: true, status: 'allowed', reason: 'Scope autorizado para este sujeto.' }
  return { allowed: false, status: 'blocked', reason: 'Scope no autorizado para este sujeto.' }
}
