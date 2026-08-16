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
assert.ok(resetSource.includes("SFI_DB_RESET_CONFIRM"), 'database_reset_missing_explicit_confirmation');
assert.ok(resetSource.includes("SFI_DB_RESET_MODE"), 'database_reset_missing_mode_confirmation');
assert.ok(resetSource.includes("SFI_DB_SNAPSHOT_RECEIPT"), 'database_reset_missing_snapshot_receipt');
assert.ok(resetSource.includes('assertSnapshotTargetsResetDatabase'), 'database_reset_missing_target_binding');
assert.ok(resetSource.includes('PROTECTED_TABLES'), 'database_reset_missing_protected_inventory');

const databaseClosure = read('docs/db/SFI_FINAL_DATABASE_CLOSURE.md');
assert.ok(databaseClosure.includes('RESERVED_FINAL_OPERATION'), 'database_cleanup_not_reserved_for_terminal_boundary');
assert.ok(databaseClosure.includes('PRODUCTION_RESET_NOW = PROHIBITED'), 'database_cleanup_can_run_during_active_construction');
assert.ok(databaseClosure.includes('PR_210_IMPLEMENTATION = SUPERSEDED_BY_CURRENT_ARCHITECTURE'), 'database_cleanup_missing_legacy_disposition');

console.log(JSON.stringify({
  ok: true,
  debtClosure: 'SFI-FINAL-DEBT-CLOSURE-1.0',
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
    cleanup: 'RESERVED_FINAL_OPERATION',
    resetNow: 'PROHIBITED',
    explicitConfirmationRequired: true,
    verifiedSnapshotRequired: true,
    legacyPr210: 'SUPERSEDED_BY_CURRENT_ARCHITECTURE',
  },
}, null, 2));
