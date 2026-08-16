import 'server-only';

import { ATLAS_TEMPORAL_CONTEXT_PROFILE } from '@/core/cognitive-spine/profiles/registry';
import { materializeInstitutionalCognitiveSpineProfile } from '@/lib/institution/cognitiveSpineProfileMaterializer';

export const ATLAS_COGNITIVE_SPINE_CONTEXT_CONTRACT = 'SFI-ATLAS-CT-TEMPORAL-CONTEXT-1.0' as const;

/**
 * Atlas is a read-side temporal/relational consumer. It may inspect a sealed
 * institutional Cognitive Spine state, but it may not mutate canonical state,
 * upgrade epistemic class, or infer causality from relationship/sequence.
 *
 * The current Atlas memory API is not a ROOT-private surface, so this adapter
 * deliberately exposes only semantic identity and aggregate temporal state.
 * Canonical source refs, memory refs and decision refs remain internal.
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
    verificationDebt: state.verificationDebt,
    sourceCounts: {
      total: state.derivedState.sourceCount,
      events: state.eventRefs.length,
      evidence: state.evidenceRefs.length,
      hypotheses: state.hypothesisRefs.length,
      memory: state.memoryRefs.length,
      decisions: state.decisionRefs.length,
      contradictions: state.contradictionRefs.length,
      freezes: state.freezeRefs.length,
      questions: state.questionRefs.length,
    },
    warnings: materialized.warnings,
    internalRefsExposed: false as const,
    rule: 'Atlas reads aggregate temporal state and lineage identity. Relationship does not upgrade epistemic class, temporal association is not causality, and internal institutional refs are not exposed by this non-ROOT surface.',
  };
}
