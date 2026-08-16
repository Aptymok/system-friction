import 'server-only';

import { ATLAS_TEMPORAL_CONTEXT_PROFILE } from '@/core/cognitive-spine/profiles/registry';
import { materializeInstitutionalCognitiveSpineProfile } from '@/lib/institution/cognitiveSpineProfileMaterializer';

export const ATLAS_COGNITIVE_SPINE_CONTEXT_CONTRACT = 'SFI-ATLAS-CT-TEMPORAL-CONTEXT-1.0' as const;

/**
 * Atlas is a read-side temporal/relational consumer. It may inspect a sealed
 * institutional Cognitive Spine state, but it may not mutate canonical state,
 * upgrade epistemic class, or infer causality from relationship/sequence.
 */
export async function materializeAtlasCognitiveSpineTemporalContext(input: {
  executionId: string;
  sourceCutoff: string;
  createdAt: string;
}) {
  const materialized = await materializeInstitutionalCognitiveSpineProfile({
    sourceCutoff: input.sourceCutoff,
    executionId: input.executionId,
    createdAt: input.createdAt,
    profileId: ATLAS_TEMPORAL_CONTEXT_PROFILE.profileId,
    consume: true,
    consumptionReason: 'read-only Atlas temporal and lineage inspection',
  });
  const state = materialized.snapshot.semanticPayload;

  return {
    contractVersion: ATLAS_COGNITIVE_SPINE_CONTEXT_CONTRACT,
    snapshotId: materialized.snapshot.snapshotId,
    snapshotHash: materialized.snapshot.snapshotHash,
    sourceCutoff: state.sourceCutoff,
    projectionProfile: materialized.profile.profileId,
    profileVersion: materialized.profile.version,
    consumed: materialized.trace.ctSnapshotConsumed,
    consumptionTrace: materialized.trace,
    temporalState: state.temporalState,
    lineageRoot: state.lineageRoot,
    sourceManifest: state.sourceManifest,
    eventRefs: state.eventRefs,
    evidenceRefs: state.evidenceRefs,
    hypothesisRefs: state.hypothesisRefs,
    memoryRefs: state.memoryRefs,
    decisionRefs: state.decisionRefs,
    contradictionRefs: state.contradictionRefs,
    freezeRefs: state.freezeRefs,
    questionRefs: state.questionRefs,
    verificationDebt: state.verificationDebt,
    derivedState: state.derivedState,
    warnings: materialized.warnings,
    rule: 'Atlas reads temporal state and lineage. Relationship does not upgrade epistemic class, and temporal association is not causality. Atlas does not write canonical Cognitive Spine state by reading it.',
  };
}
