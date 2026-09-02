import fs from 'node:fs';
import path from 'node:path';

function read(relative: string) {
  return fs.readFileSync(path.join(process.cwd(), relative), 'utf8');
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`SFI_DECISION_TRANSFER_BLIND_QA:${message}`);
}

const runtimePath = 'src/core/cognitive-twin/reentry/blindDecisionReconstruction.ts';
const commitmentPath = 'src/core/cognitive-twin/reentry/decisionCommitment.ts';
const integrityPath = 'src/core/cognitive-twin/reentry/blindDecisionIntegrity.ts';
const blindRoutePath = 'src/app/api/root/method-lab/decision-transfer/blind/route.ts';
const revealRoutePath = 'src/app/api/root/method-lab/decision-transfer/reveal/route.ts';
const scenesPath = 'src/components/sfi/scenes.ts';
const liveUiPath = 'src/components/sfi/SfiConsole.tsx';
const operatingUiPath = 'src/components/sfi/SfiOperatingWorkspace.tsx';
const methodLabPagePath = 'src/app/method-lab/page.tsx';
const methodLabHubPath = 'src/components/sfi/MethodLabNativeHub.tsx';

for (const file of [runtimePath, commitmentPath, integrityPath, blindRoutePath, revealRoutePath, scenesPath, liveUiPath, operatingUiPath, methodLabPagePath, methodLabHubPath]) {
  assert(fs.existsSync(path.join(process.cwd(), file)), `missing:${file}`);
}

const runtime = read(runtimePath);
const commitment = read(commitmentPath);
const integrity = read(integrityPath);
const blindRoute = read(blindRoutePath);
const revealRoute = read(revealRoutePath);
const scenes = read(scenesPath);
const liveUi = read(liveUiPath);
const operatingUi = read(operatingUiPath);
const methodLabPage = read(methodLabPagePath);
const methodLabHub = read(methodLabHubPath);

assert(blindRoute.includes("requireRootActor('root.method-lab.decision-transfer.blind')"), 'blind_route_root_gate_missing');
assert(revealRoute.includes("requireRootActor('root.method-lab.decision-transfer.reveal')"), 'reveal_route_root_gate_missing');
assert(blindRoute.includes('auditRootAction'), 'blind_route_audit_missing');
assert(revealRoute.includes('auditRootAction'), 'reveal_route_audit_missing');
assert(revealRoute.includes('verifyBlindDecisionContextIntegrity(input.blindRunId)'), 'frozen_context_integrity_gate_missing');
assert(revealRoute.indexOf('verifyBlindDecisionContextIntegrity(input.blindRunId)') < revealRoute.indexOf('executeBlindDecisionReveal(input'), 'context_integrity_must_precede_reveal');

const blindSchema = runtime.slice(runtime.indexOf('export const blindDecisionRunInputSchema'), runtime.indexOf('const predictionSchema'));
assert(blindSchema.includes('targetCommitmentSha256'), 'blind_input_commitment_missing');
assert(!blindSchema.includes('target: targetTraceSchema'), 'blind_input_must_not_receive_target');
assert(!blindSchema.includes('commitmentSalt'), 'blind_input_must_not_receive_reveal_salt');
assert(runtime.includes("status: 'EVIDENCE_PENDING'"), 'blind_run_must_freeze_before_reveal');
assert(runtime.includes("role: 'DECISION_TRANSFER_BLIND_RECONSTRUCTOR'"), 'blind_run_role_missing');
assert(runtime.includes("protocolBoundary: 'TARGET_DECISION_ABSENT_UNTIL_COMMITMENT_VERIFIED_REVEAL'"), 'pre_reveal_boundary_missing');
assert(runtime.includes('BLIND_CONTEXT_CONTAINS_TARGET_TRACE'), 'target_trace_leak_guard_missing');
assert(runtime.includes('BLIND_CONTEXT_TARGET_KEY_FORBIDDEN'), 'target_key_leak_guard_missing');
assert(runtime.includes('BLIND_PROVIDER_FALLBACK_REJECTED'), 'strict_provider_guard_missing');
assert(runtime.includes("fallbackResult: '{}'"), 'provider_router_fallback_must_be_non_evidentiary');
assert(runtime.includes('if (!llm.ok) throw'), 'degraded_llm_must_not_create_fake_prediction');
assert(runtime.includes('predictionHash'), 'prediction_integrity_hash_missing');
assert(runtime.includes('selectedContextHash'), 'context_integrity_hash_missing');
assert(runtime.includes('contextPoolHash'), 'context_pool_hash_missing');

