export const COGNITIVE_SPINE_TRANSITION_SCHEMA_VERSION = 'SFI-CT-TRANSITION-1.0' as const;

export type CognitiveSpineDeltaSummary = {
  changed: boolean;
  addedRefs: string[];
  removedRefs: string[];
  changedRefs: string[];
  unchangedCriticalRefs: string[];
};

export type CognitiveSpineSemanticTransitionPayload = {
  schemaVersion: typeof COGNITIVE_SPINE_TRANSITION_SCHEMA_VERSION;
  fromSnapshotHash: string;
  toSnapshotHash: string;
  transitionInputs: string[];
  admittedEpistemicRefs: string[];

  sourceDelta: CognitiveSpineDeltaSummary;
  epistemicDelta: CognitiveSpineDeltaSummary;
  cognitiveStateDelta: CognitiveSpineDeltaSummary;
  governanceDelta: CognitiveSpineDeltaSummary;

  projectorVersion: string;
  policyVersion: string;
  snapshotSchemaVersion: string;
};

/**
 * The transition envelope records artifact execution metadata. transitionHash
 * covers semanticPayload only. No `causedBy` field exists by design.
 */
export type CognitiveSpineTransition = {
  transitionId: string;
  createdAt: string;
  semanticPayload: CognitiveSpineSemanticTransitionPayload;
  transitionHash: string;
  runtimeMetadata?: Record<string, string | number | boolean | null>;
};

export type CognitiveSpineTransitionInput = {
  transitionId: string;
  createdAt: string;
  transitionInputs: string[];
  admittedEpistemicRefs: string[];
  unchangedCriticalRefs?: string[];
  runtimeMetadata?: Record<string, string | number | boolean | null>;
};
