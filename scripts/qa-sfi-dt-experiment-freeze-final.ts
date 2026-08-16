import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

function read(relative: string) {
  return fs.readFileSync(path.join(process.cwd(), relative), 'utf8');
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`SFI_DT_FINAL_FREEZE_QA:${message}`);
}
function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

const freezePath = 'src/core/cognitive-twin/reentry/decisionTransferExperimentFreeze.ts';
const registrationPath = 'src/core/cognitive-twin/reentry/decisionTransferExperimentRegistration.ts';
const registrationIntegrityPath = 'src/core/cognitive-twin/reentry/decisionTransferExperimentRegistrationIntegrity.ts';
const evidencePath = 'src/core/cognitive-twin/reentry/decisionTransferEvaluationEvidence.ts';
const evidenceIntegrityPath = 'src/core/cognitive-twin/reentry/decisionTransferEvaluationEvidenceIntegrity.ts';
const blindRoutePath = 'src/app/api/root/method-lab/decision-transfer/blind/route.ts';
const registerRoutePath = 'src/app/api/root/method-lab/decision-transfer/register/route.ts';
const revealRoutePath = 'src/app/api/root/method-lab/decision-transfer/reveal/route.ts';
const uiPath = 'src/components/root/method-lab/BlindDecisionExperiment.tsx';
const manifestPath = 'docs/research/decision-transfer/SFI-DT-EXPERIMENT-MANIFEST-001.json';

const instrumentFiles = [
  'src/core/cognitive-twin/reentry/decisionCommitment.ts',
  'src/core/cognitive-twin/reentry/decisionTransfer.ts',
  'src/core/cognitive-twin/reentry/decisionTransferRun.ts',
  'src/core/cognitive-twin/reentry/blindDecisionReconstruction.ts',
  'src/core/cognitive-twin/reentry/decisionTransferContext.ts',
  'src/core/cognitive-twin/reentry/decisionTransferContextIntegrity.ts',
  'src/core/cognitive-twin/reentry/decisionTransferTargetTiming.ts',
  'src/core/cognitive-twin/reentry/decisionTransferEvaluationEvidence.ts',
  'src/core/cognitive-twin/reentry/decisionTransferEvaluationEvidenceIntegrity.ts',
  'src/core/cognitive-twin/reentry/decisionTransferExperimentRegistration.ts',
  'src/core/cognitive-twin/reentry/decisionTransferExperimentRegistrationIntegrity.ts',
  'src/core/cognitive-twin/reentry/decisionTransferExperimentFreeze.ts',
  'src/app/api/root/method-lab/decision-transfer/route.ts',
  'src/app/api/root/method-lab/decision-transfer/blind/route.ts',
  'src/app/api/root/method-lab/decision-transfer/register/route.ts',
  'src/app/api/root/method-lab/decision-transfer/reveal/route.ts',
];

for (const file of [...instrumentFiles, uiPath, manifestPath]) {
  assert(fs.existsSync(path.join(process.cwd(), file)), `missing:${file}`);
}

function normalizedInstrumentFile(file: string) {
  const content = read(file).replace(/\r\n/g, '\n');
  if (file !== freezePath) return content;
  return content.replace(
    /export const SFI_DT_INSTRUMENT_SOURCE_HASH = '[0-9a-f]{64}' as const;/i,
    "export const SFI_DT_INSTRUMENT_SOURCE_HASH = '<SELF>' as const;",
  );
}

const instrumentSourceMaterial = instrumentFiles
  .map((file) => `${file}\n${normalizedInstrumentFile(file)}`)
  .join('\n---SFI-DT-INSTRUMENT-FILE---\n');
const computedInstrumentSourceHash = sha256(instrumentSourceMaterial);

const freeze = read(freezePath);
const registration = read(registrationPath);
const registrationIntegrity = read(registrationIntegrityPath);
const evidence = read(evidencePath);
const evidenceIntegrity = read(evidenceIntegrityPath);
const blindRoute = read(blindRoutePath);
const registerRoute = read(registerRoutePath);
const revealRoute = read(revealRoutePath);
const ui = read(uiPath);
const manifest = JSON.parse(read(manifestPath)) as Record<string, unknown>;

const frozenHashMatch = freeze.match(/SFI_DT_INSTRUMENT_SOURCE_HASH = '([0-9a-f]{64})'/i);
assert(Boolean(frozenHashMatch), 'instrument_source_hash_constant_missing');
assert(
  frozenHashMatch?.[1] === computedInstrumentSourceHash,
  `instrument_source_hash_mismatch:expected=${computedInstrumentSourceHash}:actual=${frozenHashMatch?.[1] ?? 'missing'}`,
);
assert(
  manifest.instrument_source_hash === computedInstrumentSourceHash,
  `manifest_instrument_source_hash_mismatch:expected=${computedInstrumentSourceHash}:actual=${String(manifest.instrument_source_hash ?? 'missing')}`,
);

