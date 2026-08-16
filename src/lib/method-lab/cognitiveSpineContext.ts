import 'server-only';

import { LAB_EXPERIMENT_CONTEXT_PROFILE } from '@/core/cognitive-spine/profiles/registry';
import { sortedUnique } from '@/core/cognitive-spine/serialization/canonicalSerialize';
import { materializeInstitutionalCognitiveSpineProfile } from '@/lib/institution/cognitiveSpineProfileMaterializer';
import { buildBoundedTwinContextFromCognitiveSpine } from '@/lib/institution/cognitiveSpineTwinContextAdapter';

export const METHOD_LAB_COGNITIVE_SPINE_CONTEXT_CONTRACT = 'SFI-METHOD-LAB-CT-CONTEXT-1.0' as const;

/**
 * Materializes the institutional Cognitive Spine available at experiment start.
 *
 * No explicit allowlist => state may be recorded as AVAILABLE but is NOT
 * consumed by the experiment. An explicit allowlist => only those exact refs
 * may enter the sealed experimental context and every ref must resolve at the
 * declared cutoff. Missing/hidden refs fail closed.
 */
export async function materializeMethodLabCognitiveSpineContext(input: {
  labRunId: string;
  sourceCutoff: string;
  createdAt: string;
  contextRefs?: readonly string[];
}) {
  const contextRefs = sortedUnique([...(input.contextRefs ?? [])]);
  const consume = contextRefs.length > 0;
  const materialized = await materializeInstitutionalCognitiveSpineProfile({
    sourceCutoff: input.sourceCutoff,
    executionId: input.labRunId,
    createdAt: input.createdAt,
    profileId: LAB_EXPERIMENT_CONTEXT_PROFILE.profileId,
    consume,
    consumptionReason: consume ? 'protocol-allowlisted Method Lab experimental context' : undefined,
    ...(consume ? {
      allowedRefs: contextRefs,
      requireAllAllowedRefs: true,
    } : {}),
  });

  const twinContext = consume
    ? buildBoundedTwinContextFromCognitiveSpine({
        snapshot: materialized.snapshot,
        sourcePlane: materialized.sourcePlane,
      })
    : null;

  return {
    contractVersion: METHOD_LAB_COGNITIVE_SPINE_CONTEXT_CONTRACT,
    requestedContextRefs: contextRefs,
    consumed: materialized.trace.ctSnapshotConsumed,
    profile: materialized.profile.profileId,
    profileVersion: materialized.profile.version,
    snapshot: materialized.snapshot,
    consumptionTrace: materialized.trace,
    visibleRefs: materialized.snapshot.semanticPayload.sourceManifest.map((item) => item.ref),
    twinContext,
    sourcePlane: materialized.sourcePlane.summary,
    warnings: materialized.warnings,
    rule: consume
      ? 'Only protocol-allowlisted Cognitive Spine refs are available to this Method Lab execution. Context remains distinct from evidence and simulation output remains SIMULATED.'
      : 'Operational Cognitive Spine state is available for provenance only and is not consumed because no protocol context allowlist was supplied.',
  };
}
