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
      // The Cognitive Twin reader needs a compact, typed index. Keep the
      // original claims in epistemic_events and do not auto-certify them.
      ...(event.event_name === 'cognitive_twin.experience.recorded'
        ? {
            raw: {
              memoryKey: typeof (event.payload as any)?.memoryKey === 'string'
                ? (event.payload as any).memoryKey : null,
              memoryType: typeof (event.payload as any)?.memoryType === 'string'
                ? (event.payload as any).memoryType : null,
              sourceKind: typeof (event.payload as any)?.sourceKind === 'string'
                ? (event.payload as any).sourceKind : null,
              sourceRef: typeof (event.payload as any)?.sourceRef === 'string'
                ? (event.payload as any).sourceRef : null,
              evidenceRefs: Array.isArray((event.payload as any)?.evidenceRefs)
                ? (event.payload as any).evidenceRefs.filter((ref: unknown) => typeof ref === 'string') : [],
              content: {
                memoryStatus: 'CANDIDATE',
                epistemicClass: event.epistemic_class,
                epistemicEventId: event.id,
                claimBoundary: 'Index only; source claims remain in the epistemic ledger. No validation or automatic canon promotion.',
              },
            },
          }
        : {}),
    },
  }).catch((err) => ({ ok: false, success: false, error: String(err) }));

  return {
    promoted: Boolean((result as any).ok),
    reason: decision.reason,
    policySourceId: decision.policySourceId,
    memoryResult: result,
  };
}
