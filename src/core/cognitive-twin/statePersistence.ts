import 'server-only';

import { emitEpistemicEvent } from '@/core/memory/epistemicEventWriter';
import {
  COGNITIVE_TWIN_STATE_CONTRACT_VERSION,
  assertCognitiveTwinStateTransition,
  type CognitiveTwinStateTransition,
} from './stateContract';

export async function persistCognitiveTwinStateTransition(input: CognitiveTwinStateTransition) {
  const transition = assertCognitiveTwinStateTransition(input);
  const t0EvidenceRefs = transition.t0.availableEvidence.map((item) => item.ref);
  const t1EvidenceRefs = transition.t1?.outcomeEvidenceRefs ?? [];
  const lineage = [...new Set([...transition.lineageRefs, ...t0EvidenceRefs, ...t1EvidenceRefs])];

  const emitted = await emitEpistemicEvent({
    eventName: 'cognitive_twin.state.transition_recorded',
    logbookId: `cognitive-twin:state:${transition.subjectRef}`,
    epistemicClass: transition.t1?.outcome ? 'derived' : 'declared',
    schemaVersion: COGNITIVE_TWIN_STATE_CONTRACT_VERSION,
    sourceId: transition.transitionId,
    sourceType: 'cognitive_twin_state_transition',
    actorId: null,
    confidence: 0,
    payload: {
      contractVersion: transition.contractVersion,
      transitionId: transition.transitionId,
      subjectRef: transition.subjectRef,
      t0: transition.t0,
      t1: transition.t1,
      createdAt: transition.createdAt,
      boundary: transition.boundary,
      confidenceState: 'UNASSESSED',
      canonicalMutation: false,
      rule: 'The persisted transition is external Twin state lineage. Model context may consume it but does not own or silently rewrite it.',
    },
    lineage,
    uncertainty: 'State transition persistence records lineage and structured state. It does not promote derived, predicted or simulated content into observation or canon.',
  });

  if (!emitted.ok) throw new Error(`COGNITIVE_TWIN_STATE_PERSIST_FAILED:${emitted.error}`);
  return {
    ok: true as const,
    eventId: emitted.event.id,
    eventHash: emitted.event.hash_self,
    transitionId: transition.transitionId,
    lineage,
  };
}
