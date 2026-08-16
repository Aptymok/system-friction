import type { CognitiveSpineProjectionProfileId } from './profiles/registry';

export const COGNITIVE_SPINE_INTEGRATION_STATUS_CONTRACT = 'SFI-COGNITIVE-SPINE-INTEGRATION-STATUS-1.0' as const;

export type CognitiveSpineSurface =
  | 'RUNTIME'
  | 'STUDIO'
  | 'ROOT'
  | 'FIELD_T0'
  | 'METHOD_LAB'
  | 'DECISION_TRANSFER'
  | 'WORLDSPECT'
  | 'ATLAS'
  | 'LIBRARY';

export type CognitiveSpineIntegrationPosture =
  | 'SEALED_CONSUMED'
  | 'SEALED_CONSUMED_PERSISTED'
  | 'SEALED_CONSUMED_GOVERNED'
  | 'BLINDED_AVAILABLE_UNCONSUMED'
  | 'PROTOCOL_ALLOWLIST_SELECTIVE'
  | 'FROZEN_EXPERIMENT_ISOLATED'
  | 'OBSERVE_PERSIST_THEN_PRIOR_STATE_CONTRAST'
  | 'READ_ONLY_OPTIONAL_SANITIZED'
  | 'AVAILABLE_UNCONSUMED_IMPACT_UNDEMONSTRATED';

export type CognitiveSpineSurfaceIntegration = {
  surface: CognitiveSpineSurface;
  profileId: CognitiveSpineProjectionProfileId;
  posture: CognitiveSpineIntegrationPosture;
  ctRequiredMiddleware: false;
  liveCtReadAllowed: boolean;
  operationalCtConsumed: boolean | 'SELECTIVE';
  exactSnapshotIdentityRequired: boolean;
  canonicalWriteByRead: false;
  truthAuthority: false;
  notes: readonly string[];
};

