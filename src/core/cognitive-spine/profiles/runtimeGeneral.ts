import type { CognitiveSpineRefKind } from '../contracts/snapshot';
import {
  COGNITIVE_SPINE_PROJECTION_PROFILE_CONTRACT_VERSION,
  type CognitiveProjectionProfile,
  profileAllowsKind,
} from '../contracts/projectionProfile';

export const RUNTIME_GENERAL_CONTEXT_PROFILE = {
  contractVersion: COGNITIVE_SPINE_PROJECTION_PROFILE_CONTRACT_VERSION,
  profileId: 'RUNTIME_GENERAL_CONTEXT_V1',
  version: '1.0',
  surface: 'COGNITIVE_RUNTIME',
  allowedRefKinds: [
    'EVENT',
    'EVIDENCE',
    'HYPOTHESIS',
    'MEMORY',
    'DECISION',
    'CONTRADICTION',
    'FREEZE',
    'QUESTION',
  ],
  deniedRefKinds: ['PERSON_CT'],
  fieldVisibilityRules: {
    personCtInheritance: 'DENIED',
    memoryStatusMustRemainVisible: true,
    decisionsAreGovernanceContextNotEvidence: true,
    snapshotMustBeSealedBeforeExecution: true,
    midRunLiveTwinReads: 'DENIED',
  },
  blindedByDefault: false,
  purpose: 'Provide one bounded sealed institutional cognitive-state cut to the Cognitive Runtime without promoting memory or governance records into evidence.',
} as const satisfies CognitiveProjectionProfile;

export function runtimeGeneralAllowsKind(kind: CognitiveSpineRefKind): boolean {
  return profileAllowsKind(RUNTIME_GENERAL_CONTEXT_PROFILE, kind);
}
