import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { SFI_DT_EXP_001_FREEZE } from '../src/core/cognitive-twin/reentry/decisionTransferExperimentFreeze';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

assert.equal(SFI_DT_EXP_001_FREEZE.status, 'EXPERIMENTALLY_FROZEN');
assert.equal(SFI_DT_EXP_001_FREEZE.registrationStatus, 'AWAITING_NATURALISTIC_TARGET');
assert.equal(SFI_DT_EXP_001_FREEZE.claimBoundary.nSubjects, 1);
assert.equal(SFI_DT_EXP_001_FREEZE.claimBoundary.allowsPopulationGeneralization, false);
assert.equal(SFI_DT_EXP_001_FREEZE.claimBoundary.allowsPhenomenalClaims, false);
assert.equal(SFI_DT_EXP_001_FREEZE.claimBoundary.allowsIdentityEquivalenceClaims, false);
assert.equal(SFI_DT_EXP_001_FREEZE.claimBoundary.allowsCausalSuperiorityClaims, false);
assert.equal(SFI_DT_EXP_001_FREEZE.primaryEndpoint, 'validated_structural_fidelity');
assert.equal(SFI_DT_EXP_001_FREEZE.primaryContrast, 'CT_FULL-B5_RULE_STRUCTURE');
assert.equal(SFI_DT_EXP_001_FREEZE.arms.length, 7);
assert.equal(SFI_DT_EXP_001_FREEZE.epistemicBoundary.simulationCanSatisfyValidationGate, false);
assert.equal(SFI_DT_EXP_001_FREEZE.epistemicBoundary.automaticRulePromotion, false);
assert.equal(SFI_DT_EXP_001_FREEZE.epistemicBoundary.automaticMemoryMutation, false);
assert.equal(SFI_DT_EXP_001_FREEZE.confirmatoryExecution.manualEvidenceCountsAllowed, false);
assert.equal(SFI_DT_EXP_001_FREEZE.confirmatoryExecution.executionStateWithoutRegisteredTarget, 'BLOCKED');
assert.equal(SFI_DT_EXP_001_FREEZE.targetRegistration.state, 'PENDING_PRE_TARGET_REGISTRATION');

const weightTotal = Object.values(SFI_DT_EXP_001_FREEZE.structuralWeights).reduce((sum, value) => sum + value, 0);
assert.ok(Math.abs(weightTotal - 1) < Number.EPSILON * 8, 'decision_transfer_structural_weights_must_sum_to_one');

const runSource = read('src/core/cognitive-twin/reentry/decisionTransferRun.ts');
assert.ok(runSource.includes("'OBSERVED'"), 'current_dt_run_missing_observed_class');
assert.ok(runSource.includes("'VERIFIED_CONTRAST'"), 'current_dt_run_missing_verified_contrast_class');
assert.ok(runSource.includes("'SIMULATED'"), 'current_dt_run_missing_simulated_class');
assert.ok(runSource.includes("return 'BLOCKED'"), 'current_dt_run_missing_fail_closed_blocked_semantics');
assert.ok(runSource.includes("data_mode: 'DERIVED'"), 'current_dt_run_projection_not_derived');
assert.ok(runSource.includes('promotionAllowed: false'), 'current_dt_run_allows_automatic_promotion');

for (const required of [
  'src/core/cognitive-twin/reentry/blindDecisionReconstruction.ts',
  'src/core/cognitive-twin/reentry/decisionTransferContext.ts',
  'src/core/cognitive-twin/reentry/decisionTransferTargetTiming.ts',
  'scripts/qa-sfi-decision-transfer-blind.ts',
  'scripts/qa-sfi-decision-transfer-context.ts',
  'scripts/qa-sfi-decision-transfer-target-timing.ts',
  'scripts/cognitive-spine/qa-decision-transfer-isolation.ts',
]) {
  assert.ok(read(required).length > 0, `${required}:missing_current_decision_transfer_contract`);
}

const freezeDoc = read('docs/research/decision-transfer/SFI-DT-EXP-001-FREEZE-CURRENT.md');
assert.ok(freezeDoc.includes('EXPERIMENTALLY_FROZEN'), 'dt_freeze_doc_missing_status');
assert.ok(freezeDoc.includes('AWAITING_NATURALISTIC_TARGET'), 'dt_freeze_doc_missing_registration_boundary');
assert.ok(freezeDoc.includes('BLOCKED_UNTIL_TARGET'), 'dt_freeze_doc_missing_confirmatory_block');
assert.ok(freezeDoc.includes('PR_220 = SUPERSEDED_AFTER_PORT'), 'dt_freeze_doc_missing_legacy_disposition');

const resetSource = read('scripts/db/reset-sfi-operational-tables.mjs');
const snapshotSource = read('scripts/db/create-db-evidence-snapshot.mjs');
const snapshotVerifier = read('scripts/db/verify-db-evidence-snapshot.mjs');
const resetClassification = read('scripts/db/sfi-canonical-reset-classification.mjs');
const resetWorkflow = read('.github/workflows/sfi-db-canonical-reset.yml');

assert.ok(resetSource.includes('SFI_DB_RESET_CONFIRM'), 'database_reset_missing_explicit_confirmation');
assert.ok(resetSource.includes('SFI_DB_RESET_MODE'), 'database_reset_missing_mode_confirmation');
assert.ok(resetSource.includes('SFI_DB_SNAPSHOT_RECEIPT'), 'database_reset_missing_snapshot_receipt');

