export const COGNITIVE_SPINE_SNAPSHOT_SCHEMA_VERSION = 'SFI-CT-SNAPSHOT-1.0' as const;

export type CognitiveSpineRefKind =
  | 'EVENT'
  | 'EVIDENCE'
  | 'HYPOTHESIS'
  | 'MEMORY'
  | 'DECISION'
  | 'CONTRADICTION'
  | 'FREEZE'
  | 'QUESTION'
  | 'PERSON_CT';

export type AssessedEpistemicClass =
  | 'OBSERVED'
  | 'DECLARED'
  | 'VERIFIED_CONTRAST'
  | 'DERIVED'
  | 'INFERRED'
  | 'SIMULATED'
  | 'PROJECTED'
  | 'INVALIDATED';

export type CognitiveDebtType =
  | 'VERIFICATION'
  | 'CONTRADICTION'
  | 'RETURN'
  | 'PROVENANCE'
  | 'EXPERIMENTAL'
  | 'STALE_KNOWLEDGE';

/**
 * A source record is already canonicalized and, where epistemically relevant,
 * already assessed before it reaches the projector. The projector must not
 * create or upgrade epistemic judgments.
 */
export type CognitiveSpineSourceRecord = {
  ref: string;
  kind: CognitiveSpineRefKind;
  recordedAt: string;
  sourceHash: string;
  epistemicAssessmentRef?: string;
  epistemicClass?: AssessedEpistemicClass;
  ancestryRoots?: string[];
  visibilityProfiles?: string[];
  invalidated?: boolean;
  debtType?: CognitiveDebtType;
};

export type CognitiveSpineDerivedState = {
  sourceCount: number;
  assessedSourceCount: number;
  invalidatedSourceCount: number;
  independentLineageRootCount: number;
  contradictionCount: number;
  questionCount: number;
  debt: Record<CognitiveDebtType, number>;
};

export type CognitiveSpineSemanticPayload = {
  schemaVersion: typeof COGNITIVE_SPINE_SNAPSHOT_SCHEMA_VERSION;
  sourceCutoff: string;
  projectorVersion: string;
  policyVersion: string;
  projectionProfile: string;

  eventRefs: string[];
  evidenceRefs: string[];
  hypothesisRefs: string[];
  memoryRefs: string[];
  decisionRefs: string[];
  contradictionRefs: string[];
  freezeRefs: string[];
  questionRefs: string[];
  personCtRefs: string[];

  epistemicAssessmentRefs: string[];
  sourceManifest: Array<{
    ref: string;
    kind: CognitiveSpineRefKind;
    sourceHash: string;
    epistemicAssessmentRef: string | null;
    epistemicClass: AssessedEpistemicClass | null;
    ancestryRoots: string[];
    invalidated: boolean;
    debtType: CognitiveDebtType | null;
  }>;
  derivedState: CognitiveSpineDerivedState;
  lineageRoots: string[];
};

/**
 * artifact identity != semantic identity
 *
 * snapshotId / timestamps / runtimeMetadata identify a material artifact.
 * snapshotHash identifies only semanticPayload.
 */
export type CognitiveSpineSnapshot = {
  snapshotId: string;
  createdAt: string;
  reconstructedAt?: string;
  semanticPayload: CognitiveSpineSemanticPayload;
  snapshotHash: string;
  runtimeMetadata?: Record<string, string | number | boolean | null>;
};

export type CognitiveStateProjectionInput = {
  sourceCutoff: string;
  projectorVersion: string;
  policyVersion: string;
  projectionProfile: string;
  records: CognitiveSpineSourceRecord[];
};

export type CognitiveSnapshotEnvelopeInput = {
  snapshotId: string;
  createdAt: string;
  reconstructedAt?: string;
  runtimeMetadata?: Record<string, string | number | boolean | null>;
};
