import 'server-only';
import { runWorldObservationCycle } from './worldCycle';

export const WORLD_SIGNAL_OBSERVER_AGENT_CONTRACT = 'SFI-WORLD-SIGNAL-OBSERVER-1.0';
export const WORLD_SIGNAL_OBSERVER_AGENT_ID = 'world_signal_observer';

export const WORLD_SIGNAL_OBSERVER_AGENT = {
  id: WORLD_SIGNAL_OBSERVER_AGENT_ID,
  name: 'WorldSignalObserverAgent',
  contract: WORLD_SIGNAL_OBSERVER_AGENT_CONTRACT,
  owner: 'SFI-00',
  domain: 'WORLD_DISCOVERY',
  authority: 'OBSERVE',
  canonicalWriter: 'runWorldObservationCycle',
  persistedSource: 'world_source_observations',
  derivedDescriptorSource: 'world_friction_readings',
  boundaries: {
    automaticHypothesisPromotion: false,
    automaticCaseQualification: false,
    automaticCanonPromotion: false,
    automaticPublication: false,
    institutionalMutation: false,
  },
} as const;

export async function executeWorldSignalObserverAgent() {
  const observation = await runWorldObservationCycle();
  return {
    contract: WORLD_SIGNAL_OBSERVER_AGENT_CONTRACT,
    agentId: WORLD_SIGNAL_OBSERVER_AGENT_ID,
    agentName: WORLD_SIGNAL_OBSERVER_AGENT.name,
    authority: WORLD_SIGNAL_OBSERVER_AGENT.authority,
    state: observation.ok
      ? observation.persisted > 0 ? 'OBSERVED_WORLD' : 'NO_NEW_WORLD_OBSERVATIONS'
      : 'DEGRADED',
    observation,
    lineage: {
      persistedSource: WORLD_SIGNAL_OBSERVER_AGENT.persistedSource,
      sourceUrlPreserved: true,
      sourceIdentityPreserved: true,
      actorLineagePreservedWhenObserved: true,
      rawHashPreserved: true,
      collectorVersionPreserved: true,
    },
    epistemicBoundary: {
      sourceRecordsAreObservations: true,
      frictionReadingsAreDerivedDescriptors: true,
      automaticHypothesisPromotion: false,
      automaticCaseQualification: false,
      automaticCanonPromotion: false,
      automaticPublication: false,
    },
    generatedAt: new Date().toISOString(),
  } as const;
}
