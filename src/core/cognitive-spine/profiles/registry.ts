import type { CognitiveSpineRefKind } from '../contracts/snapshot';
import {
  COGNITIVE_SPINE_PROJECTION_PROFILE_CONTRACT_VERSION,
  assertProjectionProfileContract,
  type CognitiveProjectionProfile,
} from '../contracts/projectionProfile';
import { RUNTIME_GENERAL_CONTEXT_PROFILE } from './runtimeGeneral';

export const ALL_COGNITIVE_SPINE_REF_KINDS = [
  'EVENT',
  'EVIDENCE',
  'HYPOTHESIS',
  'MEMORY',
  'DECISION',
  'CONTRADICTION',
  'FREEZE',
  'QUESTION',
  'PERSON_CT',
] as const satisfies readonly CognitiveSpineRefKind[];

export const INSTITUTIONAL_NON_PERSON_REF_KINDS = [
  'EVENT',
  'EVIDENCE',
  'HYPOTHESIS',
  'MEMORY',
  'DECISION',
  'CONTRADICTION',
  'FREEZE',
  'QUESTION',
] as const satisfies readonly CognitiveSpineRefKind[];

function institutionalProfile(input: Omit<CognitiveProjectionProfile,
  'contractVersion' | 'allowedRefKinds' | 'deniedRefKinds'> & {
    allowedRefKinds?: readonly CognitiveSpineRefKind[];
    deniedRefKinds?: readonly CognitiveSpineRefKind[];
  }): CognitiveProjectionProfile {
  return assertProjectionProfileContract({
    contractVersion: COGNITIVE_SPINE_PROJECTION_PROFILE_CONTRACT_VERSION,
    allowedRefKinds: input.allowedRefKinds ?? INSTITUTIONAL_NON_PERSON_REF_KINDS,
    deniedRefKinds: input.deniedRefKinds ?? ['PERSON_CT'],
    ...input,
  });
}

export const ROOT_GOVERNANCE_CONTEXT_PROFILE = institutionalProfile({
  profileId: 'ROOT_GOVERNANCE_CONTEXT_V1',
  version: '1.0',
  surface: 'ROOT',
  fieldVisibilityRules: {
    governanceAuthorityDoesNotUpgradeEpistemicClass: true,
    decisionsRemainGovernanceRecords: true,
    provenanceAndUncertaintyRemainVisible: true,
  },
  blindedByDefault: false,
  purpose: 'Provide governed institutional context for ROOT deliberation without granting ROOT authority over truth or epistemic class.',
});

export const FIELD_CASE_CONTEXT_PROFILE = institutionalProfile({
  profileId: 'FIELD_CASE_CONTEXT_V1',
  version: '1.0',
  surface: 'FIELD',
  fieldVisibilityRules: {
    caseRelevanceRequired: true,
    priorContextIsNotObservation: true,
    blindedAlternativeMustRemainAvailable: true,
  },
  blindedByDefault: false,
  purpose: 'Expose only case-relevant prior institutional context when prior knowledge is operationally justified.',
});

export const FIELD_BLINDED_OBSERVATION_PROFILE = institutionalProfile({
  profileId: 'FIELD_BLINDED_OBSERVATION_V1',
  version: '1.0',
  surface: 'FIELD',
  allowedRefKinds: [],
  deniedRefKinds: ALL_COGNITIVE_SPINE_REF_KINDS,
  fieldVisibilityRules: {
    snapshotMayBeAvailableForProvenance: true,
    contextExposure: 'DENIED',
    expectationContaminationGuard: true,
  },
  blindedByDefault: true,
  purpose: 'Prevent prior Cognitive Spine context from influencing Field capture where expectation contamination is a methodological risk.',
});

export const STUDIO_OBJECT_CONTEXT_PROFILE = institutionalProfile({
  profileId: 'STUDIO_OBJECT_CONTEXT_V1',
  version: '1.0',
  surface: 'STUDIO',
  fieldVisibilityRules: {
    objectRelevanceRequired: true,
    versionHistoryVisible: true,
    decisionsRemainContextNotTruth: true,
  },
  blindedByDefault: false,
  purpose: 'Expose object-specific temporal history, decisions, approved relevant memory and provenance without granting Studio institutional epistemic authority.',
});

