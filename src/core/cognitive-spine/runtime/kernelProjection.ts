import type { StudioTwinContext } from '@/core/cognitive-twin/studioContext';
import type { CognitiveContextConsumptionTrace } from '../contracts/consumptionTrace';
import type { CognitiveSpineSnapshot } from '../contracts/snapshot';

export type RuntimeCognitiveSpineProjection = {
  snapshotId: string;
  snapshotHash: string;
  sourceCutoff: string;
  projectorVersion: string;
  policyVersion: string;
  projectionProfile: string;
  profileVersion: string | null;
  ctSnapshotAvailable: boolean;
  ctSnapshotConsumed: boolean;
  consumptionReason: string | null;

  eventRefs: string[];
  evidenceRefs: string[];
  hypothesisRefs: string[];
  memoryRefs: string[];
  decisionRefs: string[];
  contradictionRefs: string[];
  freezeRefs: string[];
  questionRefs: string[];
  epistemicStateRefs: string[];

  lineageRoot: string;
  verificationDebt: CognitiveSpineSnapshot['semanticPayload']['verificationDebt'];
  derivedState: CognitiveSpineSnapshot['semanticPayload']['derivedState'];

  /**
   * Frozen content resolved during the same materialization as snapshot refs.
   * Memory and decisions remain context, never KernelEvidence by inheritance.
   */
  cognitiveTwinContext: StudioTwinContext | null;
};

export function buildRuntimeCognitiveSpineProjection(input: {
  snapshot: CognitiveSpineSnapshot;
  trace: CognitiveContextConsumptionTrace;
  cognitiveTwinContext: StudioTwinContext;
}): RuntimeCognitiveSpineProjection {
  const { snapshot, trace } = input;

  if (trace.ctSnapshotAvailable !== snapshot.snapshotId || trace.ctSnapshotHashAvailable !== snapshot.snapshotHash) {
    throw new Error('COGNITIVE_SPINE_RUNTIME_AVAILABLE_SNAPSHOT_MISMATCH');
  }

  if (trace.ctSnapshotConsumed) {
    if (trace.consumedSnapshotId !== snapshot.snapshotId || trace.consumedSnapshotHash !== snapshot.snapshotHash) {
      throw new Error('COGNITIVE_SPINE_RUNTIME_CONSUMED_SNAPSHOT_MISMATCH');
    }
    if (trace.projectionProfile !== snapshot.semanticPayload.projectionProfile) {
      throw new Error('COGNITIVE_SPINE_RUNTIME_PROFILE_MISMATCH');
    }
  }

  const state = snapshot.semanticPayload;
  return {
    snapshotId: snapshot.snapshotId,
    snapshotHash: snapshot.snapshotHash,
    sourceCutoff: state.sourceCutoff,
    projectorVersion: state.projectorVersion,
    policyVersion: state.policyVersion,
    projectionProfile: state.projectionProfile,
    profileVersion: trace.profileVersion,
    ctSnapshotAvailable: true,
    ctSnapshotConsumed: trace.ctSnapshotConsumed,
    consumptionReason: trace.consumptionReason,
    eventRefs: [...state.eventRefs],
    evidenceRefs: [...state.evidenceRefs],
    hypothesisRefs: [...state.hypothesisRefs],
    memoryRefs: [...state.memoryRefs],
    decisionRefs: [...state.decisionRefs],
    contradictionRefs: [...state.contradictionRefs],
    freezeRefs: [...state.freezeRefs],
    questionRefs: [...state.questionRefs],
    epistemicStateRefs: [...state.epistemicStateRefs],
    lineageRoot: state.lineageRoot,
    verificationDebt: state.verificationDebt,
    derivedState: state.derivedState,
    cognitiveTwinContext: trace.ctSnapshotConsumed ? input.cognitiveTwinContext : null,
  };
}
