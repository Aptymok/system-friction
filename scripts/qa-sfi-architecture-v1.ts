import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  MIHM_DIMENSIONAL_TRANSFER_MODEL_V0,
  SFI_CASE_INVARIANTS,
  SFI_COMMERCIAL_BOUNDARY,
  SFI_EPISTEMIC_INVARIANTS,
  SFI_INSTRUMENT_INVARIANTS,
  SFI_REPORT_DELIVERY_CONTRACT,
  SFI_SYSTEM_INVARIANTS,
  SFI_TEMPORAL_INVARIANTS,
} from '../src/core/contracts/sfi';
import {
  canAdmitCaseResultToInstitution,
  createCaseAdmissionCandidate,
  type SfiCaseInstitutionAdmissionV1,
} from '../src/core/case-platform/admissionGate';
import {
  SFI_ARCHITECTURE_V1_STATUS,
  SFI_CORE_V1_STATUS,
} from '../src/core/case-platform/architectureStatus';
import { SFI_SERVICE_PROFILES } from '../src/core/case-platform/serviceProfiles';
import { COGNITIVE_SPINE_SURFACE_INTEGRATIONS } from '../src/core/cognitive-spine/surfaceIntegrationRegistry';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const expectedConstitution = [
  'SFI-EPISTEMIC-CONTRACT-1.0',
  'SFI-SYSTEM-CONTRACT-1.0',
  'SFI-TEMPORAL-CONTRACT-1.0',
  'SFI-INSTRUMENT-CONTRACT-1.0',
  'SFI-COMMERCIAL-BOUNDARY-CONTRACT-1.0',
] as const;
assert.deepEqual(SFI_ARCHITECTURE_V1_STATUS.constitutionalContracts, expectedConstitution, 'constitutional_contract_set_changed');
assert.equal(SFI_ARCHITECTURE_V1_STATUS.technicalStatus, 'PASS', 'architecture_status_not_pass');
assert.equal(SFI_ARCHITECTURE_V1_STATUS.empiricalValidation, 'OPEN_ACCUMULATING', 'architecture_must_not_claim_empirical_validation');
assert.equal(SFI_ARCHITECTURE_V1_STATUS.scientificValidityImplied, false, 'architecture_claims_scientific_validity');
assert.equal(SFI_ARCHITECTURE_V1_STATUS.truthAuthorityGranted, false, 'architecture_grants_truth_authority');
assert.equal(SFI_CORE_V1_STATUS.technicalStatus, 'PASS', 'sfi_core_v1_not_pass');
assert.equal(SFI_CORE_V1_STATUS.architecture, 'PASS', 'sfi_core_architecture_not_pass');
assert.equal(SFI_CORE_V1_STATUS.epistemicContract, 'FROZEN', 'epistemic_contract_not_frozen');
assert.equal(SFI_CORE_V1_STATUS.systemContract, 'FROZEN', 'system_contract_not_frozen');
assert.equal(SFI_CORE_V1_STATUS.temporalContract, 'FROZEN', 'temporal_contract_not_frozen');
assert.equal(SFI_CORE_V1_STATUS.instrumentContract, 'FROZEN', 'instrument_contract_not_frozen');
assert.equal(SFI_CORE_V1_STATUS.commercialBoundaryContract, 'FROZEN', 'commercial_boundary_not_frozen');
assert.equal(SFI_CORE_V1_STATUS.operationalExercise, 'OPEN', 'software_closure_must_not_claim_operational_exercise');
assert.equal(SFI_CORE_V1_STATUS.empiricalValidation, 'OPEN_ACCUMULATING', 'core_must_not_claim_empirical_validation');

assert.equal(SFI_EPISTEMIC_INVARIANTS.recordEqualsEvidence, false, 'record_collapsed_into_evidence');
assert.equal(SFI_EPISTEMIC_INVARIANTS.governanceEqualsTruth, false, 'governance_collapsed_into_truth');
assert.equal(SFI_EPISTEMIC_INVARIANTS.canonicalRecordEqualsReality, false, 'canonical_record_collapsed_into_reality');
assert.equal(SFI_INSTRUMENT_INVARIANTS.outputsBecomeEvidenceByInheritance, false, 'instrument_output_promoted_to_evidence');
assert.equal(SFI_INSTRUMENT_INVARIANTS.outputsBecomeTruthByInheritance, false, 'instrument_output_promoted_to_truth');
assert.equal(SFI_INSTRUMENT_INVARIANTS.instrumentHasGovernanceAuthority, false, 'instrument_granted_governance_authority');
assert.equal(SFI_TEMPORAL_INVARIANTS.reconstructedEqualsObserved, false, 'reconstructed_time_collapsed_into_observed_time');
assert.equal(SFI_TEMPORAL_INVARIANTS.projectedEqualsObserved, false, 'projected_time_collapsed_into_observed_time');
assert.equal(SFI_SYSTEM_INVARIANTS.dimensionalTransferStatus, 'EXPERIMENTAL', 'dimensional_transfer_promoted_without_validation');
assert.equal(SFI_SYSTEM_INVARIANTS.conservationAcrossDimensionsAssumed, false, 'dimensional_transfer_assumes_conservation');
assert.equal(MIHM_DIMENSIONAL_TRANSFER_MODEL_V0, 'MIHM-DIMENSIONAL-TRANSFER-MODEL-0');

