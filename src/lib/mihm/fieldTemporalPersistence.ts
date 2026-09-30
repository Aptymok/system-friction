import 'server-only';

import { createHash } from 'node:crypto';
import type { CanonicalGraphEdge, CanonicalGraphNode } from '../../../packages/graph/src';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { capacityObservation, emergenceReading, relationScientificReading, temporalCoordinates } from './fieldScientificReading';

export const SFI_FIELD_TEMPORAL_EPOCH_CONTRACT = 'SFI-FIELD-TEMPORAL-EPOCH-1.0' as const;

function sha256(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function deterministicUuid(value: unknown) {
  const hex = sha256(value).slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = 'a';
  const h = hex.join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export type FieldTemporalEpochSnapshot = {
  contract: typeof SFI_FIELD_TEMPORAL_EPOCH_CONTRACT;
  subjectRef: string;
  ontologyType: string;
  temporalCoordinates: ReturnType<typeof temporalCoordinates>;
  observedAt: string | null;
  state: string | null;
  previousState: string | null;
  relationTransitions: Array<{
    edgeId: string;
    source: string;
    target: string;
    relation: string;
    currentState: string | null;
    previousState: string | null;
    currentWeight: number;
    previousWeight: number | null;
    weightDelta: number | null;
    onset: string | null;
    offset: string | null;
    recurrence: number | string | null;
    evidenceRefs: string[];
  }>;
  emergence: ReturnType<typeof emergenceReading>;
  capacity: ReturnType<typeof capacityObservation>;
  censoring: 'OPEN' | 'CLOSED' | 'UNKNOWN';
  sourceObservationRefs: string[];
  evidenceRefs: string[];
  status: 'MEANINGFUL' | 'INSUFFICIENT';
  boundary: string;
};

export function deriveFieldTemporalEpochSnapshot(
  node: CanonicalGraphNode,
  edges: CanonicalGraphEdge[],
): FieldTemporalEpochSnapshot {
  const coordinates = temporalCoordinates(node);
  const relations = edges
    .filter((edge) => edge.sourceNodeId === node.nodeId || edge.targetNodeId === node.nodeId)
    .map(relationScientificReading)
    .filter((relation) =>
      relation.previousState !== null
      || relation.weightDelta !== null
      || relation.onset !== null
      || relation.offset !== null
      || relation.recurrence !== null,
    );
  const emergence = emergenceReading(node);
  const observedChronology = coordinates.find((item) => item.basis === 'CHRONOLOGY');
  const observedAt = typeof observedChronology?.value === 'number'
    ? new Date(observedChronology.value).toISOString()
    : emergence.observedAt;
  const state = text(node.attributes.state)
    ?? text(node.attributes.epistemicState)
    ?? text(node.attributes.epistemicClass);
  const previousState = text(node.attributes.previousState)
    ?? text(node.attributes.previous_state)
    ?? null;
  const validTo = text(node.attributes.validTo) ?? text(node.attributes.valid_to);
  const offset = relations.find((relation) => relation.offset)?.offset ?? null;
  const censoring = validTo || offset ? 'CLOSED' : observedAt ? 'OPEN' : 'UNKNOWN';
  const sourceObservationRefs = [...new Set([
    ...node.lineage,
    ...(Array.isArray(node.attributes.sourceObservationRefs) ? node.attributes.sourceObservationRefs.filter((item): item is string => typeof item === 'string') : []),
    ...(Array.isArray(node.attributes.source_observation_refs) ? node.attributes.source_observation_refs.filter((item): item is string => typeof item === 'string') : []),
  ])];
  const evidenceRefs = [...new Set(relations.flatMap((relation) => relation.evidenceRefs))];
  const meaningful = coordinates.length > 0
    || relations.length > 0
    || emergence.state !== 'NOT_ESTABLISHED'
    || previousState !== null;

  return {
    contract: SFI_FIELD_TEMPORAL_EPOCH_CONTRACT,
    subjectRef: node.nodeId,
    ontologyType: node.ontologyType,
    temporalCoordinates: coordinates,
    observedAt,
    state,
    previousState,
    relationTransitions: relations.map((relation) => ({
      edgeId: relation.edgeId,
      source: relation.source,
      target: relation.target,
      relation: relation.relation,
      currentState: relation.currentState,
      previousState: relation.previousState,
      currentWeight: relation.currentWeight,
      previousWeight: relation.previousWeight,
      weightDelta: relation.weightDelta,
      onset: relation.onset,
      offset: relation.offset,
      recurrence: relation.recurrence,
      evidenceRefs: relation.evidenceRefs,
    })),
    emergence,
    capacity: capacityObservation(node),
    censoring,
    sourceObservationRefs,
    evidenceRefs,
    status: meaningful ? 'MEANINGFUL' : 'INSUFFICIENT',
    boundary: 'A temporal epoch is an append-only reconstruction from persisted observation/relationship state. It does not rewrite prior observations, infer missing intervals, establish causality or convert database timestamps into observed-world time.',
  };
}

export async function persistFieldTemporalEpoch(input: {
  node: CanonicalGraphNode;
  edges: CanonicalGraphEdge[];
  actorId: string;
  trigger: string;
}) {
  const snapshot = deriveFieldTemporalEpochSnapshot(input.node, input.edges);
  if (snapshot.status === 'INSUFFICIENT') {
    return { ok: true as const, persisted: false as const, skipped: true as const, reason: 'INSUFFICIENT_TEMPORAL_STRUCTURE', snapshot };
  }

  const fingerprint = sha256(snapshot);
  const eventId = deterministicUuid({ contract: SFI_FIELD_TEMPORAL_EPOCH_CONTRACT, fingerprint });
  const db = createServiceSupabaseClient();
  const existing = await db.from('epistemic_events').select('event_id').eq('event_id', eventId).maybeSingle();
  if (existing.data?.event_id) {
    return { ok: true as const, persisted: false as const, skipped: true as const, reason: 'EPOCH_ALREADY_PERSISTED', eventId, fingerprint, snapshot };
  }

  const event = await appendEpistemicEvent({
    returnMode:'receipt',
    eventId,
    eventName: 'SFI_FIELD_TEMPORAL_EPOCH_RECORDED',
    epistemicClass: 'derived',
    confidence: 1,
    occurredAt: snapshot.observedAt ?? new Date().toISOString(),
    source: { sourceId: input.actorId, sourceType: input.trigger },
    logbookId: `FIELD_EPOCH:${snapshot.subjectRef}`,
    lineage: [...new Set([...snapshot.sourceObservationRefs, ...snapshot.evidenceRefs])],
    payload: {
      contract: SFI_FIELD_TEMPORAL_EPOCH_CONTRACT,
      fingerprint,
      trigger: input.trigger,
      actorId: input.actorId,
      snapshot,
      canonicalMutation: false,
      historicalRewriteAllowed: false,
    },
  });

  return event.ok
    ? { ok: true as const, persisted: true as const, skipped: false as const, eventId, fingerprint, snapshot }
    : { ok: false as const, persisted: false as const, skipped: false as const, eventId, fingerprint, snapshot, error: event.error, details: 'details' in event ? event.details : null };
}
