import { appendEpistemicEvent } from '@/lib/events/eventStore';
import type { SFIEvent } from './eventBus';

export interface PersistedEvent {
  id: string;
  eventType: string;
  agentId?: string;
  payload: unknown;
  createdAt: string;
}

type AppendAcknowledgement =
  | { ok: true; data: { event_id: string } }
  | { ok: false; error: string; details?: unknown };

type EventAppender = (
  input: Parameters<typeof appendEpistemicEvent>[0],
) => Promise<AppendAcknowledgement>;

/**
 * C07: a dispatched agent event is not persisted merely because an RPC was
 * attempted. Require the canonical atomic-append acknowledgement AND the same
 * event identity. Optional writer injection is for isolated failure testing.
 */
export async function persistSFIEvent(
  event: SFIEvent,
  append: EventAppender = appendEpistemicEvent,
): Promise<PersistedEvent> {
  const result = await append({
    eventId: event.id,
    eventName: event.type,
    epistemicClass: 'observed',
    confidence: 1,
    payload: event.payload,
    occurredAt: event.timestamp,
    logbookId: (event.payload as Record<string, unknown> | null)?.logbookId as string | undefined ?? 'runtime-default',
    source: {
      sourceId: event.agentId ?? 'runtime',
      sourceType: 'runtime',
    },
  });

  if (!result.ok) {
    throw new Error(`SFI_EVENT_PERSISTENCE_FAILED:${result.error}`);
  }
  if (result.data.event_id !== event.id) {
    throw new Error('SFI_EVENT_PERSISTENCE_RECEIPT_MISMATCH');
  }
  return {
    id: result.data.event_id,
    eventType: event.type,
    agentId: event.agentId,
    payload: event.payload,
    createdAt: event.timestamp,
  };
}

export async function persistEventBatch(events: SFIEvent[]): Promise<PersistedEvent[]> {
  return Promise.all(events.map((event) => persistSFIEvent(event)));
}
