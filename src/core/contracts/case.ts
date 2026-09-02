import type { SfiCanonicalRef } from './epistemic';
import type { SfiServiceProfileId } from './commercial';
import type { SfiTemporalWindowV1 } from './temporal';

export const SFI_CASE_CONTRACT = 'SFI-CASE-1.0' as const;

export type SfiCaseStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'OBSERVING'
  | 'ANALYZING'
  | 'AWAITING_GOVERNANCE'
  | 'INTERVENING'
  | 'AWAITING_RETURN'
  | 'AWAITING_USER_CLOSE'
  | 'CLOSED'
  | 'REJECTED';

export type SfiCaseGovernanceV1 = {
  rootAddressable: false;
  institutionalAdmission: 'GATED';
  actionRequiresGovernance: true;
  governanceDecisionRefs: SfiCanonicalRef[];
};

export type SfiCaseUncertaintyV1 = {
  determinability: 'DETERMINED' | 'PARTIALLY_DETERMINED' | 'UNDETERMINED';
  confidence: number | null;
  unresolvedQuestionRefs: SfiCanonicalRef[];
  contradictionRefs: SfiCanonicalRef[];
};

export type SfiCaseV1 = {
  contract: typeof SFI_CASE_CONTRACT;
  id: string;
  version: string;
  tenantId: string;
  projectId?: string | null;
  clientId?: string | null;
  serviceProfileId: SfiServiceProfileId;
  subject: string;
  scope: string;
  systemBoundaryRef: SfiCanonicalRef;
  temporalWindow: SfiTemporalWindowV1;

  sourceRefs: SfiCanonicalRef[];
  recordRefs: SfiCanonicalRef[];
  evidenceRefs: SfiCanonicalRef[];

  systemModelRefs: SfiCanonicalRef[];
  observationRefs: SfiCanonicalRef[];
  frictionRefs: SfiCanonicalRef[];
  perturbationRefs: SfiCanonicalRef[];
  trajectoryRefs: SfiCanonicalRef[];
  attractorRefs: SfiCanonicalRef[];

  epistemicAssessmentRefs: SfiCanonicalRef[];
  hypothesisRefs: SfiCanonicalRef[];

  instrumentRunRefs: SfiCanonicalRef[];
  analysisRefs: SfiCanonicalRef[];

  recommendationRefs: SfiCanonicalRef[];
  interventionRefs: SfiCanonicalRef[];
  returnRefs: SfiCanonicalRef[];
  reportRefs: SfiCanonicalRef[];

  lineage: {
    parentCaseRefs: SfiCanonicalRef[];
    sourceCutoff: string;
  };
  uncertainty: SfiCaseUncertaintyV1;
  governance: SfiCaseGovernanceV1;
  status: SfiCaseStatus;
  createdAt: string;
  updatedAt: string;
};

export const SFI_CASE_INVARIANTS = {
  caseEqualsSourceStore: false,
  caseEqualsEvidenceStore: false,
  caseEqualsInstitutionalMemory: false,
  canonicalObjectsAreReferencedNotCopied: true,
  tenantCanAddressRoot: false,
  institutionalAdmission: 'GATED',
  projectAggregatesCasesWithoutOwningEvidenceTruth: true,
  finalReportClosureRequiresExplicitUserDecision: true,
} as const;
