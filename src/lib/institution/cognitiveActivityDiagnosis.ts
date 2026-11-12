/**
 * Pure observational admission for an existing institutional cognitive diagnosis.
 * GATED is only a lack of fresh execution receipts, NEVER evidence of denial.
 * This helper performs no IO, proposal write, agent call or authority expansion.
 */
export const COGNITIVE_DIAGNOSTIC_WINDOW_MS = 24 * 60 * 60 * 1000;
const DIAGNOSTIC_SIGNALS = new Set([
  'SFI_TASK_CREATED',
  'SFI_UNIVERSAL_RETURN_CONTRASTED',
  'SFI_JR_FIELD_CYCLE_COMPLETED',
]);

type CognitiveEvent = {eventId:string;eventName:string;occurredAt:string|null};
type CognitiveSnapshot = {
  generatedAt:string;
  agents: Array<{status:string}>;
  contract: {executorAgents:number};
  eventGraph: {status:string; warnings:string[]; recentEvents:CognitiveEvent[]};
};

export function assessCognitiveActivity(runtime:CognitiveSnapshot) {
  const bound = runtime.agents.length > 0 && runtime.contract.executorAgents === runtime.agents.length;
  const fullyInactive = bound && runtime.agents.every(a => a.status === 'gated');
  // Only a verified operational read allows diagnostic admission.
  // Unknown/degraded states and malformed event collections fail closed.
  const eventGraph = runtime.eventGraph;
  const provenanceAvailable = eventGraph?.status === 'operational'
    && Array.isArray(eventGraph.warnings) && eventGraph.warnings.length === 0
    && Array.isArray(eventGraph.recentEvents);
  const asOf = Date.parse(runtime.generatedAt);
  const admitted = provenanceAvailable && Number.isFinite(asOf)
    ? eventGraph.recentEvents.flatMap(event => {
      if (!event || !DIAGNOSTIC_SIGNALS.has(event.eventName)) return [];
      if (typeof event.eventId !== 'string' || !event.eventId.trim()) return [];
      if (typeof event.occurredAt !== 'string' || !event.occurredAt.trim()) return [];
      const time = Date.parse(event.occurredAt);
      if (!Number.isFinite(time) || time > asOf || asOf - time > COGNITIVE_DIAGNOSTIC_WINDOW_MS) return [];
      return [{ event, time }];
    })
    : [];
  // Input order and duplicate receipts must not determine which 12 signals are shown.
  const seen = new Set<string>();
  const signals = admitted
    .sort((a,b) => b.time - a.time || a.event.eventId.localeCompare(b.event.eventId))
    .filter(({event}) => {
      if (seen.has(event.eventId)) return false;
      seen.add(event.eventId);
      return true;
    })
    .slice(0,12)
    .map(({event}) => event);
  const state = !provenanceAvailable || !Number.isFinite(asOf) ? 'EVENT_READ_UNAVAILABLE'
    : !fullyInactive ? 'NO_COLLECTIVE_INACTIVITY'
    : !signals.length ? 'NO_RECENT_DIAGNOSTIC_INPUT'
    : 'DIAGNOSTIC_ELIGIBLE';
  return {
    state,
    signals,
    registeredAgents:runtime.agents.length,
    inactivityMeansDenial:false as const,
    boundary:'An execution-free window is not permission denial. The recent signal allows a bounded read-only diagnostic, not agent fanout, change of authority or an empirical outcome.',
  };
}
