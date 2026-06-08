import { appendEpistemicEvent } from '@/lib/events/eventStore'
import { routeAmvReadingToLogbook } from './logbookRoutingPolicy'
import type { AmvEvidenceTrust } from './evidenceTypes'

export async function saveAmvReadingToLogbook(input: {
  scope: string
  trust: AmvEvidenceTrust
  summary: string
  operator?: string
  observedAt?: string
  payload?: unknown
  closesLoop?: boolean
  changesRoute?: boolean
}) {
  const route = routeAmvReadingToLogbook({
    trust: input.trust,
    hasOperator: Boolean(input.operator),
    hasTimestamp: Boolean(input.observedAt),
    closesLoop: input.closesLoop,
    changesRoute: input.changesRoute,
  })

  if (route.layer === 'not_promoted') {
    return { ok: false as const, error: 'amv_reading_not_promoted', route }
  }

  const event = await appendEpistemicEvent({
    eventName: `amv.${input.scope}.reading.saved`,
    epistemicClass: input.trust === 'verified' ? 'observed' : input.trust === 'declared' ? 'declared' : 'derived',
    confidence: input.trust === 'verified' ? 0.8 : input.trust === 'declared' ? 0.58 : 0.42,
    payload: {
      scope: input.scope,
      summary: input.summary,
      route,
      operator: input.operator ?? null,
      observedAt: input.observedAt ?? null,
      payload: input.payload ?? null,
    },
    source: { sourceId: 'AMV', sourceType: 'scope_reading' },
    logbookId: `AMV:${input.scope.toUpperCase()}`,
    lineage: [input.scope],
  })

  return { ...event, route }
}
