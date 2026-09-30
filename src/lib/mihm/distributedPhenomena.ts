import 'server-only';

import { createHash } from 'node:crypto';
import type { CanonicalGraphEdge, CanonicalGraphNode } from '../../../packages/graph/src';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { relationScientificReading } from './fieldScientificReading';

export const SFI_DISTRIBUTED_PHENOMENON_CONTRACT = 'SFI-DISTRIBUTED-PHENOMENON-1.0' as const;

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

function dateCandidate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

export type DistributedPhenomenonCandidate = {
  contract: typeof SFI_DISTRIBUTED_PHENOMENON_CONTRACT;
  phenomenonId: string;
  anchorNodeId: string;
  memberNodeIds: string[];
  relationIds: string[];
  evidenceRefs: string[];
  evidenceBoundRelationCount: number;
  meanRelationWeight: number;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  relationStateSignature: string[];
  status: 'CANDIDATE';
  epistemicClass: 'DERIVED';
  reason: string;
  boundary: string;
};

export function deriveDistributedPhenomena(
  nodes: CanonicalGraphNode[],
  edges: CanonicalGraphEdge[],
): DistributedPhenomenonCandidate[] {
  const nodeIds = new Set(nodes.map((node) => node.nodeId));
  const candidates = new Map<string, DistributedPhenomenonCandidate>();

  for (const anchor of nodes) {
    const qualified = edges
      .filter((edge) =>
        nodeIds.has(edge.sourceNodeId)
        && nodeIds.has(edge.targetNodeId)
        && (edge.sourceNodeId === anchor.nodeId || edge.targetNodeId === anchor.nodeId),
      )
      .map((edge) => ({ edge, reading: relationScientificReading(edge) }))
      .filter((item) => item.reading.provenanceBound);

    const members = [...new Set([
      anchor.nodeId,
      ...qualified.flatMap((item) => [item.edge.sourceNodeId, item.edge.targetNodeId]),
    ])].sort();
    if (members.length < 3 || qualified.length < 2) continue;

    const relationIds = qualified.map((item) => item.edge.edgeId).sort();
    const key = JSON.stringify({ members, relationIds });
    if (candidates.has(key)) continue;

    const evidenceRefs = [...new Set(qualified.flatMap((item) => item.reading.evidenceRefs))].sort();
    const times = [
      ...nodes
        .filter((node) => members.includes(node.nodeId))
        .flatMap((node) => [
          node.attributes.observedAt,
          node.attributes.observed_at,
          node.attributes.occurredAt,
          node.attributes.occurred_at,
          node.attributes.validFrom,
          node.attributes.valid_from,
        ])
        .map(dateCandidate)
        .filter((value): value is string => Boolean(value)),
      ...qualified
        .flatMap((item) => [item.reading.onset, item.reading.offset])
        .map(dateCandidate)
        .filter((value): value is string => Boolean(value)),
    ].sort();

    const relationStateSignature = qualified
      .map((item) => {
        const state = item.reading.currentState ?? 'UNKNOWN';
        const prior = item.reading.previousState ?? 'UNKNOWN';
        return `${item.edge.relation}:${prior}->${state}`;
      })
      .sort();

    const meanRelationWeight = qualified.reduce((sum, item) => sum + item.edge.weight, 0) / qualified.length;
    const fingerprint = sha256({ members, relationIds, relationStateSignature, evidenceRefs }).slice(0, 20);
    const phenomenonId = `SFI-PHEN-${fingerprint.toUpperCase()}`;

    candidates.set(key, {
      contract: SFI_DISTRIBUTED_PHENOMENON_CONTRACT,
      phenomenonId,
      anchorNodeId: anchor.nodeId,
      memberNodeIds: members,
      relationIds,
      evidenceRefs,
      evidenceBoundRelationCount: qualified.length,
      meanRelationWeight,
      firstObservedAt: times[0] ?? null,
      lastObservedAt: times.at(-1) ?? null,
      relationStateSignature,
      status: 'CANDIDATE',
      epistemicClass: 'DERIVED',
      reason: 'A multi-node provenance-bound configuration is present in the current field. The phenomenon identity belongs to the configuration, not to any single member node.',
      boundary: 'Distributed phenomenon candidate only. Membership, recurrence and relational configuration are derived from persisted field structure; causality, emergence, attractor status and regime change require separate evidence and contrast.',
    });
  }

  return [...candidates.values()];
}

