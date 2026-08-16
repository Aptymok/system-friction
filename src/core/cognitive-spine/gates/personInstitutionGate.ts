import {
  PERSON_INSTITUTION_GATE_SCHEMA_VERSION,
  type PersonCognitiveContributionIntake,
  type PersonInstitutionGateResult,
} from '../contracts/personInstitutionGate';
import { normalizeTimestamp } from '../serialization/canonicalSerialize';

function requireNonEmpty(value: string, label: string): string {
  if (!value || value.trim() !== value) {
    throw new Error(`COGNITIVE_SPINE_INVALID_${label}:${JSON.stringify(value)}`);
  }
  return value;
}

/**
 * Personal cognitive content does not become institutional state by inheritance.
 *
 * This function only enforces that an upstream institutional intake has already
 * admitted the contribution and attached both a canonical institutional record
 * and an epistemic assessment. It does not perform that assessment itself.
 */
export function evaluatePersonInstitutionGate(
  input: PersonCognitiveContributionIntake,
): PersonInstitutionGateResult {
  if (input.schemaVersion !== PERSON_INSTITUTION_GATE_SCHEMA_VERSION) {
    throw new Error(`COGNITIVE_SPINE_PERSON_GATE_SCHEMA_MISMATCH:${input.schemaVersion}`);
  }

  requireNonEmpty(input.contributionRef, 'CONTRIBUTION_REF');
  requireNonEmpty(input.personCtRef, 'PERSON_CT_REF');
  requireNonEmpty(input.representationRef, 'REPRESENTATION_REF');
  requireNonEmpty(input.contributionHash, 'CONTRIBUTION_HASH');
  requireNonEmpty(input.intakeRef, 'INTAKE_REF');
  normalizeTimestamp(input.assessedAt);

  const canonicalRecordRef = input.canonicalRecordRef
    ? requireNonEmpty(input.canonicalRecordRef, 'CANONICAL_RECORD_REF')
    : null;
  const epistemicAssessmentRef = input.epistemicAssessmentRef
    ? requireNonEmpty(input.epistemicAssessmentRef, 'ASSESSMENT_REF')
    : null;
  const governanceRef = input.governanceRef
    ? requireNonEmpty(input.governanceRef, 'GOVERNANCE_REF')
    : null;

  const reasons: string[] = [];
  if (input.disposition !== 'ADMITTED') reasons.push(`intake_${input.disposition.toLowerCase()}`);
  if (!canonicalRecordRef) reasons.push('canonical_record_missing');
  if (!epistemicAssessmentRef) reasons.push('epistemic_assessment_missing');

  return {
    schemaVersion: PERSON_INSTITUTION_GATE_SCHEMA_VERSION,
    contributionRef: input.contributionRef,
    personCtRef: input.personCtRef,
    intakeRef: input.intakeRef,
    disposition: input.disposition,
    institutionalStateEligible:
      input.disposition === 'ADMITTED'
      && Boolean(canonicalRecordRef)
      && Boolean(epistemicAssessmentRef),
    canonicalRecordRef,
    epistemicAssessmentRef,
    governanceRef,
    reasons,
  };
}
