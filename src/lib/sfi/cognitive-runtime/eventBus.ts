export interface SFIEvent {

  id: string;

  type: string;

  agentId?: string;

  payload: unknown;

  timestamp: string;

}


export type EventHandler =
(
  event: SFIEvent
) => void;


const handlers:
Record<string, EventHandler[]> = {};


export function emitSFIEvent(
  event: SFIEvent
): void {

  const listeners =
    handlers[event.type] ?? [];


  for (
    const handler
    of listeners
  ) {

    handler(
      event
    );

  }

}


export function subscribeSFIEvent(
  type: string,
  handler: EventHandler
): void {


  if (
    !handlers[type]
  ) {

    handlers[type] = [];

  }


  handlers[type].push(
    handler
  );

}


export function createSFIEvent(
  type: string,
  payload: unknown,
  agentId?: string
): SFIEvent {

  return {

    id:
      crypto.randomUUID(),

    type,

    agentId,

    payload,

    timestamp:
      new Date().toISOString()

  };

}
