import 'server-only';

import { emitEpistemicEvent } from '@/core/memory/epistemicEventWriter';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  COGNITIVE_TWIN_LEARNING_LINEAGE_CONTRACT_VERSION,
  assertCognitiveTwinLearningCandidate,
  assertCognitiveTwinLearningDecision,
  assertCognitiveTwinLearningSupersession,
  type CognitiveTwinLearningCandidate,
  type CognitiveTwinLearningDecision,
  type CognitiveTwinLearningSupersession,
} from './learningContract';

export const COGNITIVE_TWIN_LEARNING_EVENT_NAMES = [
  'cognitive_twin.learning.candidate_recorded',
  'cognitive_twin.learning.decision_recorded',
  'cognitive_twin.learning.supersession_recorded',
] as const;

async function appendLearningEvent(input: {
  eventName: (typeof COGNITIVE_TWIN_LEARNING_EVENT_NAMES)[number];
  learningId: string;
  actorId: string | null;
  payload: Record<string, unknown>;
  lineage: string[];
  epistemicClass: 'inferred' | 'declared';
}) {
  const emitted = await emitEpistemicEvent({
    eventName: input.eventName,
    logbookId: `cognitive-twin:learning:${input.learningId}`,
    epistemicClass: input.epistemicClass,
    schemaVersion: COGNITIVE_TWIN_LEARNING_LINEAGE_CONTRACT_VERSION,
    sourceId: input.learningId,
    sourceType: 'cognitive_twin_learning_lineage',
    actorId: input.actorId,
    confidence: 0,
    payload: {
      ...input.payload,
      contractVersion: COGNITIVE_TWIN_LEARNING_LINEAGE_CONTRACT_VERSION,
      learningIsCanon: false,
      canonicalMutation: false,
      rule: 'Learning lineage is append-only. ACCEPTED does not mean CANON and prior meaning is never silently rewritten.',
    },
    lineage: [...new Set(input.lineage)],
    uncertainty: 'Learning state is governance state, not an observation confidence score.',
  });
  if (!emitted.ok) throw new Error(`COGNITIVE_TWIN_LEARNING_APPEND_FAILED:${emitted.error}`);
  return { ok: true as const, eventId: emitted.event.id, eventHash: emitted.event.hash_self };
}

export async function recordCognitiveTwinLearningCandidate(input: CognitiveTwinLearningCandidate) {
  const candidate = assertCognitiveTwinLearningCandidate(input);
  return appendLearningEvent({
    eventName: 'cognitive_twin.learning.candidate_recorded',
    learningId: candidate.learningId,
    actorId: candidate.proposedBy,
    epistemicClass: 'inferred',
    lineage: [...candidate.evidenceRefs, ...candidate.sourceRefs],
    payload: candidate,
  });
}

export async function recordCognitiveTwinLearningDecision(input: CognitiveTwinLearningDecision) {
  const decision = assertCognitiveTwinLearningDecision(input);
  return appendLearningEvent({
    eventName: 'cognitive_twin.learning.decision_recorded',
    learningId: decision.learningId,
    actorId: decision.decidedBy,
    epistemicClass: 'declared',
    lineage: [decision.learningId, ...decision.evidenceRefs, decision.authorityRef],
    payload: decision,
  });
}

export async function recordCognitiveTwinLearningSupersession(input: CognitiveTwinLearningSupersession) {
  const relation = assertCognitiveTwinLearningSupersession(input);
  return appendLearningEvent({
    eventName: 'cognitive_twin.learning.supersession_recorded',
    learningId: relation.supersedingLearningId,
    actorId: relation.recordedBy,
    epistemicClass: 'declared',
    lineage: [
      relation.supersededLearningId,
      relation.supersedingLearningId,
      relation.authorityRef,
      ...relation.evidenceRefs,
    ],
    payload: relation,
  });
}

export async function readCognitiveTwinLearningLineage(limit = 200) {
  const db = createServiceSupabaseClient();
  const boundedLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  const result = await db
    .from('epistemic_events')
    .select('id,event_id,event_name,logbook_id,epistemic_class,schema_version,source,actor_id,payload,lineage,occurred_at,created_at,hash_prev,hash_self')
    .in('event_name', [...COGNITIVE_TWIN_LEARNING_EVENT_NAMES])
    .order('sequence', { ascending: false })
    .limit(boundedLimit);
  if (result.error) throw new Error(`COGNITIVE_TWIN_LEARNING_READ_FAILED:${result.error.message}`);
  return result.data ?? [];
}
