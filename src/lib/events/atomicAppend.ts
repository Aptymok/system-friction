import type { SupabaseClient } from '@supabase/supabase-js';
import { canonicalizeEventPayload, type EpistemicEventRecord } from '../../../packages/events/src/schema';

type AtomicInput = Omit<EpistemicEventRecord, 'hashPrev' | 'hashSelf' | 'createdAt'> & {
  actorId: string | null;
  nodeId: string | null;
  returnMode: 'full' | 'receipt';
};

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

  // Retry only explicitly stale head errors; all other errors fail closed.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: head, error: headError } = await service
      .from('epistemic_events')
      .select('hash_self')
      .eq('logbook_id', event.logbookId)
      .order('sequence', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (headError) return { ok: false as const, error: 'epistemic_event_head_read_failed', details: headError.message };
    const currentHead = typeof head?.hash_self === 'string' ? head.hash_self : null;
    const material = canonicalMaterial(event, currentHead);
    const canonicalUtf8 = JSON.stringify(canonicalizeEventPayload(material));

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
      p_checksum: event.checksum ?? null,
      p_lineage: event.lineage ?? [],
      p_uncertainty: event.uncertainty ?? null,
      p_occurred_at: event.occurredAt,
      p_canonical_attributes: material,
      p_canonical_utf8: canonicalUtf8,
      p_receipt_only: event.returnMode === 'receipt',
    });
    if (!error) {
      if (!data || typeof data !== 'object') {
        return { ok: false as const, error: 'epistemic_atomic_append_missing_receipt', details: 'No row returned by RPC' };
      }
      return { ok: true as const, data: data as Record<string, unknown> };
    }
    // SQLSTATE P0001 / PostgREST message: head changed while waiting on lock.
    if (!error.message?.includes('SFI_EPIS_HEAD_STALE_RETRY')) {
      return { ok: false as const, error: 'epistemic_atomic_append_failed', details: error.message };
    }
  }
  return { ok: false as const, error: 'epistemic_atomic_append_contention', details: 'Max retry attempts exhausted' };

}
