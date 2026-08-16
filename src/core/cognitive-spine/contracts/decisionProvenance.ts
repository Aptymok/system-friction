import type { CognitiveSpineTransition } from './transition';

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

  /**
   * Explicit Δ from the immediately preceding institutional snapshot into the
   * state consumed by this execution. It closes the previous state's T12 when
   * a later run materializes this entry transition.
   */
  entryTransitionRef: string | null;
  entryTransitionHash: string | null;
  entryTransition: CognitiveSpineTransition | null;

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
  /** Post-execution transition into a later state; expected to be discovered in a later run. */
  transitionRef: string | null;

  provenanceGaps: string[];
};
