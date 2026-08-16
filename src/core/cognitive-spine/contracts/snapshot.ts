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
  sourceVersion?: string;
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

export type CognitiveSpineOperatingMode = {
  modeRef: string | null;
};

export type CognitiveSpineTemporalState = {
  sourceCutoff: string;
  visibleRecordCount: number;
};

export type CognitiveSpineVerificationDebt = {
  absolute: number;
  byType: Record<CognitiveDebtType, number>;
};

export type CognitiveSpineSourceManifestEntry = {
  ref: string;
  sourceKind: CognitiveSpineRefKind;
  sourceVersion: string | null;
  sourceHash: string;
};

export type CognitiveSpineSourceHashEntry = {
  ref: string;
  hash: string;
};

export type CognitiveSpineSemanticPayload = {
  sourceCutoff: string;
  projectorVersion: string;
  policyVersion: string;
  projectionProfile: string;
  schemaVersion: typeof COGNITIVE_SPINE_SNAPSHOT_SCHEMA_VERSION;

  eventRefs: string[];
  evidenceRefs: string[];
  hypothesisRefs: string[];
  memoryRefs: string[];
  decisionRefs: string[];
  contradictionRefs: string[];
  freezeRefs: string[];
  questionRefs: string[];
  personCtRefs: string[];

  operatingMode: CognitiveSpineOperatingMode;
  temporalState: CognitiveSpineTemporalState;
  verificationDebt: CognitiveSpineVerificationDebt;
  derivedState: CognitiveSpineDerivedState;

  sourceManifest: CognitiveSpineSourceManifestEntry[];
  sourceHashes: CognitiveSpineSourceHashEntry[];
  epistemicStateRefs: string[];
  lineageRoot: string;
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
  operatingModeRef?: string | null;
  records: CognitiveSpineSourceRecord[];
};

export type CognitiveSnapshotEnvelopeInput = {
  snapshotId: string;
  createdAt: string;
  reconstructedAt?: string;
  runtimeMetadata?: Record<string, string | number | boolean | null>;
};
