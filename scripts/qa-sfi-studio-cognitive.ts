import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

function walk(relative: string): string[] {
  const absolute = path.join(root, relative);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute).flatMap((entry) => {
    const current = path.join(absolute, entry);
    return statSync(current).isDirectory() ? walk(path.relative(root, current)) : [current];
  });
}

const executionMap = read('src/lib/sfi/cognitive-runtime/agentExecutionMap.ts');
const runtime = read('src/lib/studio/cognitive/studioCognitiveRuntime.ts');
const llmRouter = read('src/lib/ai/providerRouter.ts');
const twinContext = read('src/core/cognitive-twin/studioContext.ts');
const experienceBridge = read('src/core/cognitive-twin/experience.ts');
const packageAnalyzer = read('src/lib/studio/multimodal/sessionPackageAnalyzer.ts');
const packageRoute = read('src/app/api/studio/objects/[id]/analyze/package/route.ts');
const reconstructionRoute = read('src/app/api/studio/session/reconstruct/route.ts');
const masterLoop = read('src/lib/studio/cognitive/studioMasterAnalysisLoop.ts');
const masterRoute = read('src/app/api/studio/objects/[id]/master-analysis/route.ts');
const studioPage = read('src/app/studio/page.tsx');
const fieldState = read('src/lib/studio/field/studioFieldState.ts');
const scenes = read('src/components/sfi/scenes.ts');
const liveUi = read('src/components/sfi/SfiConsole.tsx');
const operatingUi = read('src/components/sfi/SfiOperatingWorkspace.tsx');
const governanceUi = read('src/components/sfi/SfiGovernanceWorkspace.tsx');
const rootWorkboard = read('src/app/api/root/workboard/route.ts');

const requiredAgents = [
  'meta_orchestrator', 'field_observer', 'evidence_hunter', 'historical_scout', 'phenotype_resolver',
  'context_builder', 'temporal_resolver', 'social_field_simulator', 'economic_field_simulator',
  'cultural_simulator', 'psychological_simulator', 'policy_simulator', 'friction_field_simulator',
  'multi_stakeholder_bootstrap', 'cross_impact', 'entropy_redistribution', 'project_execution_manager',
  'reality_calibration', 'risk_agent', 'opportunity_agent', 'trajectory_agent',
];
for (const agent of requiredAgents) assert.ok(executionMap.includes(`${agent}:`), `existing_agent_not_executor_bound:${agent}`);
assert.equal(requiredAgents.length, 21, 'canonical_agent_count_changed_in_qa');

for (const token of [
  'executeSfiRuntime', 'readStudioTwinContext', 'runLlmTask', 'preferredLlmProvider',
  'independentVerifier', 'INDEPENDENT_VERIFIER_REQUIRED', 'persistStudioLearningCandidate',
  "status: 'CANDIDATE'", 'FAD', 'MIHM', 'MOP-H', 'DIOL-SF',
]) assert.ok(`${runtime}\n${twinContext}\n${experienceBridge}`.includes(token), `studio_cognitive_contract_missing:${token}`);

assert.ok(llmRouter.includes("provider: 'degraded'"), 'llm_degraded_provider_missing');
assert.ok(llmRouter.includes("['no_llm_provider_available']"), 'llm_no_provider_warning_missing');
assert.ok(llmRouter.includes('for (const providerId of order)'), 'llm_provider_fallback_chain_missing');
assert.ok(/Evidence before inference/i.test(runtime), 'llm_twin_grounding_missing');
assert.ok(runtime.includes('LLM_PROVIDER_UNAVAILABLE'), 'llm_fail_closed_missing');
assert.ok(twinContext.includes("status: 'CANDIDATE' as const"), 'candidate_memory_epistemic_boundary_missing');
assert.ok(!/Math\.random\(\).*confidence|fake|demo data/i.test(`${runtime}\n${llmRouter}\n${experienceBridge}`), 'synthetic_cognitive_output_pattern_present');

assert.ok(twinContext.includes('recordCognitiveTwinExperience'), 'studio_learning_not_routed_through_experience_bridge');
assert.ok(experienceBridge.includes("eventName:'cognitive_twin.experience.recorded'"), 'cognitive_twin_experience_ledger_append_missing');
assert.ok(experienceBridge.includes('processEpistemicEvent(emitted.event)'), 'cognitive_twin_experience_policy_promotion_missing');
assert.ok(experienceBridge.includes('Memory promotion is policy-governed and never expands Cognitive Twin authority'), 'memory_authority_separation_missing');
assert.ok(twinContext.includes('stableStudioLearningKey'), 'studio_learning_stable_key_missing');
assert.equal(experienceBridge.includes("from('sfi_cognitive_twin_memory').upsert"), false, 'experience_bridge_must_not_directly_upsert_memory');

assert.ok(packageAnalyzer.includes('Range:'), 'zip_range_read_missing');
assert.ok(packageAnalyzer.includes('sourceFileSha256: null'), 'zip_full_hash_must_not_be_claimed');
assert.ok(packageAnalyzer.includes('archiveManifestSha256'), 'zip_manifest_hash_missing');
assert.ok(packageRoute.includes(".remove([storagePath])"), 'transient_zip_purge_missing');
assert.ok(packageRoute.includes('EXTRACTED_THEN_DISCARDED'), 'transient_zip_retention_state_missing');

