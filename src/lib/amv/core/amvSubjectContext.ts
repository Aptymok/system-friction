export type AmvSubjectContext = {
  subject: string
  accountId?: string
  scope: string
  authorizedScopes: string[]
  isRootContext: boolean
  exposesMopH: false
}

export function buildAmvSubjectContext(input: Partial<AmvSubjectContext> & { scope: string }): AmvSubjectContext {
  return {
    subject: input.subject ?? input.scope,
    accountId: input.accountId,
    scope: input.scope,
    authorizedScopes: input.authorizedScopes ?? [input.scope],
    isRootContext: Boolean(input.isRootContext),
    exposesMopH: false,
  }
}
