import type {
  SfiCanonicalRef,
  SfiDeterminability,
  SfiEpistemicOutputRelation,
} from './epistemic';

export const SFI_REPORT_CONTRACT = 'SFI-REPORT-1.0' as const;

export type SfiReportDeliveryFormat = 'JSON' | 'WEB' | 'PDF' | 'DASHBOARD';
export type SfiReportClaimSupport = 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'CONTRADICTED' | 'INSUFFICIENT' | 'UNSUPPORTED';

export type SfiReportClaimLineageV1 = {
  executionRef: SfiCanonicalRef | null;
  outputRelation: SfiEpistemicOutputRelation;
  support: SfiReportClaimSupport;
  contradictionRefs: SfiCanonicalRef[];
  refutationConditions: string[];
};

export type SfiReportClaimV1 = {
  id: string;
  statement: string;
  assessmentRef: SfiCanonicalRef;
  evidenceRefs: SfiCanonicalRef[];
  recordRefs: SfiCanonicalRef[];
  sourceRefs: SfiCanonicalRef[];
  determinability: SfiDeterminability;
  confidence: number | null;
  lineage?: SfiReportClaimLineageV1;
};

export type SfiRenderedReportClaimV1 = Omit<SfiReportClaimV1, 'lineage'> & {
  lineage: SfiReportClaimLineageV1;
};

export type SfiReportV1 = {
  contract: typeof SFI_REPORT_CONTRACT;
  id: string;
  version: string;
  caseId: string;
  generatedAt: string;
  systemBoundaryRef: SfiCanonicalRef;
  observationRefs: SfiCanonicalRef[];
  systemModelRefs: SfiCanonicalRef[];
  frictionRefs: SfiCanonicalRef[];
  trajectoryRefs: SfiCanonicalRef[];
  hypothesisRefs: SfiCanonicalRef[];
  contradictionRefs: SfiCanonicalRef[];
  recommendationRefs: SfiCanonicalRef[];
  interventionRefs: SfiCanonicalRef[];
  returnRefs: SfiCanonicalRef[];
  claims: SfiRenderedReportClaimV1[];
  limitations: string[];
  deliveryFormats: SfiReportDeliveryFormat[];
  executionAuthority: false;
  governanceDecisionRefs: SfiCanonicalRef[];
};

export const SFI_REPORT_DELIVERY_CONTRACT = {
  allowedFormats: ['JSON', 'WEB', 'PDF', 'DASHBOARD'] as const,
  actionIsDeliveryFormat: false,
  reportCanExecuteIntervention: false,
  actionPath: 'RECOMMENDATION → GOVERNANCE → ACTION_ADAPTER → INTERVENTION → RETURN',
  statement:
    'SFI Report is an auditable representation of a case. Delivery does not confer execution authority; actions require a separate governance path.',
} as const;