assert.equal(SFI_CASE_INVARIANTS.caseEqualsSourceStore, false, 'case_became_source_store');
assert.equal(SFI_CASE_INVARIANTS.caseEqualsEvidenceStore, false, 'case_became_evidence_store');
assert.equal(SFI_CASE_INVARIANTS.caseEqualsInstitutionalMemory, false, 'case_became_institutional_memory');
assert.equal(SFI_CASE_INVARIANTS.tenantCanAddressRoot, false, 'tenant_can_address_root');
assert.equal(SFI_COMMERCIAL_BOUNDARY.clientCanAddressRoot, false, 'client_can_address_root');
assert.equal(SFI_COMMERCIAL_BOUNDARY.caseMemoryEqualsInstitutionalMemory, false, 'client_case_memory_equals_sfi_memory');
assert.equal(SFI_COMMERCIAL_BOUNDARY.caseCanWriteInstitutionalMemoryDirectly, false, 'case_can_write_institutional_memory_directly');
assert.equal(SFI_COMMERCIAL_BOUNDARY.reportCanAuthorizeAction, false, 'report_granted_execution_authority');
assert.equal(SFI_COMMERCIAL_BOUNDARY.aiOutputIsEvidenceByInheritance, false, 'commercial_ai_output_promoted_to_evidence');

assert.deepEqual(SFI_REPORT_DELIVERY_CONTRACT.allowedFormats, ['JSON', 'WEB', 'PDF', 'DASHBOARD'], 'report_delivery_formats_changed');
assert.equal(SFI_REPORT_DELIVERY_CONTRACT.actionIsDeliveryFormat, false, 'action_added_as_report_delivery_format');
assert.equal(SFI_REPORT_DELIVERY_CONTRACT.reportCanExecuteIntervention, false, 'report_can_execute_intervention');

const expectedProfiles = [
  'SYSTEM_OBSERVATORY',
  'AI_IMPLEMENTATION_DIAGNOSTIC',
  'AI_ADOPTION_INTEGRATION',
  'AI_GOVERNANCE_ASSURANCE',
  'SERVICE_OBSERVABILITY',
  'CONTRACT_WARRANTY_ASSURANCE',
  'TENDER_ASSURANCE',
  'ENTERPRISE_MEMORY',
  'COGNITIVE_RECONSTRUCTION',
  'CUSTOM_RESEARCH',
] as const;
const profileIds = SFI_SERVICE_PROFILES.map((profile) => profile.id);
assert.deepEqual(profileIds, expectedProfiles, 'service_profile_registry_changed');
assert.equal(new Set(profileIds).size, profileIds.length, 'duplicate_service_profile_id');
for (const profile of SFI_SERVICE_PROFILES) {
  assert.equal(profile.rootAccess, false, `${profile.id}:direct_root_access`);
  assert.equal(profile.institutionalAdmission, 'GATED', `${profile.id}:ungated_institutional_admission`);
  assert.ok(profile.epistemicPolicy.length > 0, `${profile.id}:missing_epistemic_policy`);
  assert.ok(profile.governancePolicy.length > 0, `${profile.id}:missing_governance_policy`);
  assert.ok(profile.validationProfile.length > 0, `${profile.id}:missing_validation_profile`);
}

const serviceDesk = SFI_SERVICE_PROFILES.find((profile) => profile.id === 'SERVICE_OBSERVABILITY');
assert.ok(serviceDesk?.requiredSources.includes('TICKETS'), 'help_desk_profile_missing_tickets');
assert.ok(serviceDesk?.requiredSources.includes('ASSETS'), 'help_desk_profile_missing_assets');
assert.ok(serviceDesk?.requiredSources.includes('SLA_RECORDS'), 'help_desk_profile_missing_sla');
const warranties = SFI_SERVICE_PROFILES.find((profile) => profile.id === 'CONTRACT_WARRANTY_ASSURANCE');
assert.ok(warranties?.requiredSources.includes('WARRANTY_EVENTS'), 'warranty_profile_missing_events');
assert.ok(warranties?.validationProfile.includes('SUPPLIER_HISTORY'), 'warranty_profile_missing_supplier_history');
const tender = SFI_SERVICE_PROFILES.find((profile) => profile.id === 'TENDER_ASSURANCE');
assert.ok(tender?.domainRules.includes('AI_DOES_NOT_SELECT_WINNER'), 'tender_profile_grants_ai_decision_authority');
assert.deepEqual(tender?.validationProfile, ['SOURCE', 'PAGE', 'EVIDENCE', 'DETERMINABILITY'], 'tender_traceability_contract_changed');

