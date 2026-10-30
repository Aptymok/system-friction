/**
 * Read-only scheduling predicate for existing universal cycles.
 * OPENED must be included: a cycle with no subsequent checkpoint still
 * represents work, and must not disappear from the hourly wakeup gate.
 *
 * Callers supply newest-first lifecycle events, as ordered by sequence DESC.
 */
export const UNIVERSAL_LIFECYCLE_EVENTS = [
  'SFI_UNIVERSAL_CYCLE_OPENED',
  'SFI_UNIVERSAL_CYCLE_RESUMED',
  'SFI_UNIVERSAL_COGNITIVE_CHECKPOINT',
  'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED',
  'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED',
  'SFI_UNIVERSAL_RETURN_PLAN_RECORDED',
  'SFI_UNIVERSAL_RETURN_RECORDED',
  'SFI_UNIVERSAL_CYCLE_CLOSED',
] as const;

type LifecycleEvent = { logbook_id?: unknown; event_name?: unknown };

export function hasOpenUniversalCycle(events: LifecycleEvent[]): boolean {
  const latestByLogbook = new Map<string, string>();
  for (const event of events) {
    const logbookId = typeof event.logbook_id === 'string' ? event.logbook_id : '';
    const eventName = typeof event.event_name === 'string' ? event.event_name : '';
    if (!logbookId || !eventName || latestByLogbook.has(logbookId)) continue;
    latestByLogbook.set(logbookId, eventName);
  }
  return [...latestByLogbook.values()].some((eventName) => eventName !== 'SFI_UNIVERSAL_CYCLE_CLOSED');
}
