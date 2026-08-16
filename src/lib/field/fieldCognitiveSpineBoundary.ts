import 'server-only';

import { FIELD_BLINDED_OBSERVATION_PROFILE } from '@/core/cognitive-spine/profiles/registry';
import { materializeInstitutionalCognitiveSpineProfile } from '@/lib/institution/cognitiveSpineProfileMaterializer';

/**
 * Field T0 boundary.
 *
 * Baseline observation/cycle creation must happen before this function is
 * called. The operational Cognitive Spine is then recorded at the baseline
 * cutoff as AVAILABLE but explicitly NOT CONSUMED, preventing prior-state
 * expectations from contaminating the initial observation.
 */
export async function materializeFieldBlindedCognitiveSpineT0(input: {
  executionId: string;
  sourceCutoff: string;
  recordedAt: string;
}) {
  const materialized = await materializeInstitutionalCognitiveSpineProfile({
    sourceCutoff: input.sourceCutoff,
    executionId: input.executionId,
    createdAt: input.recordedAt,
    profileId: FIELD_BLINDED_OBSERVATION_PROFILE.profileId,
    consume: false,
  });

  return {
    contractVersion: 'SFI-FIELD-COGNITIVE-SPINE-T0-1.0' as const,
    profile: materialized.profile.profileId,
    profileVersion: materialized.profile.version,
    snapshot: materialized.snapshot,
    consumptionTrace: materialized.trace,
    sourcePlane: materialized.sourcePlane.summary,
    warnings: materialized.warnings,
    rule: 'Field baseline was captured before this boundary. Cognitive Spine was available for provenance but not consumed during T0 observation.',
  };
}
