import 'server-only';

import { LAB_BLINDED_PROFILE } from '@/core/cognitive-spine/profiles/registry';
import { materializeInstitutionalCognitiveSpineProfile } from '@/lib/institution/cognitiveSpineProfileMaterializer';

/**
 * Decision Transfer isolation boundary.
 *
 * The operational institutional Cognitive Spine may exist while an experiment
 * runs, but it is never consumed by a Decision Transfer arm. The experimental
 * context remains the separately frozen Decision Transfer context.
 *
 * This materialization can be performed after the model run using the exact
 * run-start cutoff, so observation of operational SFI-CT availability cannot
 * alter model inputs or experiment latency/availability requirements.
 */
export async function materializeDecisionTransferOperationalSpineBoundary(input: {
  executionId: string;
  runStartCutoff: string;
  recordedAt: string;
}) {
  const materialized = await materializeInstitutionalCognitiveSpineProfile({
    sourceCutoff: input.runStartCutoff,
    executionId: input.executionId,
    createdAt: input.recordedAt,
    profileId: LAB_BLINDED_PROFILE.profileId,
    consume: false,
  });

  return {
    contractVersion: 'SFI-DT-OPERATIONAL-SPINE-BOUNDARY-1.0' as const,
    operationalSfiCtAvailable: true as const,
    operationalSfiCtConsumed: false as const,
    profile: materialized.profile.profileId,
    profileVersion: materialized.profile.version,
    sourceCutoff: materialized.snapshot.semanticPayload.sourceCutoff,
    snapshotId: materialized.snapshot.snapshotId,
    snapshotHash: materialized.snapshot.snapshotHash,
    visibleRecordCount: materialized.visibleRecordCount,
    sourcePlane: materialized.sourcePlane.summary,
    warnings: materialized.warnings,
    rule: 'Operational SFI-CT is recorded as available but unconsumed. Decision Transfer arms use only their separately frozen experimental context.',
  };
}
