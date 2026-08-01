export interface RuntimeEventBus {
  publish(event: string, payload: unknown): void;
  subscribe(event: string, listener: (payload: unknown) => void): () => void;
}

export class InMemoryEventBus implements RuntimeEventBus {
  private listeners = new Map<string, Set<(payload: unknown) => void>>();

  publish(event: string, payload: unknown): void {
    const handlers = this.listeners.get(event) ?? new Set();
    for (const handler of handlers) handler(payload);
  }

  subscribe(event: string, listener: (payload: unknown) => void): () => void {
    const handlers = this.listeners.get(event) ?? new Set();
    handlers.add(listener);
    this.listeners.set(event, handlers);
    return () => handlers.delete(listener);
  }
}

export interface CapabilityResolver {
  resolve(capabilityId: string): string | null;
}

export class SimpleCapabilityResolver implements CapabilityResolver {
  resolve(capabilityId: string): string | null {
    return capabilityId;
  }
}

export interface EventBuilder {
  build(type: string, payload: unknown, logbookId: string, sequence: number): unknown;
}

export class CanonicalEventBuilder implements EventBuilder {
  build(type: string, payload: unknown, logbookId: string, sequence: number): unknown {
    return {
      type,
      payload,
      logbookId,
      sequence,
    };
  }
}

export interface EventValidator {
  validate(event: unknown): boolean;
}

export class CanonicalEventValidator implements EventValidator {
  validate(event: unknown): boolean {
    if (!event || typeof event !== 'object') return false;
    const candidate = event as Record<string, unknown>;
    return typeof candidate.type === 'string' && typeof candidate.logbookId === 'string' && typeof candidate.sequence === 'number';
  }
}
