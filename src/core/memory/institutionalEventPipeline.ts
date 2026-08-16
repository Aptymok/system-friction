// src/core/memory/institutionalEventPipeline.ts
//
// Cumple ADR-018 completo:
//   epistemic_event → MemoryPolicySource (vía MemoryPolicyValidator) → InstitutionalMemoryWriter
//
// Este es el único punto que debe llamarse después de emitEpistemicEvent().
// Ningún componente debe llamar a writeInstitutionalMemory() directamente.
//
// La fuente de política es inyectable (segundo argumento, opcional). Los
// call sites actuales (governanceRuntime, thoughtInhibition, adapters de
// systemTick/IntentLayer/Observer) NO especifican fuente — usan el default
// (staticCodePolicySource) sin saberlo. El día que exista una fuente de
// gobernanza versionada, se cambia el default en memoryPolicyValidator.ts
// o se pasa aquí explícitamente — ningún otro archivo del repo se toca.

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
    // Denegado por política. El evento ya quedó en el ledger
    // (epistemic_events); simplemente no se promueve a memoria institucional.
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
      raw: event.payload,
    },
  }).catch((err) => ({ ok: false, success: false, error: String(err) }));

  return {
    promoted: Boolean((result as any).ok),
    reason: decision.reason,
    policySourceId: decision.policySourceId,
    memoryResult: result,
  };
}