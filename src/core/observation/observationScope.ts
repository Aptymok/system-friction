export const SFI_OBSERVATION_SCOPE_CONTRACT = 'SFI-OBSERVATION-SCOPE-1.0' as const;

export const SFI_OBSERVATION_SCOPE_TYPES = [
  'ATTRACTOR','PROJECT','NODE','OBJECT','MANIFESTATION',
  'CASE','SYSTEM','PROCESS','COMPONENT','EVENT',
  'CONTRACT','WARRANTY','ASSET','SERVICE','SUPPLIER',
  'TENDER','REQUIREMENT','BIDDER','AI_EXECUTION','DECISION',
] as const;
export type SfiObservationScopeType = (typeof SFI_OBSERVATION_SCOPE_TYPES)[number];

export type SfiObservationTime = {
  mode: 'CROSS_SECTIONAL' | 'LONGITUDINAL' | 'RETROLONGITUDINAL' | 'COUNTERFACTUAL' | 'PROJECTIVE';
  start: string | null;
  end: string | null;
  cutoff: string;
  timezone: string;
};

export type SfiObservableDefinition = {
  key: string;
  label: string;
  extractor: string | null;
  sourceClass: string;
  unit: string | null;
  temporalBehavior: 'STATIC' | 'EVENT' | 'SERIES' | 'SNAPSHOT';
  mihmVariableKey: string | null;
};

export type SfiObservationContractV1 = {
  contract: 'SFI-OBSERVABLE-CONTRACT-1.0';
  scopeType: SfiObservationScopeType;
  domainType: string;
  observables: SfiObservableDefinition[];
};

export type SfiObservationScopeV1 = {
  contract: typeof SFI_OBSERVATION_SCOPE_CONTRACT;
  id: string;
  workspaceId: string;
  parentScopeId: string | null;
  scopeType: SfiObservationScopeType;
  domainType: string;
  serviceProfileId: string | null;
  label: string;
  description: string | null;
  declaredAttractorId: string | null;
  time: SfiObservationTime;
  evidenceRefs: string[];
  observationContract: SfiObservationContractV1 | null;
};

export type SfiMultiscaleObservationRequest = {
  scopeId: string;
  time: SfiObservationTime;
  serviceProfileId: string | null;
};

export const SFI_MULTISCALE_OBSERVATION_INVARIANTS = {
  sameMihmVariableSpaceAcrossScopes: true,
  sameAggregationFunctionAcrossScopes: false,
  partMetricsDoNotAutomaticallyEqualWholeSystemState: true,
  missingObservableDoesNotBecomeInferredObservation: true,
  manifestationIsNotEquivalentToArtifact: true,
} as const;
