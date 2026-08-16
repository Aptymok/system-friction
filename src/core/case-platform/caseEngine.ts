import {
  SFI_CASE_CONTRACT,
  type SfiCanonicalRef,
  type SfiCaseV1,
  type SfiServiceProfileId,
  type SfiTemporalWindowV1,
} from '../contracts/sfi';
import { getSfiServiceProfile } from './serviceProfiles';

export type CreateSfiCaseV1Input = {
  id: string;
  version?: string;
  tenantId: string;
  clientId?: string | null;
  serviceProfileId: SfiServiceProfileId;
  subject: string;
  scope: string;
  systemBoundaryRef: SfiCanonicalRef;
  temporalWindow: SfiTemporalWindowV1;
  sourceRefs?: SfiCanonicalRef[];
  recordRefs?: SfiCanonicalRef[];
  evidenceRefs?: SfiCanonicalRef[];
  createdAt: string;
};

function requireText(value: string, field: string) {
  if (!value.trim()) throw new Error(`SFI_CASE_INVALID:${field}`);
}

function includesString(values: readonly string[], value: string) {
  return values.includes(value);
}

export function createSfiCaseV1(input: CreateSfiCaseV1Input): SfiCaseV1 {
  requireText(input.id, 'id');
  requireText(input.tenantId, 'tenantId');
  requireText(input.subject, 'subject');
  requireText(input.scope, 'scope');
  requireText(input.systemBoundaryRef.id, 'systemBoundaryRef.id');
  requireText(input.temporalWindow.cutoff, 'temporalWindow.cutoff');

  const profile = getSfiServiceProfile(input.serviceProfileId);
  if (!profile) throw new Error(`SFI_CASE_UNKNOWN_SERVICE_PROFILE:${input.serviceProfileId}`);
  if (!includesString(profile.acceptedSubjects, input.subject)) {
    throw new Error(`SFI_CASE_SUBJECT_NOT_ACCEPTED:${input.serviceProfileId}:${input.subject}`);
  }

  return {
    contract: SFI_CASE_CONTRACT,
    id: input.id,
    version: input.version ?? '1.0',
    tenantId: input.tenantId,
    clientId: input.clientId ?? null,
    serviceProfileId: input.serviceProfileId,
    subject: input.subject,
    scope: input.scope,
    systemBoundaryRef: input.systemBoundaryRef,
    temporalWindow: input.temporalWindow,
    sourceRefs: input.sourceRefs ?? [],
    recordRefs: input.recordRefs ?? [],
    evidenceRefs: input.evidenceRefs ?? [],
    systemModelRefs: [],
    observationRefs: [],
    frictionRefs: [],
    perturbationRefs: [],
    trajectoryRefs: [],
    attractorRefs: [],
    epistemicAssessmentRefs: [],
    hypothesisRefs: [],
    instrumentRunRefs: [],
    analysisRefs: [],
    recommendationRefs: [],
    interventionRefs: [],
    returnRefs: [],
    reportRefs: [],
    lineage: {
      parentCaseRefs: [],
      sourceCutoff: input.temporalWindow.cutoff,
    },
    uncertainty: {
      determinability: 'UNDETERMINED',
      confidence: null,
      unresolvedQuestionRefs: [],
      contradictionRefs: [],
    },
    governance: {
      rootAddressable: false,
      institutionalAdmission: 'GATED',
      actionRequiresGovernance: true,
      governanceDecisionRefs: [],
    },
    status: 'OPEN',
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

export function validateSfiCaseV1(caseRecord: SfiCaseV1): string[] {
  const violations: string[] = [];
  const profile = getSfiServiceProfile(caseRecord.serviceProfileId);
  if (caseRecord.contract !== SFI_CASE_CONTRACT) violations.push('CASE_CONTRACT_MISMATCH');
  if (!caseRecord.id.trim()) violations.push('CASE_ID_REQUIRED');
  if (!caseRecord.tenantId.trim()) violations.push('TENANT_ID_REQUIRED');
  if (!profile) violations.push('SERVICE_PROFILE_UNKNOWN');
  if (profile && !includesString(profile.acceptedSubjects, caseRecord.subject)) violations.push('SUBJECT_NOT_ACCEPTED_BY_PROFILE');
  if (!caseRecord.systemBoundaryRef.id.trim()) violations.push('SYSTEM_BOUNDARY_REQUIRED');
  if (!caseRecord.temporalWindow.cutoff.trim()) violations.push('TEMPORAL_CUTOFF_REQUIRED');
  if (caseRecord.lineage.sourceCutoff !== caseRecord.temporalWindow.cutoff) violations.push('CASE_SOURCE_CUTOFF_DRIFT');
  if (caseRecord.governance.rootAddressable !== false) violations.push('CASE_ROOT_ADDRESSABLE');
  if (caseRecord.governance.institutionalAdmission !== 'GATED') violations.push('CASE_INSTITUTIONAL_ADMISSION_UNGATED');
  if (caseRecord.governance.actionRequiresGovernance !== true) violations.push('CASE_ACTION_BYPASSES_GOVERNANCE');
  return violations;
}
