import type { CognitiveSpineSourceRecord } from '../contracts/snapshot';
import {
  getCognitiveProjectionProfile,
  type CognitiveSpineProjectionProfileId,
} from './registry';
import { profileAllowsKind } from '../contracts/projectionProfile';
import {
  projectCognitiveState,
  sealCognitiveSnapshot,
  semanticSnapshotHash,
} from '../projector/cognitiveStateProjector';
import { normalizeTimestamp } from '../serialization/canonicalSerialize';
import { buildCognitiveContextConsumptionTrace } from '../trace/consumptionTrace';

export const COGNITIVE_SPINE_PROJECTOR_VERSION = 'SFI-CT-PROJECTOR-1.0' as const;
export const COGNITIVE_SPINE_POLICY_VERSION = 'SFI-CT-INVARIANTS-1.0' as const;

export type MaterializeCognitiveSpineProfileSnapshotInput = {
  records: CognitiveSpineSourceRecord[];
  sourceCutoff: string;
  executionId: string;
  createdAt: string;
  profileId: CognitiveSpineProjectionProfileId;
  consume: boolean;
  consumptionReason?: string;
};

export function selectCognitiveSpineRecordsForProfile(
  records: CognitiveSpineSourceRecord[],
  profileId: CognitiveSpineProjectionProfileId,
): CognitiveSpineSourceRecord[] {
  const profile = getCognitiveProjectionProfile(profileId);
  return records.filter((record) => profileAllowsKind(profile, record.kind));
}

/**
 * Platform-neutral profile materialization over an already reconstructed
 * canonical source plane. No database, Next.js or Vercel dependency.
 */
export function materializeCognitiveSpineProfileSnapshot(
  input: MaterializeCognitiveSpineProfileSnapshotInput,
) {
  const profile = getCognitiveProjectionProfile(input.profileId);
  if (profile.blindedByDefault && input.consume) {
    throw new Error(`COGNITIVE_SPINE_BLINDED_PROFILE_CANNOT_CONSUME:${profile.profileId}`);
  }

  const sourceCutoff = normalizeTimestamp(input.sourceCutoff);
  const createdAt = normalizeTimestamp(input.createdAt);
  const records = selectCognitiveSpineRecordsForProfile(input.records, input.profileId);

  const semanticPayload = projectCognitiveState({
    sourceCutoff,
    projectorVersion: COGNITIVE_SPINE_PROJECTOR_VERSION,
    policyVersion: COGNITIVE_SPINE_POLICY_VERSION,
    projectionProfile: profile.profileId,
    records,
  });
  const snapshotHash = semanticSnapshotHash(semanticPayload);
  const snapshot = sealCognitiveSnapshot(semanticPayload, {
    snapshotId: `CT-${snapshotHash.slice(0, 16)}`,
    createdAt,
    runtimeMetadata: {
      runner: 'cognitive-spine-profile-materializer',
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
    visibleRecordCount: records.length,
  };
}
