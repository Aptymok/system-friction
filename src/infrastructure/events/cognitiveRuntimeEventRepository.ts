import {
  createSFIEvent,
  emitSFIEvent
} from "@/lib/sfi/cognitive-runtime/eventBus";

import {
  persistSFIEvent
} from "@/lib/sfi/cognitive-runtime/eventPersistence";


export async function recordAgentExecutionEvent(
  agentId: string,
  eventType: string,
  payload: unknown
): Promise<void> {


  const event =
    createSFIEvent(
      eventType,
      payload,
      agentId
    );


  // The durable acknowledgement is authoritative; never broadcast a
  // successful execution event before the canonical append has succeeded.
  await persistSFIEvent(event);
  try {
    emitSFIEvent(event);
  } catch (error) {
    // An in-process observer is not allowed to negate a durable database
    // receipt. Log the observer fault separately for incident investigation.
    console.warn('SFI_AGENT_EVENT_SUBSCRIBER_FAILED', error);
  }

}


export async function recordCognitiveCycleEvent(
  payload: unknown
): Promise<void> {


  const event =
    createSFIEvent(
      "SFI_COGNITIVE_CYCLE_COMPLETED",
      payload,
      "meta_orchestrator"
    );


  emitSFIEvent(
    event
  );


  await persistSFIEvent(
    event
  );

}
