import fs from 'node:fs';
import path from 'node:path';

function read(relative: string) {
  return fs.readFileSync(path.join(process.cwd(), relative), 'utf8');
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`SFI_DECISION_TRANSFER_OPERATIONAL_QA:${message}`);
}

const runPath = 'src/core/cognitive-twin/reentry/decisionTransferRun.ts';
const routePath = 'src/app/api/root/method-lab/decision-transfer/route.ts';
const readModelPath = 'src/lib/method-lab/readModel.ts';
const scenesPath = 'src/components/sfi/scenes.ts';
const liveUiPath = 'src/components/sfi/SfiConsole.tsx';
const operatingUiPath = 'src/components/sfi/SfiOperatingWorkspace.tsx';
const governanceUiPath = 'src/components/sfi/SfiGovernanceWorkspace.tsx';
const methodLabPagePath = 'src/app/method-lab/page.tsx';
const methodLabHubPath = 'src/components/sfi/MethodLabNativeHub.tsx';

for (const file of [runPath, routePath, readModelPath, scenesPath, liveUiPath, operatingUiPath, governanceUiPath, methodLabPagePath, methodLabHubPath]) {
  assert(fs.existsSync(path.join(process.cwd(), file)), `missing:${file}`);
}

const run = read(runPath);
const route = read(routePath);
const readModel = read(readModelPath);
const scenes = read(scenesPath);
const liveUi = read(liveUiPath);
const operatingUi = read(operatingUiPath);
const governanceUi = read(governanceUiPath);
const methodLabPage = read(methodLabPagePath);
const methodLabHub = read(methodLabHubPath);

assert(route.includes("requireRootActor('root.method-lab.decision-transfer.evaluate')"), 'route_must_require_root_actor');
assert(route.includes('auditRootAction'), 'route_must_audit_mutation');
assert(route.includes('executeDecisionTransferEvaluation'), 'route_must_use_canonical_evaluator');
assert(route.includes('ZodError'), 'route_must_return_structured_input_failure');

for (const table of ['sfi_cognitive_twin_runs', 'sfi_cognitive_twin_evaluations', 'sfi_lab_analyses']) {
  assert(run.includes(`from('${table}')`), `missing_persistence:${table}`);
}
assert(run.includes("status: 'CLOSED'"), 'evaluation_run_must_close_explicitly');
assert(run.includes("role: 'DECISION_TRANSFER_EVALUATOR'"), 'run_role_missing');
assert(run.includes("holdoutPolicy: 'TARGET_DECISION_MUST_BE_EXCLUDED_FROM_RECONSTRUCTION_CONTEXT_UNTIL_REVEAL'"), 'holdout_contamination_guard_missing');
assert(run.includes("evaluationStage: 'POST_REVEAL_SCORING'"), 'post_reveal_stage_missing');
assert(run.includes("outcome === 'BLOCKED'"), 'blocked_state_missing');
assert(run.includes('compensateInsert'), 'partial_persistence_compensation_missing');
assert(!run.includes('recordCognitiveTwinExperience'), 'decision_transfer_must_not_write_memory_automatically');
assert(!run.includes("from('sfi_amv_memory')"), 'decision_transfer_must_not_write_canonical_memory');
assert(!run.includes("from('sfi_cognitive_twin_memory')"), 'decision_transfer_must_not_write_historical_memory');

assert(readModel.includes(".like('test_key', 'decision_transfer:%')"), 'read_model_must_surface_persisted_evaluations');
assert(readModel.includes("ct_reentry: ['sfi_amv_memory'"), 'ct_reentry_must_probe_canonical_memory');
assert(!readModel.includes("ct_reentry: ['sfi_cognitive_twin_memory'"), 'historical_memory_must_not_be_canonical_dependency');
assert(readModel.includes('decisionTransfer'), 'read_model_summary_missing');
assert(readModel.includes('validatedDecisionAccuracy'), 'validated_holdout_metric_missing');
assert(readModel.includes('validatedTargetDispositionAccuracy'), 'validated_counterfactual_metric_missing');

// FALSIFICATION and MODELS were absorbed as parallel scenes. Decision Transfer remains
// a governed Method Lab instrument, observable through ROOT + TWIN/SPINE and the native Lab.
assert(scenes.includes("root:{key:'root'"), 'root_scene_missing');
assert(scenes.includes("twin:{key:'twin'"), 'twin_scene_missing');
assert(/LEGACY_INTERNAL_SCENES=.*'falsification'.*'models'/s.test(scenes), 'legacy_falsification_models_absorption_missing');
assert(liveUi.includes('COGNITIVE TWIN'), 'decision_transfer_twin_observability_missing');
assert(operatingUi.includes('SfiGovernanceWorkspace'), 'decision_transfer_governance_delegation_missing');
assert(governanceUi.includes('ACEPTAR') && governanceUi.includes('DENEGAR'), 'decision_transfer_authority_boundary_missing');
assert(governanceUi.includes('PEDIR EVIDENCIA'), 'decision_transfer_evidence_boundary_missing');
assert(methodLabPage.includes('MethodLabNativeHub'), 'decision_transfer_method_lab_surface_missing');
assert(methodLabHub.includes('DECISION TRANSFER'), 'decision_transfer_native_observability_missing');

console.log(JSON.stringify({
  ok: true,
  gate: 'SFI_DECISION_TRANSFER_OPERATIONAL',
  canonicalRoute: '/api/root/method-lab/decision-transfer',
  canonicalSurface: 'METHOD LAB + ROOT + TWIN/SPINE',
  legacySurfacesAbsorbed: ['FALSIFICATION', 'MODELS'],
  nativeSurface: true,
  persistence: ['sfi_cognitive_twin_runs', 'sfi_cognitive_twin_evaluations', 'sfi_lab_analyses'],
  memoryMutation: false,
  autoPromotion: false,
}, null, 2));
