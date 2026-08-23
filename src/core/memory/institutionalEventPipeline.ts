// src/core/memory/institutionalEventPipeline.ts
//
// Canonical flow:
// epistemic_event → memory policy → compact institutional memory reference.
//
// The epistemic ledger is the canonical carrier of the original event payload.
// AMV stores only the reference and policy-relevant memory metadata so the same
// payload is not duplicated thousands of times across persistence layers.

import type { EpistemicEventRow } from './epistemicEventWriter';
import type { MemoryPolicySource } from './policy/contract';
import { evaluateMemoryPolicy } from './memoryPolicyValidator';
import { writeInstitutionalMemory } from '@/core/memory/InstitutionalMemoryWriter';

export async function processEpistemicEvent(
  event: EpistemicEventRow,
  policySource?: MemoryPolicySource
) {
  const decision = await evaluateMemoryPolicy(event, policySource);

  if (!decision.shouldWrite) {
    return { promoted: false, reason: decision.reason, policySourceId: decision.policySourceId };
  }

  const result = await writeInstitutionalMemory({
    source: { component: 'institutionalEventPipeline', agentId: event.event_name },
    entityType: decision.entityType,
    entityId: event.id,
    eventType: decision.memoryType,
    confidence: decision.confidence ?? event.confidence,
    payload: {
      epistemicEventId: event.id,
      epistemicEventName: event.event_name,
      logbookId: event.logbook_id,
      hashSelf: event.hash_self,
      derivedFrom: 'epistemic_events',
      policySourceId: decision.policySourceId,
      storagePolicy: 'REFERENCE_ONLY',
    },
  }).catch((err) => ({ ok: false, success: false, error: String(err) }));

  return {
    promoted: Boolean((result as any).ok),
    reason: decision.reason,
    policySourceId: decision.policySourceId,
    memoryResult: result,
  };
}
