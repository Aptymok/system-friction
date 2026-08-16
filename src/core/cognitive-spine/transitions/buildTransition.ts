import type { CognitiveSpineSnapshot } from '../contracts/snapshot';
import {
  COGNITIVE_SPINE_TRANSITION_SCHEMA_VERSION,
  type CognitiveSpineDeltaSummary,
  type CognitiveSpineSemanticTransitionPayload,
  type CognitiveSpineTransition,
  type CognitiveSpineTransitionInput,
} from '../contracts/transition';
import { semanticSnapshotHash } from '../projector/cognitiveStateProjector';
import {
  canonicalSerialize,
  canonicalSha256,
  normalizeTimestamp,
  sortedUnique,
} from '../serialization/canonicalSerialize';

type ManifestEntry = CognitiveSpineSnapshot['semanticPayload']['sourceManifest'][number];

function requireNonEmpty(value: string, label: string): string {
  if (!value || value.trim() !== value) {
    throw new Error(`COGNITIVE_SPINE_INVALID_${label}:${JSON.stringify(value)}`);
  }
  return value;
}

function assertSnapshotIntegrity(snapshot: CognitiveSpineSnapshot) {
  const calculated = semanticSnapshotHash(snapshot.semanticPayload);
  if (calculated !== snapshot.snapshotHash) {
    throw new Error(`COGNITIVE_SPINE_SNAPSHOT_HASH_MISMATCH:${snapshot.snapshotId}`);
  }
}

function toMap(entries: ManifestEntry[]): Map<string, ManifestEntry> {
  return new Map(entries.map((entry) => [entry.ref, entry]));
}

function setDelta(before: string[], after: string[]): Pick<CognitiveSpineDeltaSummary, 'addedRefs' | 'removedRefs'> {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  return {
    addedRefs: sortedUnique(after.filter((ref) => !beforeSet.has(ref))),
    removedRefs: sortedUnique(before.filter((ref) => !afterSet.has(ref))),
  };
}

function unchangedCritical(
  requested: string[],
  before: Map<string, ManifestEntry>,
  after: Map<string, ManifestEntry>,
): string[] {
  return sortedUnique(requested.filter((ref) => {
    const left = before.get(ref);
    const right = after.get(ref);
    return Boolean(left && right && canonicalSerialize(left) === canonicalSerialize(right));
  }));
}

function sourceDelta(
  before: Map<string, ManifestEntry>,
  after: Map<string, ManifestEntry>,
  critical: string[],
): CognitiveSpineDeltaSummary {
  const beforeRefs = [...before.keys()];
  const afterRefs = [...after.keys()];
  const membership = setDelta(beforeRefs, afterRefs);
  const changedRefs = sortedUnique(beforeRefs.filter((ref) => {
    const left = before.get(ref);
    const right = after.get(ref);
    return Boolean(left && right && left.sourceHash !== right.sourceHash);
  }));
  return {
    changed: membership.addedRefs.length > 0 || membership.removedRefs.length > 0 || changedRefs.length > 0,
    ...membership,
    changedRefs,
    unchangedCriticalRefs: unchangedCritical(critical, before, after),
  };
}

function epistemicSignature(entry: ManifestEntry) {
  return {
    epistemicAssessmentRef: entry.epistemicAssessmentRef,
    epistemicClass: entry.epistemicClass,
    ancestryRoots: entry.ancestryRoots,
    invalidated: entry.invalidated,
    debtType: entry.debtType,
  };
}

function epistemicDelta(
  before: Map<string, ManifestEntry>,
  after: Map<string, ManifestEntry>,
  critical: string[],
): CognitiveSpineDeltaSummary {
  const sharedRefs = [...before.keys()].filter((ref) => after.has(ref));
  const changedRefs = sortedUnique(sharedRefs.filter((ref) => {
    const left = before.get(ref);
    const right = after.get(ref);
    return Boolean(left && right && canonicalSerialize(epistemicSignature(left)) !== canonicalSerialize(epistemicSignature(right)));
  }));
  const membership = setDelta([...before.keys()], [...after.keys()]);
  const assessmentRelevantAdded = membership.addedRefs.filter((ref) => Boolean(after.get(ref)?.epistemicAssessmentRef));
  const assessmentRelevantRemoved = membership.removedRefs.filter((ref) => Boolean(before.get(ref)?.epistemicAssessmentRef));

  return {
    changed: changedRefs.length > 0 || assessmentRelevantAdded.length > 0 || assessmentRelevantRemoved.length > 0,
    addedRefs: sortedUnique(assessmentRelevantAdded),
    removedRefs: sortedUnique(assessmentRelevantRemoved),
    changedRefs,
    unchangedCriticalRefs: unchangedCritical(critical, before, after),
  };
}

