import {
  createSFIEvent,
  emitSFIEvent
} from "./eventBus";

import {
  persistSFIEvent
} from "./eventPersistence";


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


  emitSFIEvent(
    event
  );


  await persistSFIEvent(
    event
  );

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
