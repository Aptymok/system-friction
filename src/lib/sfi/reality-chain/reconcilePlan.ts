/**
 * Reality Chain: deterministic reconciliation of a dated plan against observed events.
 * No network access. Suitable for tenant-local data and offline deployments.
 * An absent observation is UNKNOWN unless a complete observation window is attested.
 */
export type PlannedEvent = { id: string; dueAt: string; description: string; sourceRef: string };
export type ObservedEvent = { id: string; plannedId?: string; occurredAt: string; sourceRef: string; verified: boolean };
export type CoverageWindow = { from: string; through: string; complete: boolean; sourceRef: string };
export type ReconciliationState = 'NOT_DUE' | 'OBSERVED' | 'UNVERIFIED' | 'NOT_OBSERVED_IN_COMPLETE_WINDOW' | 'UNKNOWN';
export type ReconciliationRow = {
  plannedId: string; dueAt: string; state: ReconciliationState;
  planSourceRef: string; observationRefs: string[]; coverageRef: string | null;
};
function timestamp(value: string): number {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new Error('SFI_RC_INVALID_TIMESTAMP');
  return time;
}
export function reconcilePlannedEvents(input: {
  plan: PlannedEvent[]; observations: ObservedEvent[]; coverage: CoverageWindow[];
  asOf: string;
}): ReconciliationRow[] {
  const cutoff = timestamp(input.asOf);
  const ids = new Set<string>();
  return input.plan.map(item => {
    if (!item.id || !item.sourceRef || ids.has(item.id)) throw new Error('SFI_RC_INVALID_PLAN');
    ids.add(item.id);
    const due = timestamp(item.dueAt);
    const matches = input.observations.filter(o => o.plannedId === item.id && timestamp(o.occurredAt) <= cutoff);
    const verified = matches.filter(o => o.verified && o.sourceRef);
    const complete = input.coverage.find(c => c.complete && c.sourceRef && timestamp(c.from) <= due && timestamp(c.through) >= cutoff);
    let state: ReconciliationState = 'UNKNOWN';
    if (due > cutoff) state = 'NOT_DUE';
    else if (verified.length) state = 'OBSERVED';
    else if (matches.length) state = 'UNVERIFIED';
    else if (complete) state = 'NOT_OBSERVED_IN_COMPLETE_WINDOW';
    return {
      plannedId: item.id, dueAt: item.dueAt, state,
      planSourceRef: item.sourceRef,
      observationRefs: matches.map(o => o.sourceRef).filter(Boolean),
      coverageRef: complete?.sourceRef ?? null,
    };
  });
}