assert(integrity.includes("contract_version !== 'SFI-CT-BLIND-DECISION-1.0'"), 'blind_contract_integrity_missing');
assert(integrity.includes("role !== 'DECISION_TRANSFER_BLIND_RECONSTRUCTOR'"), 'blind_role_integrity_missing');
assert(integrity.includes("status !== 'EVIDENCE_PENDING'"), 'blind_status_integrity_missing');
assert(integrity.includes("throw new Error('BLIND_CONTEXT_INTEGRITY_MISMATCH')"), 'selected_context_hash_verification_missing');
assert(integrity.includes('sha256(canonicalJson(snapshot.selectedContext))'), 'selected_context_rehash_missing');

const commitmentCheckIndex = runtime.indexOf("if (revealedCommitment !== commitment) throw new Error('BLIND_REVEAL_COMMITMENT_MISMATCH')");
const evaluationIndex = runtime.indexOf('executeDecisionTransferEvaluation({');
assert(commitmentCheckIndex >= 0, 'commitment_verification_missing');
assert(evaluationIndex > commitmentCheckIndex, 'evaluation_must_happen_after_commitment_verification');
assert(runtime.includes(".update({ status: 'VERIFYING' })"), 'reveal_lock_missing');
assert(runtime.includes(".eq('status', 'EVIDENCE_PENDING')"), 'reveal_compare_and_set_missing');
assert(runtime.includes("status: 'CLOSED'"), 'blind_run_close_missing');

assert(commitment.includes("protocol: 'SFI-DT-TARGET-COMMITMENT-1.0'"), 'commitment_protocol_version_missing');
assert(commitment.includes('Object.keys(record)') && commitment.includes('.sort()'), 'commitment_must_use_canonical_key_order');

for (const forbidden of ["from('sfi_amv_memory')", "from('sfi_cognitive_twin_memory')", 'recordCognitiveTwinExperience']) {
  assert(!runtime.includes(forbidden), `blind_runtime_must_not_mutate_memory:${forbidden}`);
  assert(!integrity.includes(forbidden), `blind_integrity_must_not_mutate_memory:${forbidden}`);
}

// FALSIFICATION/MODELS are absorbed legacy scenes. The blind protocol remains
// executable only through Method Lab and observable/governed through ROOT + TWIN/SPINE.
assert(scenes.includes("root:{key:'root'"), 'blind_experiment_root_scene_missing');
assert(scenes.includes("twin:{key:'twin'"), 'blind_experiment_twin_scene_missing');
assert(/LEGACY_INTERNAL_SCENES=.*'falsification'.*'models'/s.test(scenes), 'blind_experiment_legacy_surface_absorption_missing');
assert(liveUi.includes('COGNITIVE TWIN'), 'blind_experiment_twin_observability_missing');
assert(operatingUi.includes('ACEPTAR') && operatingUi.includes('DENEGAR'), 'blind_experiment_root_authority_missing');
assert(operatingUi.includes('PEDIR EVIDENCIA'), 'blind_experiment_evidence_deferral_missing');
assert(methodLabPage.includes('MethodLabNativeHub'), 'blind_experiment_method_lab_surface_missing');
assert(methodLabHub.includes('/blind') && methodLabHub.includes('/contrast'), 'blind_experiment_native_controls_missing');

console.log(JSON.stringify({
  ok: true,
  gate: 'SFI_DECISION_TRANSFER_BLIND',
  commitment: 'SFI-DT-TARGET-COMMITMENT-1.0',
  predictionStatusBeforeReveal: 'EVIDENCE_PENDING',
  blindTargetTransmission: false,
  frozenContextReverifiedBeforeReveal: true,
  nativeSurface: 'METHOD LAB + ROOT + TWIN/SPINE',
  legacySurfacesAbsorbed: ['FALSIFICATION', 'MODELS'],
  memoryMutation: false,
  autoPromotion: false,
  routes: [
    '/api/root/method-lab/decision-transfer/blind',
    '/api/root/method-lab/decision-transfer/reveal',
  ],
}, null, 2));