export async function persistDistributedPhenomenonCandidate(input: {
  candidate: DistributedPhenomenonCandidate;
  actorId: string;
  trigger: string;
}) {
  const fingerprint = sha256(input.candidate);
  const eventId = deterministicUuid({ contract: SFI_DISTRIBUTED_PHENOMENON_CONTRACT, fingerprint });
  const db = createServiceSupabaseClient();
  const existing = await db.from('epistemic_events').select('event_id').eq('event_id', eventId).maybeSingle();
  if (existing.data?.event_id) {
    return { ok: true as const, persisted: false as const, skipped: true as const, reason: 'PHENOMENON_CONFIGURATION_ALREADY_PERSISTED', eventId, fingerprint };
  }

  const event = await appendEpistemicEvent({
    returnMode:'receipt',
    eventId,
    eventName: 'SFI_DISTRIBUTED_PHENOMENON_CANDIDATE_RECORDED',
    epistemicClass: 'derived',
    confidence: 1,
    occurredAt: input.candidate.lastObservedAt ?? input.candidate.firstObservedAt ?? new Date().toISOString(),
    source: { sourceId: input.actorId, sourceType: input.trigger },
    logbookId: `FIELD_PHENOMENON:${input.candidate.phenomenonId}`,
    lineage: input.candidate.evidenceRefs,
    payload: {
      contract: SFI_DISTRIBUTED_PHENOMENON_CONTRACT,
      fingerprint,
      actorId: input.actorId,
      trigger: input.trigger,
      candidate: input.candidate,
      canonicalMutation: false,
      phenomenonEstablished: false,
    },
  });

  return event.ok
    ? { ok: true as const, persisted: true as const, skipped: false as const, eventId, fingerprint }
    : { ok: false as const, persisted: false as const, skipped: false as const, eventId, fingerprint, error: event.error, details: 'details' in event ? event.details : null };
}

export function projectDistributedPhenomenaForRoot(
  candidates: DistributedPhenomenonCandidate[],
  loadedAt: string,
): { nodes: CanonicalGraphNode[]; edges: CanonicalGraphEdge[] } {
  const nodes: CanonicalGraphNode[] = candidates.map((candidate) => ({
    nodeId: candidate.phenomenonId,
    label: `Distributed phenomenon · ${candidate.memberNodeIds.length} members`,
    ontologyType: 'phenomenon',
    profile: 'sfi',
    origin: 'field_scientific_projection',
    provenance: SFI_DISTRIBUTED_PHENOMENON_CONTRACT,
    lineage: candidate.evidenceRefs,
    attributes: {
      epistemicClass: 'DERIVED',
      phenomenonState: 'CANDIDATE',
      memberNodeIds: candidate.memberNodeIds,
      relationIds: candidate.relationIds,
      evidenceBoundRelationCount: candidate.evidenceBoundRelationCount,
      meanRelationWeight: candidate.meanRelationWeight,
      observedAt: candidate.lastObservedAt ?? candidate.firstObservedAt,
      firstObservedAt: candidate.firstObservedAt,
      lastObservedAt: candidate.lastObservedAt,
      distributedConfiguration: true,
      doesNotImplyCausality: true,
      doesNotImplyAttractor: true,
      doesNotImplyRegimeChange: true,
      boundary: candidate.boundary,
    },
    createdAt: loadedAt,
    updatedAt: loadedAt,
  }));

  const edges: CanonicalGraphEdge[] = candidates.flatMap((candidate) =>
    candidate.memberNodeIds.map((memberNodeId) => ({
      edgeId: `${candidate.phenomenonId}:member:${memberNodeId}`,
      sourceNodeId: candidate.phenomenonId,
      targetNodeId: memberNodeId,
      relation: 'distributed_configuration_member',
      weight: Math.max(0, Math.min(1, candidate.meanRelationWeight)),
      profile: 'sfi' as const,
      origin: 'field_scientific_projection',
      provenance: SFI_DISTRIBUTED_PHENOMENON_CONTRACT,
      lineage: candidate.evidenceRefs,
      attributes: {
        epistemicClass: 'DERIVED',
        configurationMembership: true,
        phenomenonEstablished: false,
      },
      createdAt: loadedAt,
      updatedAt: loadedAt,
    })),
  );

  return { nodes, edges };
}
