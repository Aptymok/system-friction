import { appendEpistemicEvent } from "@/lib/events/eventStore";
import type { SFIEvent } from "./eventBus";

export interface PersistedEvent {
  id: string;
  eventType: string;
  agentId?: string;
  payload: unknown;
  createdAt: string;
}

export async function persistSFIEvent(
  event: SFIEvent
): Promise<PersistedEvent> {

  await appendEpistemicEvent({

    eventId: event.id,

    eventName: event.type,

    epistemicClass: "observed",

    confidence: 1,

    payload: event.payload,

    occurredAt: event.timestamp,

logbookId:
  (event.payload as any)?.logbookId ??
  "runtime-default",

    source: {

      sourceId:
        event.agentId ?? "runtime",

      sourceType:
        "runtime"

    }

  });

  return {

    id: event.id,

    eventType: event.type,

    agentId: event.agentId,

    payload: event.payload,

    createdAt: event.timestamp

  };

}

export async function persistEventBatch(
  events: SFIEvent[]
): Promise<PersistedEvent[]> {

  return Promise.all(
    events.map(persistSFIEvent)
  );

}