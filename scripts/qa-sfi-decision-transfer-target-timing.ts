import fs from 'node:fs';
import path from 'node:path';

function read(relative: string) { return fs.readFileSync(path.join(process.cwd(), relative), 'utf8'); }
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`SFI_DECISION_TRANSFER_TARGET_TIMING_QA:${message}`);
}

const timingPath = 'src/core/cognitive-twin/reentry/decisionTransferTargetTiming.ts';
const revealRoutePath = 'src/app/api/root/method-lab/decision-transfer/reveal/route.ts';
assert(fs.existsSync(timingPath), 'timing_verifier_missing');
const timing = read(timingPath);
const revealRoute = read(revealRoutePath);

assert(timing.includes("protocol) !== 'SFI-DT-CONTEXT-MATERIALIZATION-1.0'"), 'canonical_context_receipt_contract_gate_missing');
assert(timing.includes("source) !== 'CANONICAL_MATERIALIZED'"), 'canonical_context_source_gate_missing');
assert(timing.includes("text(receipt.targetTraceId) !== input.target.traceId"), 'receipt_target_binding_missing');
assert(timing.includes('DT_TARGET_TIMING_RECEIPT_INTEGRITY_MISMATCH'), 'receipt_hash_integrity_gate_missing');
assert(timing.includes('sha256(canonicalJson(receiptBase))'), 'receipt_rehash_missing');
assert(timing.includes("const ROOT_EVIDENCE_PREFIX = 'root_evidence_entries:'"), 'canonical_target_evidence_ref_prefix_missing');
assert(timing.includes('targetRefMatchesEvidenceId'), 'explicit_target_evidence_binding_missing');
assert(timing.includes("from('root_evidence_entries')"), 'root_target_evidence_read_missing');
assert(timing.includes("from('epistemic_events')"), 'target_epistemic_event_read_missing');
assert(timing.includes("text(event.epistemic_class) !== 'observed'"), 'target_event_must_be_observed');
assert(timing.includes('occurredMs <= cutoffMs'), 'target_event_must_be_strictly_after_cutoff');
assert(timing.includes('DT_TARGET_TIMING_NO_POST_CUTOFF_OBSERVED_EVIDENCE'), 'post_cutoff_observed_evidence_required');
assert(timing.includes("status: 'NOT_APPLICABLE_MANUAL_CONTEXT'"), 'manual_context_compatibility_boundary_missing');
assert(timing.includes("protocol: 'SFI-DT-TARGET-TIMING-1.0'"), 'target_timing_receipt_protocol_missing');
assert(timing.includes('proofHash: sha256(canonicalJson(proofBase))'), 'target_timing_proof_hash_missing');

for (const forbidden of ["from('sfi_amv_memory')", "from('sfi_cognitive_twin_memory')", 'recordCognitiveTwinExperience']) {
  assert(!timing.includes(forbidden), `timing_verifier_must_not_mutate_or_read_memory:${forbidden}`);
}

assert(revealRoute.includes('verifyBlindDecisionContextIntegrity(input.blindRunId)'), 'selected_context_integrity_gate_missing');
assert(revealRoute.includes('verifyRevealedTargetAfterContextCutoff'), 'target_timing_gate_missing');
const timingIndex = revealRoute.indexOf('verifyRevealedTargetAfterContextCutoff({');
const revealIndex = revealRoute.indexOf('executeBlindDecisionReveal(input');
assert(timingIndex >= 0 && revealIndex > timingIndex, 'target_timing_gate_must_precede_reveal_and_scoring');
assert(revealRoute.includes('targetTimingProofHash'), 'target_timing_audit_hash_missing');
assert(revealRoute.includes('verifiedTargetObservationEvidenceIds'), 'verified_target_evidence_audit_missing');
assert(revealRoute.includes('earliestObservedTargetAt'), 'target_observed_time_audit_missing');

console.log(JSON.stringify({
  ok: true,
  gate: 'SFI_DECISION_TRANSFER_TARGET_TIMING',
  protocol: 'SFI-DT-TARGET-TIMING-1.0',
  canonicalContextRequiresPostCutoffTargetProof: true,
  targetEvidenceClass: 'OBSERVED',
  targetEvidenceTimeRelation: 'occurred_at > cutoffAt',
  manualContextCompatibility: 'NOT_APPLICABLE',
  memoryMutation: false,
}, null, 2));
