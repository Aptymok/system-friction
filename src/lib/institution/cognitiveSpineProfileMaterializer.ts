import 'server-only';

import type { CognitiveSpineSourceRecord } from '@/core/cognitive-spine/contracts/snapshot';
import {
  getCognitiveProjectionProfile,
  type CognitiveSpineProjectionProfileId,
} from '@/core/cognitive-spine/profiles/registry';
import { profileAllowsKind } from '@/core/cognitive-spine/contracts/projectionProfile';
import {
  projectCognitiveState,
  sealCognitiveSnapshot,
  semanticSnapshotHash,
} from '@/core/cognitive-spine/projector/cognitiveStateProjector';
import { normalizeTimestamp } from '@/core/cognitive-spine/serialization/canonicalSerialize';
import { buildCognitiveContextConsumptionTrace } from '@/core/cognitive-spine/trace/consumptionTrace';
import {
  readInstitutionalCognitiveSpineSourcePlane,
  type InstitutionalCognitiveSpineSourcePlane,
} from './cognitiveSpineInstitutionalSourcePlane';

const PROJECTOR_VERSION = 'SFI-CT-PROJECTOR-1.0';
const POLICY_VERSION = 'SFI-CT-INVARIANTS-1.0';

function visibleRecordsForProfile(
  sourcePlane: InstitutionalCognitiveSpineSourcePlane,
  profileId: CognitiveSpineProjectionProfileId,
): CognitiveSpineSourceRecord[] {
  const profile = getCognitiveProjectionProfile(profileId);
  return sourcePlane.records.filter((record) => profileAllowsKind(profile, record.kind));
}

export type MaterializeInstitutionalCognitiveSpineProfileInput = {
  sourceCutoff: string;
  executionId: string;
  createdAt: string;
  profileId: CognitiveSpineProjectionProfileId;
  consume: boolean;
  consumptionReason?: string;
};

/**
 * Generic institutional Cognitive Spine snapshot materializer.
 *
 * Responsibilities:
 * - read one canonical source plane at an exact temporal cutoff;
 * - apply a frozen visibility profile by ref kind;
 * - deterministically materialize and seal the profile snapshot;
 * - record CT AVAILABLE / CT CONSUMED explicitly.
 *
 * It does not build surface-specific prompts or execution context. Surface
 * adapters consume the sealed result after this boundary.
 */
export async function materializeInstitutionalCognitiveSpineProfile(
  input: MaterializeInstitutionalCognitiveSpineProfileInput,
) {
  const profile = getCognitiveProjectionProfile(input.profileId);
  if (profile.blindedByDefault && input.consume) {
    throw new Error(`COGNITIVE_SPINE_BLINDED_PROFILE_CANNOT_CONSUME:${profile.profileId}`);
  }

  const sourceCutoff = normalizeTimestamp(input.sourceCutoff);
  const createdAt = normalizeTimestamp(input.createdAt);
  const sourcePlane = await readInstitutionalCognitiveSpineSourcePlane(sourceCutoff);
  const records = visibleRecordsForProfile(sourcePlane, input.profileId);

  const semanticPayload = projectCognitiveState({
    sourceCutoff,
    projectorVersion: PROJECTOR_VERSION,
    policyVersion: POLICY_VERSION,
    projectionProfile: profile.profileId,
    records,
  });
  const snapshotHash = semanticSnapshotHash(semanticPayload);
  const snapshot = sealCognitiveSnapshot(semanticPayload, {
    snapshotId: `CT-${snapshotHash.slice(0, 16)}`,
    createdAt,
    runtimeMetadata: {
      runner: 'institutional-cognitive-spine-profile-materializer',
      surface: profile.surface,
    },
  });

  const trace = buildCognitiveContextConsumptionTrace({
    executionId: input.executionId,
    ctSnapshotAvailable: snapshot.snapshotId,
    ctSnapshotHashAvailable: snapshot.snapshotHash,
    ctSnapshotConsumed: input.consume,
    ...(input.consume ? {
      consumedSnapshotId: snapshot.snapshotId,
      consumedSnapshotHash: snapshot.snapshotHash,
      projectionProfile: profile.profileId,
      profileVersion: profile.version,
      consumptionReason: input.consumptionReason ?? `bounded ${profile.surface.toLowerCase()} Cognitive Spine context`,
    } : {}),
    blindedObservation: profile.blindedByDefault,
    recordedAt: createdAt,
  });

  return {
    profile,
    snapshot,
    trace,
    sourcePlane,
    visibleRecordCount: records.length,
    warnings: sourcePlane.warnings,
  };
}
