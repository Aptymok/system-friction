export const COGNITIVE_SPINE_DECISION_PROVENANCE_VERSION = 'SFI-CT-DECISION-PROVENANCE-1.0' as const;

export type CognitiveSpineDecisionProvenance = {
  contractVersion: typeof COGNITIVE_SPINE_DECISION_PROVENANCE_VERSION;
  executionId: string;
  recordedAt: string;

  snapshot: {
    availableId: string;
    availableHash: string;
    consumed: boolean;
    consumedId: string | null;
    consumedHash: string | null;
    projectionProfile: string | null;
    profileVersion: string | null;
    sourceCutoff: string;
  };

  stateRefs: {
    observations: string[];
    evidence: string[];
    memory: string[];
    hypotheses: string[];
    constraints: string[];
    contradictions: string[];
    epistemicState: string[];
  };

  execution: {
    operations: string[];
    alternatives: string[];
    rejectedConditions: string[];
    model: string | null;
    provider: string | null;
    promptHash: string | null;
  };

  proposalRef: string | null;
  rootActionRef: string | null;
  interventionRef: string | null;
  returnRef: string | null;
  transitionRef: string | null;

  provenanceGaps: string[];
};