const candidate = createCaseAdmissionCandidate({
  caseId: 'qa-case',
  proposedCanonicalRecordRefs: [{ id: 'record-candidate' }],
  updatedAt: '2026-08-16T00:00:00.000Z',
});
assert.equal(canAdmitCaseResultToInstitution(candidate), false, 'raw_case_result_auto_admitted');
const admitted: SfiCaseInstitutionAdmissionV1 = {
  ...candidate,
  stage: 'ADMITTED',
  sanitized: true,
  epistemicAssessmentRefs: [{ id: 'assessment-1' }],
  governanceDecisionRef: { id: 'governance-1' },
  governanceDecision: 'APPROVED',
  institutionalWriteAuthorized: true,
};
assert.equal(canAdmitCaseResultToInstitution(admitted), true, 'fully_governed_admission_blocked');

for (const surface of COGNITIVE_SPINE_SURFACE_INTEGRATIONS) {
  assert.equal(surface.ctRequiredMiddleware, false, `${surface.surface}:ct_became_required_middleware`);
  assert.equal(surface.canonicalWriteByRead, false, `${surface.surface}:ct_read_writes_canonical_state`);
  assert.equal(surface.truthAuthority, false, `${surface.surface}:ct_granted_truth_authority`);
}

const coreFiles = [
  'src/core/contracts/epistemic.ts',
  'src/core/contracts/system.ts',
  'src/core/contracts/temporal.ts',
  'src/core/contracts/instrument.ts',
  'src/core/contracts/commercial.ts',
  'src/core/contracts/case.ts',
  'src/core/contracts/report.ts',
  'src/core/contracts/sfi.ts',
  'src/core/case-platform/serviceProfiles.ts',
  'src/core/case-platform/caseEngine.ts',
  'src/core/case-platform/reportAssembler.ts',
  'src/core/case-platform/admissionGate.ts',
  'src/core/case-platform/architectureStatus.ts',
];
for (const file of coreFiles) {
  const source = read(file);
  assert.equal(/(?:from\s+['"]next(?:\/|['"])|@vercel|vercel\/)/i.test(source), false, `${file}:platform_dependency_introduced`);
}

const caseSource = read('src/core/contracts/case.ts');
assert.ok(caseSource.includes('sourceRefs:'), 'case_missing_source_refs');
assert.ok(caseSource.includes('recordRefs:'), 'case_missing_record_refs');
assert.ok(caseSource.includes('evidenceRefs:'), 'case_missing_evidence_refs');
assert.ok(caseSource.includes('systemModelRefs:'), 'case_missing_system_model_refs');
assert.equal(/\bsources\s*:\s*unknown\[\]/.test(caseSource), false, 'case_embeds_source_store');

const legacyFieldContracts = read('src/lib/system/contracts/index.ts');
assert.ok(legacyFieldContracts.includes('export type FieldCase'), 'existing_field_case_contract_removed_instead_of_promoted');
assert.ok(legacyFieldContracts.includes('export type ReturnRecord'), 'existing_return_contract_removed_instead_of_promoted');

const requiredDocs = [
  ['docs/architecture/sfi/SFI-ARCHITECTURE-1.0.md', '**Status:** FROZEN'],
  ['docs/architecture/sfi/SFI-EPISTEMIC-CONTRACT-1.0.md', '**Status:** FROZEN'],
  ['docs/architecture/sfi/SFI-SYSTEM-CONTRACT-1.0.md', '**Status:** FROZEN'],
  ['docs/architecture/sfi/SFI-TEMPORAL-CONTRACT-1.0.md', '**Status:** FROZEN'],
  ['docs/architecture/sfi/SFI-INSTRUMENT-CONTRACT-1.0.md', '**Status:** FROZEN'],
  ['docs/architecture/sfi/SFI-COMMERCIAL-BOUNDARY-CONTRACT-1.0.md', '**Status:** FROZEN'],
  ['docs/architecture/sfi/SFI-CASE-REPORT-CONTRACTS-1.0.md', '**Status:** VALIDATED'],
  ['docs/architecture/sfi/SFI-CORE-1.0-CLOSURE.md', 'SFI_CORE_V1 = PASS'],
  ['docs/architecture/sfi/MIHM-DIMENSIONAL-TRANSFER-MODEL-0.md', 'EXPERIMENTAL'],
] as const;
for (const [file, marker] of requiredDocs) {
  assert.ok(read(file).includes(marker), `${file}:contract_marker_missing`);
}

console.log(JSON.stringify({
  ok: true,
  claim: 'SFI_ARCHITECTURE_V1 = PASS',
  coreClaim: 'SFI_CORE_V1 = PASS',
  constitutionalContracts: expectedConstitution.length,
  serviceProfiles: profileIds.length,
  caseContract: 'SFI-CASE-1.0',
  reportContract: 'SFI-REPORT-1.0',
  clientToRoot: 'PROHIBITED',
  caseToInstitution: 'GATED',
  aiOutputToEvidenceByInheritance: 'PROHIBITED',
  reportToAction: 'GOVERNANCE_REQUIRED',
  cognitiveSpineRequiredMiddleware: false,
  platformNeutralCore: true,
  dimensionalTransfer: 'EXPERIMENTAL',
  operationalExercise: 'OPEN',
  empiricalValidation: 'OPEN_ACCUMULATING',
}, null, 2));