export const COGNITIVE_SPINE_SURFACE_INTEGRATIONS = [
  {
    surface: 'RUNTIME',
    profileId: 'RUNTIME_GENERAL_CONTEXT_V1',
    posture: 'SEALED_CONSUMED',
    ctRequiredMiddleware: false,
    liveCtReadAllowed: false,
    operationalCtConsumed: true,
    exactSnapshotIdentityRequired: true,
    canonicalWriteByRead: false,
    truthAuthority: false,
    notes: [
      'Institutional Runtime executes over one sealed Cognitive Spine snapshot.',
      'Memory and decisions remain context and are not promoted to KernelEvidence by inheritance.',
    ],
  },
  {
    surface: 'STUDIO',
    profileId: 'STUDIO_OBJECT_CONTEXT_V1',
    posture: 'SEALED_CONSUMED_PERSISTED',
    ctRequiredMiddleware: false,
    liveCtReadAllowed: false,
    operationalCtConsumed: true,
    exactSnapshotIdentityRequired: true,
    canonicalWriteByRead: false,
    truthAuthority: false,
    notes: [
      'Studio consumes one sealed snapshot and persists the exact snapshot/trace used by the run.',
      'Studio learning returns through governed experience/memory policy rather than direct canonical writes.',
    ],
  },
  {
    surface: 'ROOT',
    profileId: 'ROOT_GOVERNANCE_CONTEXT_V1',
    posture: 'SEALED_CONSUMED_GOVERNED',
    ctRequiredMiddleware: false,
    liveCtReadAllowed: false,
    operationalCtConsumed: true,
    exactSnapshotIdentityRequired: true,
    canonicalWriteByRead: false,
    truthAuthority: false,
    notes: [
      'ROOT may consume sealed context for governance deliberation.',
      'Governance authority cannot upgrade evidence, independence, epistemic class or truth.',
    ],
  },
  {
    surface: 'FIELD_T0',
    profileId: 'FIELD_BLINDED_OBSERVATION_V1',
    posture: 'BLINDED_AVAILABLE_UNCONSUMED',
    ctRequiredMiddleware: false,
    liveCtReadAllowed: false,
    operationalCtConsumed: false,
    exactSnapshotIdentityRequired: true,
    canonicalWriteByRead: false,
    truthAuthority: false,
    notes: [
      'Field baseline observation occurs before Cognitive Spine materialization.',
      'T0 records CT availability without consumption; later returns preserve provenance.',
      'FIELD_CASE_CONTEXT_V1 remains an explicit post-observation option and is not an implicit T0 dependency.',
    ],
  },
  {
    surface: 'METHOD_LAB',
    profileId: 'LAB_EXPERIMENT_CONTEXT_V1',
    posture: 'PROTOCOL_ALLOWLIST_SELECTIVE',
    ctRequiredMiddleware: false,
    liveCtReadAllowed: false,
    operationalCtConsumed: 'SELECTIVE',
    exactSnapshotIdentityRequired: true,
    canonicalWriteByRead: false,
    truthAuthority: false,
    notes: [
      'No context allowlist means CT is available but unconsumed.',
      'Explicit allowlists fail closed on missing or profile-denied refs.',
      'Consumed CT context remains distinct from evidence and simulation output remains SIMULATED.',
    ],
  },
  {
    surface: 'DECISION_TRANSFER',
    profileId: 'LAB_BLINDED_V1',
    posture: 'FROZEN_EXPERIMENT_ISOLATED',
    ctRequiredMiddleware: false,
    liveCtReadAllowed: false,
    operationalCtConsumed: false,
    exactSnapshotIdentityRequired: true,
    canonicalWriteByRead: false,
    truthAuthority: false,
    notes: [
      'Operational SFI-CT is observed only after experimental prediction and is never an experiment input.',
      'CT_FULL continues to use its separately frozen Decision Transfer context.',
    ],
  },
  {
    surface: 'WORLDSPECT',
    profileId: 'WORLDSPECT_CONTEXT_V1',
    posture: 'OBSERVE_PERSIST_THEN_PRIOR_STATE_CONTRAST',
    ctRequiredMiddleware: false,
    liveCtReadAllowed: false,
    operationalCtConsumed: true,
    exactSnapshotIdentityRequired: true,
    canonicalWriteByRead: false,
    truthAuthority: false,
    notes: [
      'External observation is persisted before any CT context is materialized.',
      'The later CT pairing is DERIVED and uses the institutional cutoff captured before observation began.',
      'WorldSpect canonical snapshot/hash remain CT-free.',
    ],
  },
  {
    surface: 'ATLAS',
    profileId: 'ATLAS_TEMPORAL_CONTEXT_V1',
    posture: 'READ_ONLY_OPTIONAL_SANITIZED',
    ctRequiredMiddleware: false,
    liveCtReadAllowed: false,
    operationalCtConsumed: true,
    exactSnapshotIdentityRequired: true,
    canonicalWriteByRead: false,
    truthAuthority: false,
    notes: [
      'Atlas consumes read-only aggregate temporal/lineage context.',
      'Atlas remains operational if CT is unavailable and does not expose internal institutional refs on its non-ROOT surface.',
      'Temporal association does not imply causality or epistemic promotion.',
    ],
  },
  {
    surface: 'LIBRARY',
    profileId: 'LIBRARY_IMPACT_CONTEXT_V1',
    posture: 'AVAILABLE_UNCONSUMED_IMPACT_UNDEMONSTRATED',
    ctRequiredMiddleware: false,
    liveCtReadAllowed: false,
    operationalCtConsumed: false,
    exactSnapshotIdentityRequired: false,
    canonicalWriteByRead: false,
    truthAuthority: false,
    notes: [
      'Public Library remains static and does not read private Cognitive Spine state.',
      'ROOT inspection may observe CT availability without consumption.',
      'Artifact-to-state impact remains UNDEMONSTRATED until canonical artifact identity and transition lineage exist.',
    ],
  },
] as const satisfies readonly CognitiveSpineSurfaceIntegration[];

export const COGNITIVE_SPINE_TECHNICAL_CLAIM_BOUNDARY = {
  technicalIntegration: 'PASS_CANDIDATE',
  scientificValidationProven: false,
  institutionalAutonomyProven: false,
  truthAuthorityGranted: false,
  phenomenalConsciousnessClaim: false,
  personCtInheritedByInstitution: false,
  allOperationsRequireCtMiddleware: false,
  statement: 'Technical integration means each governed SFI cognitive surface has an explicit, tested Cognitive Spine posture. It does not imply scientific validation, autonomous institutional agency, truth authority, phenomenal consciousness, or mandatory CT mediation of every operation.',
} as const;