function governanceRefs(snapshot: CognitiveSpineSnapshot): string[] {
  return sortedUnique([
    ...snapshot.semanticPayload.decisionRefs,
    ...snapshot.semanticPayload.freezeRefs,
  ]);
}

function cognitiveRefs(snapshot: CognitiveSpineSnapshot): string[] {
  const state = snapshot.semanticPayload;
  return sortedUnique([
    ...state.eventRefs,
    ...state.evidenceRefs,
    ...state.hypothesisRefs,
    ...state.memoryRefs,
    ...state.decisionRefs,
    ...state.contradictionRefs,
    ...state.freezeRefs,
    ...state.questionRefs,
    ...state.personCtRefs,
  ]);
}

function refOnlyDelta(before: string[], after: string[], critical: string[]): CognitiveSpineDeltaSummary {
  const membership = setDelta(before, after);
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  return {
    changed: membership.addedRefs.length > 0 || membership.removedRefs.length > 0,
    ...membership,
    changedRefs: [],
    unchangedCriticalRefs: sortedUnique(critical.filter((ref) => beforeSet.has(ref) && afterSet.has(ref))),
  };
}

export function buildSemanticTransitionPayload(
  from: CognitiveSpineSnapshot,
  to: CognitiveSpineSnapshot,
  input: Pick<CognitiveSpineTransitionInput, 'transitionInputs' | 'admittedEpistemicRefs' | 'unchangedCriticalRefs'>,
): CognitiveSpineSemanticTransitionPayload {
  assertSnapshotIntegrity(from);
  assertSnapshotIntegrity(to);

  const critical = sortedUnique(input.unchangedCriticalRefs ?? []);
  const beforeManifest = toMap(from.semanticPayload.sourceManifest);
  const afterManifest = toMap(to.semanticPayload.sourceManifest);
  const source = sourceDelta(beforeManifest, afterManifest, critical);
  const epistemic = epistemicDelta(beforeManifest, afterManifest, critical);
  const cognitiveMembership = refOnlyDelta(cognitiveRefs(from), cognitiveRefs(to), critical);
  const governance = refOnlyDelta(governanceRefs(from), governanceRefs(to), critical);
  const cognitiveChanged = from.snapshotHash !== to.snapshotHash;

  return {
    schemaVersion: COGNITIVE_SPINE_TRANSITION_SCHEMA_VERSION,
    fromSnapshotHash: from.snapshotHash,
    toSnapshotHash: to.snapshotHash,
    transitionInputs: sortedUnique(input.transitionInputs),
    admittedEpistemicRefs: sortedUnique(input.admittedEpistemicRefs),
    sourceDelta: source,
    epistemicDelta: epistemic,
    cognitiveStateDelta: {
      ...cognitiveMembership,
      changed: cognitiveChanged,
      changedRefs: sortedUnique([
        ...source.changedRefs,
        ...epistemic.changedRefs,
      ]),
    },
    governanceDelta: governance,
    projectorVersion: to.semanticPayload.projectorVersion,
    policyVersion: to.semanticPayload.policyVersion,
    snapshotSchemaVersion: to.semanticPayload.schemaVersion,
  };
}

export function buildCognitiveSpineTransition(
  from: CognitiveSpineSnapshot,
  to: CognitiveSpineSnapshot,
  input: CognitiveSpineTransitionInput,
): CognitiveSpineTransition {
  const semanticPayload = buildSemanticTransitionPayload(from, to, input);
  return {
    transitionId: requireNonEmpty(input.transitionId, 'TRANSITION_ID'),
    createdAt: normalizeTimestamp(input.createdAt),
    semanticPayload,
    transitionHash: canonicalSha256(semanticPayload),
    ...(input.runtimeMetadata ? { runtimeMetadata: input.runtimeMetadata } : {}),
  };
}
