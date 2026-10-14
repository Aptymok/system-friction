// SFI MEM-002: compatibility adapter; no second hashing algorithm or global head.
// Historical rows remain unchanged. New events use the shared canonical event store.
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import type { EpistemicClass } from '../../../packages/events/src/schema';

export type { EpistemicClass } from '../../../packages/events/src/schema';

export type EmitEpistemicEventInput = {
  eventId?: string;
  eventName: string;
  logbookId: string;
  epistemicClass: EpistemicClass;
  schemaVersion: string;
  sourceId: string;
  sourceType: string;
  actorId: string | null;
  nodeId?: string | null;
  confidence: number;
  payload: Record<string, unknown>;
  lineage?: string[];
  uncertainty?: string | null;
  occurredAt?: string;
};

export type EpistemicEventRow = {
  id: string;
  event_id: string;
  event_name: string;
  logbook_id: string;
  epistemic_class: EpistemicClass;
  source?: Record<string, unknown>;
  actor_id?: string | null;
  node_id?: string | null;
  confidence: number;
  payload: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
  hash_self: string;
};

/** Compatibility facade. Exactly one hashing and logbook-head implementation. */
export async function emitEpistemicEvent(
  input: EmitEpistemicEventInput
): Promise<{ ok: true; event: EpistemicEventRow } | { ok: false; error: string }> {
  try {
    const result = await appendEpistemicEvent({
      eventId: input.eventId,
      eventName: input.eventName,
      logbookId: input.logbookId,
      epistemicClass: input.epistemicClass,
      schemaVersion: input.schemaVersion,
      source: { sourceId: input.sourceId, sourceType: input.sourceType },
      actorId: input.actorId,
      nodeId: input.nodeId,
      confidence: input.confidence,
      payload: input.payload,
      lineage: input.lineage,
      uncertainty: input.uncertainty ?? undefined,
      occurredAt: input.occurredAt,
    });
    if (!result.ok) return { ok: false, error: result.error };
    if (!result.data) return { ok: false, error: 'epistemic_event_insert_missing_receipt' };
    return { ok: true, event: result.data as EpistemicEventRow };
  } catch {
    return { ok: false, error: 'epistemic_event_append_exception' };
  }
}
