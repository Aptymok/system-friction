import 'server-only';

import { ROOT_GOVERNANCE_CONTEXT_PROFILE } from '@/core/cognitive-spine/profiles/registry';
import { materializeInstitutionalCognitiveSpineProfile } from '@/lib/institution/cognitiveSpineProfileMaterializer';
import { buildBoundedTwinContextFromCognitiveSpine } from '@/lib/institution/cognitiveSpineTwinContextAdapter';

/**
 * ROOT deliberation context boundary.
 *
 * ROOT receives one sealed institutional snapshot under the frozen governance
 * profile. The snapshot may inform governance, but neither this adapter nor
 * ROOT authority can upgrade evidence, create independence, or alter truth.
 */
export async function materializeRootCognitiveSpineContext(input: {
  executionId: string;
  sourceCutoff: string;
  createdAt: string;
}) {
  const materialized = await materializeInstitutionalCognitiveSpineProfile({
    sourceCutoff: input.sourceCutoff,
    executionId: input.executionId,
    createdAt: input.createdAt,
    profileId: ROOT_GOVERNANCE_CONTEXT_PROFILE.profileId,
    consume: true,
    consumptionReason: 'bounded ROOT governance deliberation context',
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
