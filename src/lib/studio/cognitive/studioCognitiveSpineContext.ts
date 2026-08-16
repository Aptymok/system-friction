import 'server-only';

import { STUDIO_OBJECT_CONTEXT_PROFILE } from '@/core/cognitive-spine/profiles/registry';
import { materializeInstitutionalCognitiveSpineProfile } from '@/lib/institution/cognitiveSpineProfileMaterializer';
import { buildBoundedTwinContextFromCognitiveSpine } from '@/lib/institution/cognitiveSpineTwinContextAdapter';

/**
 * Single Studio read boundary for institutional Cognitive Spine context.
 *
 * Studio receives one sealed `STUDIO_OBJECT_CONTEXT_V1` snapshot per cognitive
 * execution. The bounded Twin context is derived only from memory/decision refs
 * present in that snapshot. No live Twin read is permitted after this boundary.
 */
export async function materializeStudioCognitiveSpineContext(input: {
  executionId: string;
  sourceCutoff: string;
  createdAt: string;
}) {
  const materialized = await materializeInstitutionalCognitiveSpineProfile({
    sourceCutoff: input.sourceCutoff,
    executionId: input.executionId,
    createdAt: input.createdAt,
    profileId: STUDIO_OBJECT_CONTEXT_PROFILE.profileId,
    consume: true,
    consumptionReason: 'bounded Studio object/session cognitive context',
  });

  const twinContext = buildBoundedTwinContextFromCognitiveSpine({
    snapshot: materialized.snapshot,
    sourcePlane: materialized.sourcePlane,
  });

  return {
    profile: materialized.profile,
    snapshot: materialized.snapshot,
    trace: materialized.trace,
    twinContext,
    warnings: materialized.warnings,
    sourcePlane: materialized.sourcePlane.summary,
  };
}
