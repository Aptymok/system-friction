export const PERSON_INSTITUTION_GATE_SCHEMA_VERSION = 'SFI-CT-PERSON-INSTITUTION-GATE-1.0' as const;

export type InstitutionalIntakeDisposition = 'ADMITTED' | 'REJECTED' | 'PENDING';

/**
 * Input supplied by the institutional intake / epistemic plane.
 * The gate does not decide admissibility or epistemic class itself.
 */
export type PersonCognitiveContributionIntake = {
  schemaVersion: typeof PERSON_INSTITUTION_GATE_SCHEMA_VERSION;
  contributionRef: string;
  personCtRef: string;
  representationRef: string;
  contributionHash: string;
  intakeRef: string;
  disposition: InstitutionalIntakeDisposition;
  canonicalRecordRef?: string;
  epistemicAssessmentRef?: string;
  governanceRef?: string;
  assessedAt: string;
};

export type PersonInstitutionGateResult = {
  schemaVersion: typeof PERSON_INSTITUTION_GATE_SCHEMA_VERSION;
  contributionRef: string;
  personCtRef: string;
  intakeRef: string;
  disposition: InstitutionalIntakeDisposition;
  institutionalStateEligible: boolean;
  canonicalRecordRef: string | null;
  epistemicAssessmentRef: string | null;
  governanceRef: string | null;
  reasons: string[];
};
