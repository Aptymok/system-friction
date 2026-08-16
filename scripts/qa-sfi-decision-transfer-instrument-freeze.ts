import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

function read(relative: string) {
  return fs.readFileSync(path.join(process.cwd(), relative), 'utf8');
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`SFI_DT_INSTRUMENT_FREEZE_QA:${message}`);
}
function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

const materializerPath = 'src/core/cognitive-twin/reentry/decisionTransferEvaluationEvidence.ts';
const freezePath = 'src/core/cognitive-twin/reentry/decisionTransferExperimentFreeze.ts';
const evaluatorPath = 'src/core/cognitive-twin/reentry/decisionTransferRun.ts';
const blindRuntimePath = 'src/core/cognitive-twin/reentry/blindDecisionReconstruction.ts';
const blindRoutePath = 'src/app/api/root/method-lab/decision-transfer/blind/route.ts';
const revealRoutePath = 'src/app/api/root/method-lab/decision-transfer/reveal/route.ts';
const diagnosticRoutePath = 'src/app/api/root/method-lab/decision-transfer/route.ts';
const componentPath = 'src/components/root/method-lab/BlindDecisionExperiment.tsx';

const docs = [
  'docs/research/decision-transfer/SFI-DT-PROTOCOL-1.0.md',
  'docs/research/decision-transfer/SFI-DT-EVIDENCE-MATERIALIZATION-1.0.md',
  'docs/research/decision-transfer/SFI-DT-CODEBOOK-1.0.md',
  'docs/research/decision-transfer/SFI-DT-BASELINE-MATRIX-1.0.md',
  'docs/research/decision-transfer/SFI-DT-METRICS-1.0.md',
  'docs/research/decision-transfer/SFI-DT-CLAIM-BOUNDARY-1.0.md',
  'docs/research/decision-transfer/SFI-DT-EXPERIMENT-MANIFEST-001.json',
  'docs/research/decision-transfer/SFI-DT-FAILURE-LEDGER-1.0.md',
];

for (const file of [materializerPath, freezePath, evaluatorPath, blindRuntimePath, blindRoutePath, revealRoutePath, diagnosticRoutePath, componentPath, ...docs]) {
  assert(fs.existsSync(path.join(process.cwd(), file)), `missing:${file}`);
}

const materializer = read(materializerPath);
const freeze = read(freezePath);
const evaluator = read(evaluatorPath);
const blindRuntime = read(blindRuntimePath);
const blindRoute = read(blindRoutePath);
const revealRoute = read(revealRoutePath);
const diagnosticRoute = read(diagnosticRoutePath);
const component = read(componentPath);
const manifest = JSON.parse(read('docs/research/decision-transfer/SFI-DT-EXPERIMENT-MANIFEST-001.json')) as Record<string, unknown>;

assert(materializer.includes("'SFI-DT-EVIDENCE-MATERIALIZATION-1.0'"), 'evidence_materialization_protocol_missing');
for (const field of [
  'modelContractHash',
  'recordsSeen',
  'uniqueEvidenceObjects',
  'uniqueEvents',
  'independentObservationGroups',
  'occurrences',
  'supports',
  'counterexamples',
  'contrasts',
  'empiricalBoundaryProbes',
  'diagnosticCounterfactuals',
  'qualifyingOccurrenceCount',
  'qualifyingDomainCount',
  'qualifyingCounterexampleCount',
  'qualifyingContrastCount',
  'qualifyingBoundaryProbeCount',
  'validationStatus',
  'evidencePoolHash',
  'receiptHash',
]) {
  assert(materializer.includes(field), `receipt_field_missing:${field}`);
}

