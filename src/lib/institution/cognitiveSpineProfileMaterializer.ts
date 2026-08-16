import 'server-only';

import type { CognitiveSpineProjectionProfileId } from '@/core/cognitive-spine/profiles/registry';
import { materializeCognitiveSpineProfileSnapshot } from '@/core/cognitive-spine/profiles/materializeProfile';
import { readInstitutionalCognitiveSpineSourcePlane } from './cognitiveSpineInstitutionalSourcePlane';

export type MaterializeInstitutionalCognitiveSpineProfileInput = {
  sourceCutoff: string;
  executionId: string;
  createdAt: string;
  profileId: CognitiveSpineProjectionProfileId;
  consume: boolean;
  consumptionReason?: string;
  allowedRefs?: readonly string[];
  requireAllAllowedRefs?: boolean;
};

/**
 * Node/server-worker adapter: reconstruct the canonical institutional source
 * plane, then delegate all profile selection, deterministic snapshot sealing
 * and CT AVAILABLE / CT CONSUMED semantics to the platform-neutral core.
 */
export async function materializeInstitutionalCognitiveSpineProfile(
  input: MaterializeInstitutionalCognitiveSpineProfileInput,
) {
  const sourcePlane = await readInstitutionalCognitiveSpineSourcePlane(input.sourceCutoff);
  const materialized = materializeCognitiveSpineProfileSnapshot({
    records: sourcePlane.records,
    sourceCutoff: sourcePlane.sourceCutoff,
    executionId: input.executionId,
    createdAt: input.createdAt,
    profileId: input.profileId,
    consume: input.consume,
    consumptionReason: input.consumptionReason,
    allowedRefs: input.allowedRefs,
    requireAllAllowedRefs: input.requireAllAllowedRefs,
  });

  return {
    ...materialized,
    sourcePlane,
    warnings: sourcePlane.warnings,
  };
}
