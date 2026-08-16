import {
  SFI_CASE_TO_INSTITUTION_GATE_CONTRACT,
  type SfiCaseToInstitutionStage,
} from '../contracts/commercial';
import type { SfiCanonicalRef } from '../contracts/epistemic';

export type SfiCaseInstitutionAdmissionV1 = {
  contract: typeof SFI_CASE_TO_INSTITUTION_GATE_CONTRACT;
  caseId: string;
  stage: SfiCaseToInstitutionStage;
  sanitized: boolean;
  epistemicAssessmentRefs: SfiCanonicalRef[];
  proposedCanonicalRecordRefs: SfiCanonicalRef[];
  governanceDecisionRef: SfiCanonicalRef | null;
  governanceDecision: 'APPROVED' | 'REJECTED' | 'PENDING';
  institutionalWriteAuthorized: boolean;
  updatedAt: string;
};

export function canAdmitCaseResultToInstitution(
  admission: SfiCaseInstitutionAdmissionV1,
): boolean {
  return admission.stage === 'ADMITTED'
    && admission.sanitized
    && admission.epistemicAssessmentRefs.length > 0
    && admission.proposedCanonicalRecordRefs.length > 0
    && admission.governanceDecision === 'APPROVED'
    && Boolean(admission.governanceDecisionRef)
    && admission.institutionalWriteAuthorized;
}

export function createCaseAdmissionCandidate(input: {
  caseId: string;
  proposedCanonicalRecordRefs: SfiCanonicalRef[];
  updatedAt: string;
}): SfiCaseInstitutionAdmissionV1 {
  return {
    contract: SFI_CASE_TO_INSTITUTION_GATE_CONTRACT,
    caseId: input.caseId,
    stage: 'CASE_RESULT',
    sanitized: false,
    epistemicAssessmentRefs: [],
    proposedCanonicalRecordRefs: input.proposedCanonicalRecordRefs,
    governanceDecisionRef: null,
    governanceDecision: 'PENDING',
    institutionalWriteAuthorized: false,
    updatedAt: input.updatedAt,
  };
}