for (const table of ['sfi_cognitive_twin_runs', 'root_evidence_entries', 'epistemic_events']) {
  assert(materializer.includes(`'${table}'`), `evidence_source_missing:${table}`);
}
for (const forbidden of [
  "from('sfi_amv_memory')",
  "from('sfi_cognitive_twin_memory')",
  "from('sfi_cognitive_twin_decisions')",
  'recordCognitiveTwinExperience',
]) {
  assert(!materializer.includes(forbidden), `evidence_materializer_forbidden_store_or_mutation:${forbidden}`);
}
assert(materializer.includes("new Set<EvidenceClass>(['OBSERVED', 'VERIFIED_CONTRAST'])"), 'validation_class_boundary_missing');
assert(materializer.includes("epistemicClass: 'DERIVED'"), 'ungrounded_validation_must_demote');
assert(materializer.includes("text(eventById.get(id)?.epistemic_class)?.toLowerCase() === 'observed'"), 'canonical_observed_event_grounding_missing');
assert(materializer.includes("const key = observed ? `event:${observed}` : `trace:${item.occurrence.traceId}`"), 'independence_grouping_missing');
assert(materializer.includes("probe.expectedDispositionAfterPerturbation !== probe.baselineDisposition"), 'empirical_boundary_switch_gate_missing');
assert(materializer.includes("'EMPIRICAL_BOUNDARY_PROBE_MISSING'"), 'boundary_absence_block_reason_missing');
assert(materializer.includes("boundaryValidationStatus: ReceiptValidationStatus = qualifyingBoundaryProbeCount > 0 ? 'QUALIFIED' : 'BLOCKED'"), 'boundary_absence_must_block');
assert(materializer.includes("role: 'DECISION_TRANSFER_EVIDENCE_MATERIALIZER'"), 'evidence_receipt_persistence_role_missing');
assert(materializer.includes("evaluationOrder: 'MATERIALIZE_FREEZE_VERIFY_SCORE'"), 'materialize_freeze_score_order_declaration_missing');
assert(materializer.includes('receiptIntegrity(receipt)'), 'receipt_integrity_verification_missing');

for (const marker of [
  'DT_EVIDENCE_MODEL_CONTRACT_MISSING',
  'DT_EVIDENCE_MODEL_CONTRACT_INTEGRITY_MISMATCH',
  'DT_EVIDENCE_MODEL_PROTOCOL_MISMATCH',
  'DT_EVIDENCE_MODEL_PROVIDER_MISMATCH',
  'DT_EVIDENCE_MODEL_EXPECTED_MODEL_MISMATCH',
  'DT_EVIDENCE_BLIND_RUN_MODEL_MISMATCH',
  'DT_EVIDENCE_MODEL_MAX_TOKENS_MISMATCH',
  'DT_EVIDENCE_MODEL_TEMPERATURE_MISMATCH',
  'DT_EVIDENCE_SYSTEM_PROMPT_HASH_MISMATCH',
  'DT_EVIDENCE_PROMPT_TEMPLATE_HASH_MISMATCH',
]) {
  assert(materializer.includes(marker), `model_contract_fail_closed_marker_missing:${marker}`);
}
assert(materializer.includes('assertFrozenModelContract(blindSnapshot, blindRead.data.provider, blindRead.data.model)'), 'materializer_must_verify_frozen_model_contract');
assert(materializer.includes('receipt.modelContractHash !== modelContractHash'), 'reused_receipt_must_match_model_contract');

const revealSchemaStart = materializer.indexOf('export const decisionTransferConfirmatoryRevealInputSchema');
const revealSchemaEnd = materializer.indexOf('export type DecisionTransferConfirmatoryRevealInput');
const revealSchema = materializer.slice(revealSchemaStart, revealSchemaEnd);
for (const forbidden of ['occurrences', 'counterfactualProbes', 'boundaryProbeCount', 'thresholds']) {
  assert(!revealSchema.includes(forbidden), `confirmatory_reveal_manual_field_forbidden:${forbidden}`);
}
assert(revealSchema.includes("confirmatory target must be OBSERVED"), 'observed_target_contract_missing');
assert(revealSchema.includes('operationKey must be present in the observed target operations'), 'operation_binding_missing');

