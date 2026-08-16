import fs from 'node:fs';
import path from 'node:path';

function read(relative: string) { return fs.readFileSync(path.join(process.cwd(), relative), 'utf8'); }
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`SFI_DECISION_TRANSFER_CONTEXT_QA:${message}`);
}

const materializerPath = 'src/core/cognitive-twin/reentry/decisionTransferContext.ts';
const integrityPath = 'src/core/cognitive-twin/reentry/decisionTransferContextIntegrity.ts';
const routePath = 'src/app/api/root/method-lab/decision-transfer/blind/route.ts';
for (const file of [materializerPath, integrityPath, routePath]) {
  assert(fs.existsSync(path.join(process.cwd(), file)), `missing:${file}`);
}
const materializer = read(materializerPath);
const integrity = read(integrityPath);
const route = read(routePath);

for (const table of [
  'root_evidence_entries',
  'epistemic_events',
  'sfi_cognitive_lab_events',
  'sfi_amv_memory',
  'sfi_cognitive_twin_runs',
  'sfi_cognitive_twin_decisions',
]) {
  assert(materializer.includes(table), `canonical_source_missing:${table}`);
}

assert(materializer.includes("contextSource: z.literal('CANONICAL_MATERIALIZED')"), 'canonical_context_contract_missing');
assert(materializer.includes(".lte('occurred_at', cutoffIso)"), 'raw_history_temporal_cutoff_missing');
assert(materializer.includes(".lte('created_at', cutoffIso)"), 'created_at_temporal_cutoff_missing');
assert(materializer.includes(".lte('approved_at', cutoffIso)"), 'approved_rule_temporal_cutoff_missing');
assert(materializer.includes("verifiedMemoryStatuses = new Set(['VERIFIED', 'CANONICAL'])"), 'memory_must_be_verified_or_canonical');
assert(materializer.includes("terminalMemoryStatuses = new Set(['REJECTED', 'OBSOLETE', 'FOUNDER_RESERVED'])"), 'terminal_memory_suppression_missing');
assert(materializer.includes("['OBSERVED', 'VERIFIED_CONTRAST'].includes(trace.epistemicClass)"), 'decision_trace_validation_filter_missing');
assert(materializer.includes(".eq('status', 'APPROVED')"), 'rules_must_be_approved');
assert(materializer.includes("patternMaturities = new Set(['RECURRENT', 'CROSS_DOMAIN', 'CONTRASTED', 'STABLE_PATTERN', 'RULE_CANDIDATE'])"), 'persisted_pattern_maturity_filter_missing');
assert(materializer.includes('DT_CONTEXT_TARGET_ID_LEAK_AFTER_MATERIALIZATION'), 'post_materialization_target_leak_guard_missing');
assert(materializer.includes("protocol: 'SFI-DT-CONTEXT-MATERIALIZATION-1.0'"), 'materialization_receipt_protocol_missing');
assert(materializer.includes('contextPoolHash'), 'materialized_context_hash_missing');
assert(materializer.includes('receiptHash'), 'materialization_receipt_hash_missing');
assert(materializer.includes('contextMaterialization: receipt'), 'receipt_must_bind_to_blind_run');
assert(materializer.includes("role !== 'DECISION_TRANSFER_BLIND_RECONSTRUCTOR'"), 'receipt_bind_role_gate_missing');
assert(materializer.includes("status !== 'EVIDENCE_PENDING'"), 'receipt_bind_status_gate_missing');

assert(integrity.includes("role !== 'DECISION_TRANSFER_BLIND_RECONSTRUCTOR'"), 'receipt_verify_role_gate_missing');
assert(integrity.includes("status !== 'EVIDENCE_PENDING'"), 'receipt_verify_status_gate_missing');
assert(integrity.includes('DT_CONTEXT_BIND_VERIFY_RECEIPT_MISMATCH'), 'receipt_verify_hash_mismatch_guard_missing');
assert(integrity.includes('snapshot.contextMaterialization'), 'receipt_verify_snapshot_read_missing');

for (const forbidden of ["from('sfi_cognitive_twin_memory')", 'recordCognitiveTwinExperience', ".insert({\n    module: 'institutionalEventPipeline'"]) {
  assert(!materializer.includes(forbidden), `materializer_must_not_mutate_or_use_legacy_memory:${forbidden}`);
  assert(!integrity.includes(forbidden), `integrity_must_not_mutate_or_use_legacy_memory:${forbidden}`);
}

assert(route.includes('parseMaterializedBlindDecisionRequest'), 'blind_route_materialized_parser_missing');
assert(route.includes('materializeDecisionTransferContext'), 'blind_route_materializer_missing');
assert(route.includes('bindDecisionTransferContextReceipt'), 'blind_route_receipt_binding_missing');
assert(route.includes('verifyDecisionTransferContextReceiptBound'), 'blind_route_receipt_verification_missing');
assert(route.indexOf('bindDecisionTransferContextReceipt') < route.lastIndexOf('verifyDecisionTransferContextReceiptBound'), 'receipt_verification_must_follow_binding');
assert(route.includes("contextSource: materialized ? 'CANONICAL_MATERIALIZED' : 'MANUAL_CONTEXT_POOL'"), 'context_source_audit_missing');
assert(route.includes('contextMaterializationReceiptHash'), 'receipt_hash_audit_missing');
assert(route.includes('contextMaterializationVerified: Boolean(materialized)'), 'receipt_verified_audit_missing');

console.log(JSON.stringify({
  ok: true,
  gate: 'SFI_DECISION_TRANSFER_CANONICAL_CONTEXT',
  protocol: 'SFI-DT-CONTEXT-MATERIALIZATION-1.0',
  temporalCutoff: 'QUERY_LEVEL',
  memory: 'VERIFIED_OR_CANONICAL_ONLY',
  decisionTraces: 'OBSERVED_OR_VERIFIED_CONTRAST_ONLY',
  rules: 'APPROVED_ONLY',
  legacyMemory: false,
  memoryMutation: false,
  targetExactIdExcluded: true,
  receiptBindingVerified: true,
}, null, 2));