assert(registration.includes("SFI_DT_EXPERIMENT_ID = 'EXP-001'"), 'exp001_registration_id_not_frozen');
assert(registration.includes("role: 'DECISION_TRANSFER_EXPERIMENT_REGISTRATION'"), 'registration_not_persisted_in_existing_run_store');
assert(registration.includes('DT_REGISTRATION_CONFLICT:EXP-001_ALREADY_FROZEN'), 'registration_conflict_gate_missing');
assert(registration.includes('DT_REGISTRATION_ARM_ALREADY_ATTEMPTED'), 'duplicate_arm_attempt_gate_missing');
assert(registration.includes('instrumentSourceHash: instrumentRevision.instrumentSourceHash'), 'registration_instrument_revision_missing');
assert(registrationIntegrity.includes('DT_REGISTRATION_INTEGRITY_RECEIPT_HASH_MISMATCH'), 'registration_receipt_integrity_gate_missing');
assert(registrationIntegrity.includes('DT_REGISTRATION_INTEGRITY_BLIND_CUTOFF_MISMATCH'), 'registration_cutoff_binding_missing');
assert(registrationIntegrity.includes('DT_REGISTRATION_INTEGRITY_BLIND_ARM_MISMATCH'), 'registration_arm_binding_missing');

const registrationIndex = blindRoute.indexOf('requireDecisionTransferExperimentRegistration({');
const freezeIndex = blindRoute.indexOf('applyDecisionTransferExperimentFreeze(raw)');
const llmIndex = blindRoute.indexOf('executeBlindDecisionReconstruction(input)');
assert(registrationIndex >= 0 && freezeIndex > registrationIndex && llmIndex > freezeIndex, 'blind_order_must_be_registration_then_freeze_then_llm');
assert(blindRoute.includes('bindDecisionTransferExperimentRegistration({'), 'blind_run_registration_binding_missing');
assert(registerRoute.includes("action: 'method_lab.decision_transfer.experiment_registered'"), 'registration_root_audit_missing');
assert(ui.includes('REGISTER EXP-001'), 'method_lab_registration_control_missing');
assert(ui.includes('Primero registre EXP-001'), 'method_lab_blind_must_require_registration');

assert(freeze.includes('DT_INSTRUMENT_SOURCE_HASH_NOT_FROZEN'), 'source_hash_runtime_fail_closed_missing');
assert(freeze.includes('DT_INSTRUMENT_RUNTIME_COMMIT_UNAVAILABLE'), 'runtime_commit_presence_gate_missing');
assert(freeze.includes('instrumentSourceHash: instrumentRevision.instrumentSourceHash'), 'model_contract_instrument_hash_missing');
assert(evidence.includes('modelContractHash'), 'evaluation_receipt_model_contract_hash_missing');

assert(evidenceIntegrity.includes("from('root_evidence_entries').select('id')"), 'canonical_evidence_id_requery_missing');
assert(evidenceIntegrity.includes('DT_EVIDENCE_NONCANONICAL_EVIDENCE_IDS'), 'unknown_evidence_id_rejection_missing');
assert(evidenceIntegrity.includes('DT_EVIDENCE_UNIQUE_EVIDENCE_COUNT_MISMATCH'), 'evidence_count_integrity_gate_missing');
assert(evidenceIntegrity.includes("from('epistemic_events').select('event_id')"), 'canonical_event_id_requery_missing');
assert(evidenceIntegrity.includes('DT_EVIDENCE_NONCANONICAL_EVENT_IDS'), 'unknown_event_id_rejection_missing');

const revealRegistrationIndex = revealRoute.indexOf('verifyDecisionTransferExperimentRegistrationBound(input.blindRunId)');
const revealEvidenceMaterializeIndex = revealRoute.indexOf('materializeDecisionTransferEvaluationEvidence({');
const revealCanonicalIdIndex = revealRoute.indexOf('verifyDecisionTransferEvaluationEvidenceCanonicalIds(frozen.receipt)');
const revealScoreIndex = revealRoute.indexOf('executeBlindDecisionReveal(inputForScoring');
assert(revealRegistrationIndex >= 0 && revealEvidenceMaterializeIndex > revealRegistrationIndex, 'reveal_registration_must_precede_evidence_materialization');
assert(revealCanonicalIdIndex > revealEvidenceMaterializeIndex && revealScoreIndex > revealCanonicalIdIndex, 'canonical_id_verification_must_precede_scoring');
assert(revealRoute.includes('experimentRegistrationHash: registrationIntegrity.registrationHash'), 'root_audit_registration_hash_missing');
assert(revealRoute.includes('canonicalEvidenceObjectCount: canonicalEvidenceIntegrity.uniqueEvidenceObjects'), 'root_audit_canonical_evidence_count_missing');

assert(manifest.status === 'EXPERIMENTALLY_FROZEN', 'manifest_not_frozen');
assert(manifest.registration_status === 'AWAITING_NATURALISTIC_TARGET', 'manifest_registration_state_drifted');
assert(manifest.primary_endpoint === 'validated_structural_fidelity', 'primary_endpoint_drifted');
assert(manifest.primary_contrast === 'CT_FULL-B5_RULE_STRUCTURE', 'primary_contrast_drifted');
assert(manifest.claim_boundary === 'N_subject=1', 'claim_boundary_drifted');

console.log(JSON.stringify({
  ok: true,
  gate: 'SFI_DT_FINAL_EXPERIMENT_FREEZE',
  protocol: 'SFI-DT-1.0',
  experimentId: 'EXP-001',
  instrumentSourceHash: computedInstrumentSourceHash,
  registration: 'PERSISTED_IMMUTABLE_REQUIRED_BEFORE_FREEZE',
  duplicateArmAttempts: 'REJECTED',
  canonicalEvidenceIds: 'REVERIFIED_BEFORE_SCORING',
  runtimeRevision: 'CONTENT_HASH_FROZEN_PLUS_RUNTIME_COMMIT_RECORDED',
}, null, 2));