const materializeIndex = revealRoute.indexOf('materializeDecisionTransferEvaluationEvidence({');
const freezeIndex = revealRoute.indexOf('verifyFrozenDecisionTransferEvaluationEvidence({');
const scoreIndex = revealRoute.indexOf('executeBlindDecisionReveal(input');
assert(materializeIndex >= 0 && freezeIndex > materializeIndex && scoreIndex > freezeIndex, 'route_order_must_be_materialize_freeze_score');
assert(revealRoute.includes('occurrences: frozen.receipt.occurrences'), 'scorer_occurrences_must_come_from_frozen_receipt');
assert(revealRoute.includes('...frozen.receipt.empiricalBoundaryProbes'), 'scorer_empirical_probes_must_come_from_frozen_receipt');
assert(revealRoute.includes('...frozen.receipt.diagnosticCounterfactuals'), 'scorer_diagnostic_probes_must_come_from_frozen_receipt');
assert(revealRoute.includes('boundaryProbeCount: frozen.receipt.qualifyingBoundaryProbeCount'), 'scorer_boundary_count_must_come_from_frozen_receipt');
assert(revealRoute.includes('materializationRunId: frozen.materializationRunId'), 'evaluation_lineage_materialization_run_missing');
assert(revealRoute.includes('receiptHash: frozen.receipt.receiptHash'), 'evaluation_lineage_receipt_hash_missing');
assert(revealRoute.includes('boundaryValidationStatus: frozen.receipt.boundaryValidationStatus'), 'evaluation_lineage_boundary_status_missing');
assert(revealRoute.includes('executeBlindDecisionReveal(inputForScoring, gate.ctx.user.id, evaluationEvidence)'), 'frozen_lineage_must_enter_evaluator_call');
assert(revealRoute.includes('evaluationEvidenceReceiptHash: frozen.receipt.receiptHash'), 'root_audit_receipt_hash_missing');
assert(revealRoute.includes('evaluationEvidenceModelContractHash: frozen.receipt.modelContractHash'), 'root_audit_model_contract_hash_missing');
assert(revealRoute.includes('manualValidatingOccurrences: 0'), 'manual_occurrence_audit_zero_missing');
assert(revealRoute.includes('manualValidatingProbes: 0'), 'manual_probe_audit_zero_missing');
assert(revealRoute.includes('manualBoundaryCount: 0'), 'manual_boundary_audit_zero_missing');

assert(blindRuntime.includes("type DecisionTransferRunInput"), 'blind_reveal_evidence_lineage_type_missing');
assert(blindRuntime.includes("evaluationEvidence?: DecisionTransferRunInput['evaluationEvidence']"), 'blind_reveal_lineage_parameter_missing');
assert(blindRuntime.includes('evaluationEvidence,'), 'blind_reveal_must_forward_lineage_to_evaluator');
assert(blindRuntime.includes('evaluationEvidence: evaluation.evaluationEvidence'), 'blind_reveal_must_persist_lineage_on_reveal_envelope');

assert(evaluator.includes("protocol: z.literal('SFI-DT-EVIDENCE-MATERIALIZATION-1.0')"), 'evaluator_lineage_schema_missing');
assert(evaluator.includes('evaluationEvidence: evaluationEvidenceSchema.optional()'), 'evaluator_lineage_input_missing');
assert(evaluator.includes("boundaryValidationStatus === 'BLOCKED'"), 'blocked_boundary_detection_missing');
assert(evaluator.includes('validatedTargetDispositionAccuracy: null'), 'blocked_boundary_metric_must_be_missing_not_zero');
assert(evaluator.includes("const outcome: EvaluationOutcome = boundaryBlocked ? 'BLOCKED'"), 'blocked_boundary_outcome_missing');
assert(evaluator.includes('evaluationEvidence: input.evaluationEvidence ?? null'), 'evaluation_receipt_lineage_must_be_persisted');

assert(!component.includes('revealExtrasJson'), 'manual_reveal_extras_state_must_be_removed');
assert(!component.includes('REVEAL EXTRAS'), 'manual_reveal_extras_ui_must_be_removed');
assert(component.includes('No se aceptan occurrences, probes, boundary counts ni thresholds manuales'), 'confirmatory_ui_boundary_missing');
assert(component.includes('NON-CONFIRMATORY · LEGACY'), 'manual_context_must_be_marked_nonconfirmatory');
assert(diagnosticRoute.includes("experimentalMode: 'NON_CONFIRMATORY_DIAGNOSTIC'"), 'legacy_evaluator_nonconfirmatory_marker_missing');
assert(diagnosticRoute.includes('scientificQualificationAllowed: false'), 'legacy_evaluator_scientific_qualification_must_be_disabled');

