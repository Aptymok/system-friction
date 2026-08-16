import {
  COGNITIVE_SPINE_SNAPSHOT_SCHEMA_VERSION,
  type CognitiveDebtType,
  type CognitiveSnapshotEnvelopeInput,
  type CognitiveSpineRefKind,
  type CognitiveSpineSemanticPayload,
  type CognitiveSpineSnapshot,
  type CognitiveSpineSourceRecord,
  type CognitiveStateProjectionInput,
} from '../contracts/snapshot';
import {
  canonicalSerialize,
  canonicalSha256,
  normalizeTimestamp,
  sortedUnique,
} from '../serialization/canonicalSerialize';

const DEBT_TYPES: CognitiveDebtType[] = [
  'VERIFICATION',
  'CONTRADICTION',
  'RETURN',
  'PROVENANCE',
  'EXPERIMENTAL',
  'STALE_KNOWLEDGE',
];

type RefBucketKey =
  | 'eventRefs'
  | 'evidenceRefs'
  | 'hypothesisRefs'
  | 'memoryRefs'
  | 'decisionRefs'
  | 'contradictionRefs'
  | 'freezeRefs'
  | 'questionRefs'
  | 'personCtRefs';

const REF_FIELD_BY_KIND: Record<CognitiveSpineRefKind, RefBucketKey> = {
  EVENT: 'eventRefs',
  EVIDENCE: 'evidenceRefs',
  HYPOTHESIS: 'hypothesisRefs',
  MEMORY: 'memoryRefs',
  DECISION: 'decisionRefs',
  CONTRADICTION: 'contradictionRefs',
  FREEZE: 'freezeRefs',
  QUESTION: 'questionRefs',
  PERSON_CT: 'personCtRefs',
};

function requireNonEmpty(value: string, label: string): string {
  if (!value || value.trim() !== value) {
    throw new Error(`COGNITIVE_SPINE_INVALID_${label}:${JSON.stringify(value)}`);
  }
  return value;
}

