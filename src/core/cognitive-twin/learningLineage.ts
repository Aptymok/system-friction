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

type LearningEventRow = {
  id: string;
  event_name: string;
  payload: Record<string, unknown> | null;
};

function learningLogbookId(learningId: string) {
  return `cognitive-twin:learning:${learningId}`;
}

async function readLearningHistory(learningId: string) {
  const db = createServiceSupabaseClient();
  const result = await db
    .from('epistemic_events')
    .select('id,event_name,payload')
    .eq('logbook_id', learningLogbookId(learningId))
    .in('event_name', [...COGNITIVE_TWIN_LEARNING_EVENT_NAMES])
    .order('sequence', { ascending: true })
    .limit(100);
  if (result.error) throw new Error(`COGNITIVE_TWIN_LEARNING_HISTORY_READ_FAILED:${result.error.message}`);
  return (result.data ?? []) as LearningEventRow[];
}

function acceptedDecision(history: LearningEventRow[]) {
  return history.some((event) => event.event_name === 'cognitive_twin.learning.decision_recorded' && event.payload?.decision === 'ACCEPTED');
}

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
    logbookId: learningLogbookId(input.learningId),
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
  const history = await readLearningHistory(candidate.learningId);
  if (history.length > 0) throw new Error('COGNITIVE_TWIN_LEARNING_ID_ALREADY_EXISTS');
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
  const history = await readLearningHistory(decision.learningId);
  if (!history.some((event) => event.event_name === 'cognitive_twin.learning.candidate_recorded')) {
    throw new Error('COGNITIVE_TWIN_LEARNING_CANDIDATE_REQUIRED');
  }
  if (history.some((event) => event.event_name === 'cognitive_twin.learning.decision_recorded')) {
    throw new Error('COGNITIVE_TWIN_LEARNING_DECISION_ALREADY_RECORDED');
  }
  if (history.some((event) => event.event_name === 'cognitive_twin.learning.supersession_recorded')) {
    throw new Error('COGNITIVE_TWIN_LEARNING_ALREADY_SUPERSEDED');
  }
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
  const [supersededHistory, supersedingHistory] = await Promise.all([
    readLearningHistory(relation.supersededLearningId),
    readLearningHistory(relation.supersedingLearningId),
  ]);
  if (!acceptedDecision(supersededHistory)) throw new Error('COGNITIVE_TWIN_LEARNING_SUPERSEDED_MUST_BE_ACCEPTED');
  if (!acceptedDecision(supersedingHistory)) throw new Error('COGNITIVE_TWIN_LEARNING_SUPERSEDING_MUST_BE_ACCEPTED');
  if (supersededHistory.some((event) => event.event_name === 'cognitive_twin.learning.supersession_recorded')) {
    throw new Error('COGNITIVE_TWIN_LEARNING_ALREADY_SUPERSEDED');
  }
  return appendLearningEvent({
    eventName: 'cognitive_twin.learning.supersession_recorded',
    learningId: relation.supersededLearningId,
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