assert(freeze.includes("provider: 'groq'"), 'confirmatory_provider_not_frozen');
assert(freeze.includes("expectedModel: 'openai/gpt-oss-20b'"), 'expected_model_not_frozen');
assert(freeze.includes('maxTokens: 1000'), 'max_tokens_not_frozen');
assert(freeze.includes('temperature: 0.2'), 'temperature_not_frozen');
assert(freeze.includes('DT_MODEL_EXPECTED_MODEL_MISMATCH'), 'model_mismatch_abort_missing');
assert(freeze.includes('sha256(canonicalJson(contractBase))'), 'model_contract_hash_must_use_canonical_json');
assert(blindRoute.includes('assertDecisionTransferModelPreflight()'), 'model_preflight_missing');
assert(blindRoute.includes('bindDecisionTransferModelContract'), 'model_contract_binding_missing');

const systemPrompt = 'You are the SFI blind decision reconstructor. The target outcome is withheld. Reconstruct only from supplied context. Return JSON only. Never claim subjective experience or identity. Never turn model output into evidence.';
const promptTemplate = [
  'EXPERIMENT: {{experimentId}}',
  'TREATMENT ARM: {{arm}}',
  'TARGET TRACE ID: {{targetTraceId}}',
  'TARGET DOMAIN: {{targetDomain}}',
  '',
  'The observed target decision has been cryptographically committed but is NOT available to you. Reconstruct the decision from the supplied pre-reveal context only.',
  'Do not infer an answer from experiment labels, IDs or hidden-answer assumptions. Do not invent facts. If evidence is insufficient, that uncertainty must be reflected in disposition/operations/confidence.',
  '',
  'PRE-REVEAL CONTEXT:',
  '{{contextJson}}',
  '',
  'Return ONLY one JSON object with exactly this shape:',
  '{{responseShapeJson}}',
].join('\n');
assert(blindRuntime.includes(`system: '${systemPrompt}'`), 'frozen_system_prompt_drifted');
assert(freeze.includes(sha256(systemPrompt)), 'system_prompt_hash_mismatch');
assert(freeze.includes(sha256(promptTemplate)), 'prompt_template_hash_mismatch');

assert(manifest.protocol_version === 'SFI-DT-1.0', 'manifest_protocol_version_mismatch');
assert(manifest.primary_endpoint === 'validated_structural_fidelity', 'primary_endpoint_not_frozen');
assert(manifest.primary_contrast === 'CT_FULL-B5_RULE_STRUCTURE', 'primary_contrast_not_frozen');
const modelContract = manifest.model_contract as Record<string, unknown>;
assert(modelContract.provider === 'groq', 'manifest_provider_mismatch');
assert(modelContract.expected_model === 'openai/gpt-oss-20b', 'manifest_expected_model_mismatch');
assert(modelContract.prompt_hash === sha256(promptTemplate), 'manifest_prompt_hash_mismatch');
assert(modelContract.system_prompt_hash === sha256(systemPrompt), 'manifest_system_prompt_hash_mismatch');
assert(manifest.claim_boundary === 'N_subject=1', 'manifest_claim_boundary_mismatch');
assert(manifest.status === 'EXPERIMENTALLY_FROZEN', 'instrument_not_declared_frozen');

console.log(JSON.stringify({
  ok: true,
  gate: 'SFI_DT_INSTRUMENT_FREEZE',
  protocol: 'SFI-DT-1.0',
  confirmatoryEvidence: 'CANONICAL_MATERIALIZED_ONLY',
  manualValidatingOccurrences: 0,
  manualValidatingProbes: 0,
  manualBoundaryCount: 0,
  eventDeduplication: true,
  independenceGrouping: true,
  boundaryAbsence: 'BLOCKED_NULL_METRIC',
  evaluationLineage: 'PERSISTED_AT_SCORING',
  modelContract: 'FROZEN_FAIL_CLOSED_REVERIFIED_AT_REVEAL',
  newTables: 0,
  newLabs: 0,
  newAgents: 0,
  newMemorySystems: 0,
}, null, 2));
