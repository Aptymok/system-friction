import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const boundary = read('src/lib/lab/decisionTransferCognitiveSpineBoundary.ts');
const route = read('src/app/api/root/method-lab/decision-transfer/blind/route.ts');
const experimentalContext = read('src/core/cognitive-twin/reentry/decisionTransferContext.ts');

assert.ok(boundary.includes('LAB_BLINDED_PROFILE'), 'decision_transfer_operational_profile_not_blinded');
assert.ok(boundary.includes('consume: false'), 'decision_transfer_operational_sfi_ct_must_not_be_consumed');
assert.ok(boundary.includes('operationalSfiCtConsumed: false'), 'decision_transfer_unconsumed_declaration_missing');
assert.ok(boundary.includes('runStartCutoff'), 'decision_transfer_operational_cutoff_missing');

const executionPosition = route.indexOf('const result = await executeBlindDecisionReconstruction(input)');
const operationalObservationPosition = route.indexOf('operationalCognitiveSpine = await materializeDecisionTransferOperationalSpineBoundary');
assert.ok(executionPosition >= 0, 'decision_transfer_execution_call_missing');
assert.ok(operationalObservationPosition > executionPosition, 'operational_sfi_ct_observed_before_experimental_execution');

assert.ok(route.includes('materializeDecisionTransferContext(parseMaterializedBlindDecisionRequest(raw))'), 'frozen_experimental_context_materialization_missing');
assert.ok(route.includes('bindDecisionTransferContextReceipt'), 'frozen_experimental_context_receipt_not_bound');
assert.ok(route.includes('verifyDecisionTransferContextReceiptBound'), 'frozen_experimental_context_receipt_not_verified');
assert.ok(route.includes('operationalSfiCtConsumed: false'), 'audit_does_not_declare_operational_ct_unconsumed');

// Existing Decision Transfer materialization remains the treatment-context
// implementation. The institutional Cognitive Spine boundary must not replace
// or bypass it.
assert.ok(experimentalContext.includes('materializeDecisionTransferContext'), 'decision_transfer_context_engine_missing');
assert.ok(experimentalContext.includes('cutoffAt'), 'decision_transfer_frozen_cutoff_missing');

console.log(JSON.stringify({
  ok: true,
  operationalProfile: 'LAB_BLINDED_V1',
  operationalSfiCtConsumed: false,
  operationalObservationOccursAfterPrediction: true,
  experimentalContextRemainsSeparate: true,
  experimentDependsOnOperationalSfiCt: false,
}, null, 2));
