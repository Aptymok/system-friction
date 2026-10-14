import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { canonicalizeEventPayload, type EpistemicEventRecord } from '../../../packages/events/src/schema';

type AtomicInput = Omit<EpistemicEventRecord, 'hashPrev' | 'hashSelf' | 'createdAt'> & {
  actorId: string | null;
  nodeId: string | null;
  returnMode: 'full' | 'receipt';
};

function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonicalizeEventPayload(value))).digest('hex');
}

function canonicalMaterial(event: AtomicInput, hashPrev: string | null) {
  return {
    eventId: event.eventId,
    eventName: event.eventName,
    logbookId: event.logbookId,
    epistemicClass: event.epistemicClass,
    schemaVersion: event.schemaVersion,
    source: event.source,
    confidence: event.confidence,
    payload: event.payload,
    checksum: event.checksum,
    lineage: event.lineage ?? [],
    uncertainty: event.uncertainty ?? null,
    occurredAt: event.occurredAt,
    hashPrev,
  };
}

/** Single database transaction: serialize head lookup, hash, and insertion. */
export async function appendAtomicEpistemicEvent(service: SupabaseClient, event: AtomicInput) {
  if (event.nodeId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(event.nodeId)) {
    return { ok: false as const, error: 'invalid_epistemic_node_id', details: 'nodeId must be a UUID' };
  }

  // The RPC uses pg_advisory_xact_lock and validates the predecessor against the
  // current database head before insertion. Client-supplied hash is not trusted.
  const { data, error } = await service.rpc('sfi_append_epistemic_event_v2', {
    p_event_id: event.eventId,
    p_event_name: event.eventName,
    p_logbook_id: event.logbookId,
    p_epistemic_class: event.epistemicClass,
    p_schema_version: event.schemaVersion,
    p_source: event.source ?? {},
    p_actor_id: event.actorId,
    p_node_id: event.nodeId,
    p_confidence: event.confidence,
    p_payload: event.payload,
    p_checksum: hash(event.payload),
    p_lineage: event.lineage ?? [],
    p_uncertainty: event.uncertainty ?? null,
    p_occurred_at: event.occurredAt,
    // Client submits canonical attributes; the server computes the hash
    // using the same deterministic JSON object. See migration fixture tests.
    p_canonical_attributes: canonicalMaterial(event, null),
    p_receipt_only: event.returnMode === 'receipt',
  });
  if (error) return { ok: false as const, error: 'epistemic_atomic_append_failed', details: error.message };
  if (!data || typeof data !== 'object') return { ok: false as const, error: 'epistemic_atomic_append_missing_receipt', details: 'No row returned by RPC' };
  return { ok: true as const, data: data as Record<string, unknown> };
}