function lexicalCompare(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function normalizeRecord(record: CognitiveSpineSourceRecord): CognitiveSpineSourceRecord {
  const ref = requireNonEmpty(record.ref, 'REF');
  const sourceHash = requireNonEmpty(record.sourceHash, 'SOURCE_HASH');
  const recordedAt = normalizeTimestamp(record.recordedAt);
  const epistemicAssessmentRef = record.epistemicAssessmentRef === undefined
    ? undefined
    : requireNonEmpty(record.epistemicAssessmentRef, 'ASSESSMENT_REF');

  if (record.kind === 'EVIDENCE' && (!epistemicAssessmentRef || !record.epistemicClass)) {
    throw new Error(`COGNITIVE_SPINE_UNASSESSED_EVIDENCE:${ref}`);
  }

  return {
    ref,
    kind: record.kind,
    recordedAt,
    sourceHash,
    epistemicAssessmentRef,
    epistemicClass: record.epistemicClass,
    ancestryRoots: sortedUnique(record.ancestryRoots ?? []),
    visibilityProfiles: sortedUnique(record.visibilityProfiles ?? []),
    invalidated: Boolean(record.invalidated || record.epistemicClass === 'INVALIDATED'),
    debtType: record.debtType,
  };
}

/**
 * Canonical comparison payload for duplicate source refs. Optional fields are
 * represented explicitly as null so the strict semantic serializer never has
 * to silently discard undefined values.
 */
function deduplicationSignature(record: CognitiveSpineSourceRecord) {
  return {
    ref: record.ref,
    kind: record.kind,
    recordedAt: record.recordedAt,
    sourceHash: record.sourceHash,
    epistemicAssessmentRef: record.epistemicAssessmentRef ?? null,
    epistemicClass: record.epistemicClass ?? null,
    ancestryRoots: record.ancestryRoots ?? [],
    visibilityProfiles: record.visibilityProfiles ?? [],
    invalidated: Boolean(record.invalidated),
    debtType: record.debtType ?? null,
  };
}

function deduplicateRecords(records: CognitiveSpineSourceRecord[]): CognitiveSpineSourceRecord[] {
  const byRef = new Map<string, CognitiveSpineSourceRecord>();

  for (const rawRecord of records) {
    const record = normalizeRecord(rawRecord);
    const previous = byRef.get(record.ref);
    if (!previous) {
      byRef.set(record.ref, record);
      continue;
    }

    if (canonicalSerialize(deduplicationSignature(previous)) !== canonicalSerialize(deduplicationSignature(record))) {
      throw new Error(`COGNITIVE_SPINE_CONFLICTING_SOURCE_REF:${record.ref}`);
    }
  }

  return [...byRef.values()].sort((left, right) => {
    const kindOrder = lexicalCompare(left.kind, right.kind);
    return kindOrder !== 0 ? kindOrder : lexicalCompare(left.ref, right.ref);
  });
}

function visibleUnderProfile(record: CognitiveSpineSourceRecord, profile: string): boolean {
  const profiles = record.visibilityProfiles ?? [];
  return profiles.length === 0 || profiles.includes('*') || profiles.includes(profile);
}

function emptyDebt(): Record<CognitiveDebtType, number> {
  return {
    VERIFICATION: 0,
    CONTRADICTION: 0,
    RETURN: 0,
    PROVENANCE: 0,
    EXPERIMENTAL: 0,
    STALE_KNOWLEDGE: 0,
  };
}

/**
 * Deterministically projects already-canonical, already-assessed source records
 * into a semantic cognitive-state payload.
 *
 * This function MUST NOT create new epistemic judgments. It may only select,
 * resolve, deduplicate and summarize classifications supplied by the preceding
 * epistemic relation/policy plane.
 */
export function projectCognitiveState(input: CognitiveStateProjectionInput): CognitiveSpineSemanticPayload {
  const sourceCutoff = normalizeTimestamp(input.sourceCutoff);
  const projectorVersion = requireNonEmpty(input.projectorVersion, 'PROJECTOR_VERSION');
  const policyVersion = requireNonEmpty(input.policyVersion, 'POLICY_VERSION');
  const projectionProfile = requireNonEmpty(input.projectionProfile, 'PROJECTION_PROFILE');

  const records = deduplicateRecords(input.records)
    .filter((record) => record.recordedAt <= sourceCutoff)
    .filter((record) => visibleUnderProfile(record, projectionProfile));

  const refBuckets: Record<RefBucketKey, string[]> = {
    eventRefs: [],
    evidenceRefs: [],
    hypothesisRefs: [],
    memoryRefs: [],
    decisionRefs: [],
    contradictionRefs: [],
    freezeRefs: [],
    questionRefs: [],
    personCtRefs: [],
  };

  const debt = emptyDebt();
  for (const record of records) {
    refBuckets[REF_FIELD_BY_KIND[record.kind]].push(record.ref);
    if (record.debtType) debt[record.debtType] += 1;
  }

  for (const debtType of DEBT_TYPES) {
    debt[debtType] = Math.max(0, debt[debtType]);
  }

  const lineageRoots = sortedUnique(records.flatMap((record) => record.ancestryRoots ?? []));
  const epistemicAssessmentRefs = sortedUnique(records
    .map((record) => record.epistemicAssessmentRef)
    .filter((value): value is string => Boolean(value)));

  const sourceManifest = records.map((record) => ({
    ref: record.ref,
    kind: record.kind,
    sourceHash: record.sourceHash,
    epistemicAssessmentRef: record.epistemicAssessmentRef ?? null,
    epistemicClass: record.epistemicClass ?? null,
    ancestryRoots: sortedUnique(record.ancestryRoots ?? []),
    invalidated: Boolean(record.invalidated),
    debtType: record.debtType ?? null,
  }));

  return {
    schemaVersion: COGNITIVE_SPINE_SNAPSHOT_SCHEMA_VERSION,
    sourceCutoff,
    projectorVersion,
    policyVersion,
    projectionProfile,
    eventRefs: sortedUnique(refBuckets.eventRefs),
    evidenceRefs: sortedUnique(refBuckets.evidenceRefs),
    hypothesisRefs: sortedUnique(refBuckets.hypothesisRefs),
    memoryRefs: sortedUnique(refBuckets.memoryRefs),
    decisionRefs: sortedUnique(refBuckets.decisionRefs),
    contradictionRefs: sortedUnique(refBuckets.contradictionRefs),
    freezeRefs: sortedUnique(refBuckets.freezeRefs),
    questionRefs: sortedUnique(refBuckets.questionRefs),
    personCtRefs: sortedUnique(refBuckets.personCtRefs),
    epistemicAssessmentRefs,
    sourceManifest,
    derivedState: {
      sourceCount: records.length,
      assessedSourceCount: records.filter((record) => Boolean(record.epistemicAssessmentRef)).length,
      invalidatedSourceCount: records.filter((record) => Boolean(record.invalidated)).length,
      independentLineageRootCount: lineageRoots.length,
      contradictionCount: refBuckets.contradictionRefs.length,
      questionCount: refBuckets.questionRefs.length,
      debt,
    },
    lineageRoots,
  };
}

export function semanticSnapshotHash(payload: CognitiveSpineSemanticPayload): string {
  return canonicalSha256(payload);
}

export function sealCognitiveSnapshot(
  semanticPayload: CognitiveSpineSemanticPayload,
  envelope: CognitiveSnapshotEnvelopeInput,
): CognitiveSpineSnapshot {
  return {
    snapshotId: requireNonEmpty(envelope.snapshotId, 'SNAPSHOT_ID'),
    createdAt: normalizeTimestamp(envelope.createdAt),
    ...(envelope.reconstructedAt ? { reconstructedAt: normalizeTimestamp(envelope.reconstructedAt) } : {}),
    semanticPayload,
    snapshotHash: semanticSnapshotHash(semanticPayload),
    ...(envelope.runtimeMetadata ? { runtimeMetadata: envelope.runtimeMetadata } : {}),
  };
}

export function materializeCognitiveSnapshot(
  input: CognitiveStateProjectionInput,
  envelope: CognitiveSnapshotEnvelopeInput,
): CognitiveSpineSnapshot {
  return sealCognitiveSnapshot(projectCognitiveState(input), envelope);
}
