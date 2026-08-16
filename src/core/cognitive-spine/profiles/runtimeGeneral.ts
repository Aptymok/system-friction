import type { CognitiveSpineRefKind } from '../contracts/snapshot';

export const RUNTIME_GENERAL_CONTEXT_PROFILE = {
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
  ] as CognitiveSpineRefKind[],
  deniedRefKinds: ['PERSON_CT'] as CognitiveSpineRefKind[],
  fieldVisibilityRules: {
    personCtInheritance: 'DENIED',
    memoryStatusMustRemainVisible: true,
    decisionsAreGovernanceContextNotEvidence: true,
    snapshotMustBeSealedBeforeExecution: true,
    midRunLiveTwinReads: 'DENIED',
  },
  blindedByDefault: false,
  purpose: 'Provide one bounded sealed institutional cognitive-state cut to the Cognitive Runtime without promoting memory or governance records into evidence.',
} as const;

export function runtimeGeneralAllowsKind(kind: CognitiveSpineRefKind): boolean {
  return RUNTIME_GENERAL_CONTEXT_PROFILE.allowedRefKinds.includes(
    kind as (typeof RUNTIME_GENERAL_CONTEXT_PROFILE.allowedRefKinds)[number],
  ) && !RUNTIME_GENERAL_CONTEXT_PROFILE.deniedRefKinds.includes(
    kind as (typeof RUNTIME_GENERAL_CONTEXT_PROFILE.deniedRefKinds)[number],
  );
}
