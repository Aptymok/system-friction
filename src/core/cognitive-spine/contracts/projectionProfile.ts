import type { CognitiveSpineRefKind } from './snapshot';

export const COGNITIVE_SPINE_PROJECTION_PROFILE_CONTRACT_VERSION = 'SFI-CT-PROJECTION-PROFILE-1.0' as const;

export type CognitiveProjectionSurface =
  | 'ROOT'
  | 'FIELD'
  | 'STUDIO'
  | 'LAB'
  | 'WORLDSPECT'
  | 'ATLAS'
  | 'LIBRARY'
  | 'COGNITIVE_RUNTIME';

/**
 * Semantic visibility configuration over an already-sealed Cognitive Spine
 * snapshot. A projection profile does not create evidence, alter epistemic
 * class, mutate the snapshot, or grant authority to its consumer.
 */
export type CognitiveProjectionProfile = {
  contractVersion: typeof COGNITIVE_SPINE_PROJECTION_PROFILE_CONTRACT_VERSION;
  profileId: string;
  version: string;
  surface: CognitiveProjectionSurface;
  allowedRefKinds: readonly CognitiveSpineRefKind[];
  deniedRefKinds: readonly CognitiveSpineRefKind[];
  fieldVisibilityRules: Readonly<Record<string, unknown>>;
  blindedByDefault: boolean;
  purpose: string;
};

export function profileAllowsKind(
  profile: CognitiveProjectionProfile,
  kind: CognitiveSpineRefKind,
): boolean {
  return profile.allowedRefKinds.includes(kind) && !profile.deniedRefKinds.includes(kind);
}

export function assertProjectionProfileContract(profile: CognitiveProjectionProfile): CognitiveProjectionProfile {
  if (!profile.profileId.trim()) throw new Error('COGNITIVE_SPINE_PROFILE_ID_REQUIRED');
  if (!profile.version.trim()) throw new Error('COGNITIVE_SPINE_PROFILE_VERSION_REQUIRED');
  if (!profile.purpose.trim()) throw new Error('COGNITIVE_SPINE_PROFILE_PURPOSE_REQUIRED');

  const overlap = profile.allowedRefKinds.filter((kind) => profile.deniedRefKinds.includes(kind));
  if (overlap.length) {
    throw new Error(`COGNITIVE_SPINE_PROFILE_ALLOW_DENY_OVERLAP:${profile.profileId}:${overlap.join(',')}`);
  }

  if (profile.blindedByDefault && profile.allowedRefKinds.length > 0) {
    throw new Error(`COGNITIVE_SPINE_BLINDED_PROFILE_EXPOSES_REFS:${profile.profileId}`);
  }

  return profile;
}