export const LAB_EXPERIMENT_CONTEXT_PROFILE = institutionalProfile({
  profileId: 'LAB_EXPERIMENT_CONTEXT_V1',
  version: '1.0',
  surface: 'LAB',
  fieldVisibilityRules: {
    protocolAllowlistRequired: true,
    exactSnapshotHashRequired: true,
    sourceCutoffRequired: true,
    projectorPolicySchemaProfileVersionsRequired: true,
    liveCtAdvancementDuringFrozenRun: 'DENIED',
  },
  blindedByDefault: false,
  purpose: 'Expose only context explicitly permitted by an experimental protocol and bind frozen runs to an exact sealed Cognitive Spine state.',
});

export const LAB_BLINDED_PROFILE = institutionalProfile({
  profileId: 'LAB_BLINDED_V1',
  version: '1.0',
  surface: 'LAB',
  allowedRefKinds: [],
  deniedRefKinds: ALL_COGNITIVE_SPINE_REF_KINDS,
  fieldVisibilityRules: {
    snapshotMayBeAvailableForProvenance: true,
    contextExposure: 'DENIED',
    protocolBlindnessRequired: true,
  },
  blindedByDefault: true,
  purpose: 'Execute an experimental arm without Cognitive Spine context while preserving that an operational CT state existed but was not consumed.',
});

export const WORLDSPECT_CONTEXT_PROFILE = institutionalProfile({
  profileId: 'WORLDSPECT_CONTEXT_V1',
  version: '1.0',
  surface: 'WORLDSPECT',
  fieldVisibilityRules: {
    externalObservationMustRemainIndependent: true,
    priorExpectationIsNotObservation: true,
    priorContextMayOnlyBeUsedForPostObservationContrast: true,
  },
  blindedByDefault: false,
  purpose: 'Compare external observations and signals with prior institutional state without converting expectation into observation or evidence.',
});

export const ATLAS_TEMPORAL_CONTEXT_PROFILE = institutionalProfile({
  profileId: 'ATLAS_TEMPORAL_CONTEXT_V1',
  version: '1.0',
  surface: 'ATLAS',
  fieldVisibilityRules: {
    lineageReadOnly: true,
    relationshipDoesNotUpgradeEpistemicClass: true,
    associationIsNotCausality: true,
  },
  blindedByDefault: false,
  purpose: 'Expose lineage, temporal transitions and graph relationships required to inspect trajectories without epistemic promotion.',
});

export const LIBRARY_IMPACT_CONTEXT_PROFILE = institutionalProfile({
  profileId: 'LIBRARY_IMPACT_CONTEXT_V1',
  version: '1.0',
  surface: 'LIBRARY',
  fieldVisibilityRules: {
    artifactAssociationIsNotCausality: true,
    preservedArtifactDoesNotBecomeEvidenceByStorage: true,
    lineageReadOnly: true,
  },
  blindedByDefault: false,
  purpose: 'Expose associations between formalized artifacts and later cognitive-state transitions while preserving provenance and non-causal semantics.',
});

export const COGNITIVE_SPINE_PROJECTION_PROFILES = [
  ROOT_GOVERNANCE_CONTEXT_PROFILE,
  FIELD_CASE_CONTEXT_PROFILE,
  FIELD_BLINDED_OBSERVATION_PROFILE,
  STUDIO_OBJECT_CONTEXT_PROFILE,
  LAB_EXPERIMENT_CONTEXT_PROFILE,
  LAB_BLINDED_PROFILE,
  WORLDSPECT_CONTEXT_PROFILE,
  ATLAS_TEMPORAL_CONTEXT_PROFILE,
  LIBRARY_IMPACT_CONTEXT_PROFILE,
  RUNTIME_GENERAL_CONTEXT_PROFILE,
] as const satisfies readonly CognitiveProjectionProfile[];

export type CognitiveSpineProjectionProfileId = typeof COGNITIVE_SPINE_PROJECTION_PROFILES[number]['profileId'];

const PROFILE_BY_ID = new Map<string, CognitiveProjectionProfile>(
  COGNITIVE_SPINE_PROJECTION_PROFILES.map((profile) => [profile.profileId, profile]),
);

export function getCognitiveProjectionProfile(profileId: string): CognitiveProjectionProfile {
  const profile = PROFILE_BY_ID.get(profileId);
  if (!profile) throw new Error(`COGNITIVE_SPINE_PROJECTION_PROFILE_UNKNOWN:${profileId}`);
  return profile;
}

export function isCognitiveProjectionProfileId(value: string): value is CognitiveSpineProjectionProfileId {
  return PROFILE_BY_ID.has(value);
}