// Target binding is stronger than the retired project-ref helper: the receipt is
// generated from the same direct PostgreSQL connection, carries host/database and
// exact public-table inventory, and the reset rechecks all of them immediately
// before the transaction. Any drift fails closed.
assert.ok(resetSource.includes('directHost'), 'database_reset_missing_direct_host_binding');
assert.ok(resetSource.includes('directDatabase'), 'database_reset_missing_direct_database_binding');
assert.ok(resetSource.includes('snapshot.database_host'), 'database_reset_missing_snapshot_host_binding');
assert.ok(resetSource.includes('snapshot.database_name'), 'database_reset_missing_snapshot_database_binding');
assert.ok(resetSource.includes('Snapshot target mismatch'), 'database_reset_missing_target_mismatch_failure');
assert.ok(resetSource.includes('liveTables'), 'database_reset_missing_live_schema_binding');
assert.ok(resetSource.includes('snapshotTables'), 'database_reset_missing_snapshot_schema_binding');
assert.ok(resetSource.includes('public schema drift'), 'database_reset_missing_schema_drift_failure');
assert.ok(resetSource.includes('CLASSIFIED_PUBLIC_TABLES'), 'database_reset_missing_exhaustive_classification_binding');
assert.ok(resetSource.includes('preserve_exact_counts'), 'database_reset_missing_world_count_binding');
assert.ok(resetSource.includes('SFI_DB_EXTERNAL_ARTIFACT_ID'), 'database_reset_missing_external_proof_artifact');
assert.ok(resetSource.includes('SFI_DB_EXTERNAL_ARTIFACT_DIGEST'), 'database_reset_missing_external_proof_digest');
assert.ok(resetSource.includes('pg_advisory_xact_lock'), 'database_reset_missing_transaction_lock');
assert.ok(resetSource.includes('Public schema drift detected inside reset transaction'), 'database_reset_missing_in_transaction_schema_recheck');
assert.ok(resetSource.includes('PRESERVE_DATA_TABLES'), 'database_reset_missing_protected_world_inventory');
assert.ok(resetSource.includes('NO_DEPENDENCY_PROPAGATION'), 'database_reset_missing_preservation_dependency_invariant');

assert.ok(snapshotSource.includes('SFI_DB_EVIDENCE_SNAPSHOT_V2'), 'database_snapshot_not_v2');
assert.ok(snapshotSource.includes('public-tables.json'), 'database_snapshot_missing_public_table_inventory');
assert.ok(snapshotSource.includes('reset-classification.json'), 'database_snapshot_missing_reset_classification');
assert.ok(snapshotSource.includes('preserve_exact_counts'), 'database_snapshot_missing_preserve_counts');
assert.ok(snapshotVerifier.includes('SFI_DB_EVIDENCE_RECEIPT_V2'), 'database_snapshot_verifier_not_v2');
assert.ok(snapshotVerifier.includes('reset_classification_sha256'), 'database_snapshot_verifier_missing_classification_hash');
assert.ok(resetClassification.includes('SFI-CANONICAL-RESET-CLASSIFICATION-1.1'), 'database_reset_missing_world_preservation_amendment');
for (const worldTable of [
  'world_source_observations',
  'world_friction_readings',
  'world_hypotheses',
  'world_hypothesis_outcomes',
  'world_learning_events',
  'worldspect_snapshots',
  'world_vector_cycles',
  'world_vector_observations',
  'world_vector_reports',
  'world_vector_alerts',
]) {
  assert.ok(resetClassification.includes(`'${worldTable}'`), `database_reset_missing_protected_world_table:${worldTable}`);
}
assert.ok(
  resetWorkflow.indexOf('Upload proof before any destructive statement') < resetWorkflow.indexOf('Execute founder-authorized canonical reset'),
  'database_reset_external_proof_must_precede_destruction',
);

const databaseClosure = read('docs/db/SFI_FINAL_DATABASE_CLOSURE.md');
assert.ok(databaseClosure.includes('EVIDENCE_FIRST_PRE_ASSURANCE_RESET'), 'database_cleanup_missing_current_execution_order');
assert.ok(databaseClosure.includes('FINAL_E2E_AFTER_CLEAN_GENESIS'), 'database_cleanup_missing_post_reset_assurance_order');
assert.ok(databaseClosure.includes('SFI-CANONICAL-RESET-CLASSIFICATION-1.1'), 'database_cleanup_missing_world_preservation_contract');
assert.ok(databaseClosure.includes('PR_210_IMPLEMENTATION = SUPERSEDED_BY_CURRENT_ARCHITECTURE'), 'database_cleanup_missing_legacy_disposition');

console.log(JSON.stringify({
  ok: true,
  debtClosure: 'SFI-FINAL-DEBT-CLOSURE-1.1',
  decisionTransfer: {
    protocol: SFI_DT_EXP_001_FREEZE.protocol,
    status: SFI_DT_EXP_001_FREEZE.status,
    registration: SFI_DT_EXP_001_FREEZE.registrationStatus,
    primaryEndpoint: SFI_DT_EXP_001_FREEZE.primaryEndpoint,
    primaryContrast: SFI_DT_EXP_001_FREEZE.primaryContrast,
    confirmatoryWithoutTarget: SFI_DT_EXP_001_FREEZE.confirmatoryExecution.executionStateWithoutRegisteredTarget,
    legacyPr220: 'SUPERSEDED_AFTER_PORT',
  },
  database: {
    cleanup: 'EVIDENCE_FIRST_PRE_ASSURANCE_RESET',
    finalE2E: 'AFTER_CLEAN_GENESIS',
    explicitConfirmationRequired: true,
    verifiedSnapshotRequired: true,
    externalProofArtifactRequired: true,
    exactTargetBindingRequired: true,
    protectedWorldTables: 10,
    legacyPr210: 'SUPERSEDED_BY_CURRENT_ARCHITECTURE',
  },
}, null, 2));