assert.ok(fieldState.includes('DERIVED_DISPLAY_ONLY'), 'world_visual_derivation_label_missing');
assert.ok(fieldState.includes('studio_sessions'), 'field_must_use_existing_session_source');
assert.ok(fieldState.includes('studio_archive_events'), 'timelap_persisted_event_source_missing');

for (const token of [
  "eq('owner_id', ownerId)", "eq('owner_id', user.id)", 'analyzeStudioSessionRelations',
  'executeSfiRuntime', 'readStudioTwinContext', 'studio_session_reconstruction_v1',
  'SESSION_RECONSTRUCTION_COMPLETED', 'PRIVATE_OWNER_SCOPE_REQUIRED',
]) assert.ok(reconstructionRoute.includes(token), `session_reconstruction_contract_missing:${token}`);
assert.ok(/Evidence before inference/i.test(reconstructionRoute), 'session_reconstruction_epistemic_rule_missing');
assert.ok(/does not prove routing|does not prove routing/i.test(reconstructionRoute), 'session_reconstruction_routing_boundary_missing');

for (const token of [
  'STUDIO_MASTER_ANALYSIS_MIN_PASSES = 2', 'STUDIO_MASTER_ANALYSIS_MAX_PASSES = 3',
  "action: 'analyze'", 'STRUCTURAL_STATE_STABLE', 'MAX_PASSES_REACHED',
  'studio_master_analysis_loop_v1', 'MASTER_ANALYSIS_LOOP_COMPLETED',
]) assert.ok(masterLoop.includes(token), `master_analysis_loop_contract_missing:${token}`);
assert.ok(!/while\s*\(|setInterval\s*\(|setTimeout\s*\(|sleep\s*\(/.test(masterLoop), 'master_analysis_must_not_wait_or_loop_unbounded');
assert.ok(masterLoop.includes('pass <= STUDIO_MASTER_ANALYSIS_MAX_PASSES'), 'master_analysis_explicit_pass_bound_missing');
assert.ok(masterRoute.includes('requireObjectOwner'), 'master_analysis_owner_gate_missing');
assert.ok(masterRoute.includes('runStudioMasterAnalysisLoop'), 'master_analysis_route_not_wired');

// Studio authority lives in owner-scoped backend runtimes. MODELS/GENAI/AGENTS were
// absorbed as parallel scenes; their observability survives in ROOT/GOVERNANCE and
// the provider workboard without becoming a permission bridge for Studio.
assert.equal(studioPage.includes("redirect('/models')"), false, 'studio_entry_must_not_alias_to_models');
assert.ok(studioPage.includes('listStudioObjects(user.id)'), 'studio_entry_must_preserve_owner_scope');
assert.ok(studioPage.includes('getStudioObjectFeatures(activeId, user.id)'), 'studio_entry_must_use_owner_scoped_features');
assert.ok(scenes.includes("root:{key:'root'"), 'root_scene_missing');
assert.ok(scenes.includes("governance:{key:'governance'"), 'governance_scene_missing');
assert.ok(scenes.includes("twin:{key:'twin'"), 'twin_scene_missing');
assert.ok(/LEGACY_INTERNAL_SCENES=.*'agents'.*'models'.*'genai'/s.test(scenes), 'absorbed_cognitive_observability_scenes_missing');
assert.ok(liveUi.includes('COGNITIVE TWIN'), 'studio_twin_observability_missing');
assert.ok(operatingUi.includes('SfiGovernanceWorkspace') && governanceUi.includes('AGENTES'), 'studio_agent_observability_missing');
assert.ok(rootWorkboard.includes('getLlmProviderStatus') && rootWorkboard.includes('providerHealthBoundary'), 'studio_model_provider_observability_missing');
assert.ok(rootWorkboard.includes('readContinuityDashboard') && rootWorkboard.includes('heartbeatAgeMinutes') && rootWorkboard.includes('latestRun'), 'studio_runtime_telemetry_missing');

const migrationFiles = walk('supabase/migrations').filter((file) => file.endsWith('.sql'));
const migrationText = migrationFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
assert.ok(!/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?studio_object_relations\b/i.test(migrationText), 'duplicate_studio_relation_table_present');

console.log(JSON.stringify({
  ok: true,
  existingAgentExecutorsVerified: requiredAgents.length,
  cognitiveTwinBound: true,
  llmInferenceFailClosed: true,
  candidateMemoryNonCanonical: true,
  independentVerificationRequired: true,
  learningPersistsThroughCanonicalExperienceBridge: true,
  sfiMethodsPersisted: ['FAD', 'MIHM', 'MOP-H', 'DIOL-SF'],
  zipRangeAnalysis: true,
  zipHeavySourcePurged: true,
  sessionReconstructionOwnerScoped: true,
  sessionReconstructionUsesExistingRuntime: true,
  masterAnalysisFinite: true,
  masterAnalysisPassBudget: [2, 3],
  masterAnalysisOwnerScoped: true,
  studioAuthority: 'OWNER_SCOPED_BACKEND_RUNTIME',
  relatedObservability: 'ROOT/GOVERNANCE/TWIN + PROVIDER WORKBOARD',
  legacyScenesAbsorbed: ['MODELS', 'GENAI', 'AGENTS'],
  duplicateRelationTable: false,
}, null, 2));