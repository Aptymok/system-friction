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
const llmBridge = read('src/lib/sfi/cognitive-runtime/agentLlmBridge.ts');
const twinContext = read('src/lib/cognitive-twin/studioContext.ts');
const packageAnalyzer = read('src/lib/studio/multimodal/sessionPackageAnalyzer.ts');
const packageRoute = read('src/app/api/studio/objects/[id]/analyze/package/route.ts');
const fieldState = read('src/lib/studio/field/studioFieldState.ts');

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
  'executeSfiRuntime',
  'readStudioTwinContext',
  'runLlmTask',
  'preferredLlmProvider',
  'independentVerifier',
  'INDEPENDENT_VERIFIER_REQUIRED',
  'persistStudioLearningCandidate',
  "status: 'CANDIDATE'",
  'FAD',
  'MIHM',
  'MOP-H',
  'DIOL-SF',
]) assert.ok(`${runtime}\n${twinContext}`.includes(token), `studio_cognitive_contract_missing:${token}`);

assert.ok(llmBridge.includes("epistemicClass: 'INFERENCE'"), 'llm_inference_classification_missing');
assert.ok(/evidence before inference/i.test(llmBridge), 'llm_twin_grounding_missing');
assert.ok(/CANDIDATE Cognitive Twin memory/i.test(llmBridge), 'candidate_memory_epistemic_boundary_missing');
assert.ok(llmBridge.includes('LLM_PROVIDER_UNAVAILABLE'), 'llm_fail_closed_missing');
assert.ok(!/Math\.random\(\).*confidence|fake|demo data/i.test(`${runtime}\n${llmBridge}`), 'synthetic_cognitive_output_pattern_present');
assert.ok(twinContext.includes("upsert({"), 'studio_learning_must_upsert_not_duplicate');
assert.ok(twinContext.includes("onConflict: 'memory_key,version'"), 'studio_learning_conflict_key_missing');
assert.ok(twinContext.includes('stableStudioLearningKey'), 'studio_learning_stable_key_missing');

assert.ok(packageAnalyzer.includes('Range:'), 'zip_range_read_missing');
assert.ok(packageAnalyzer.includes('sourceFileSha256: null'), 'zip_full_hash_must_not_be_claimed');
assert.ok(packageAnalyzer.includes('archiveManifestSha256'), 'zip_manifest_hash_missing');
assert.ok(packageRoute.includes(".remove([storagePath])"), 'transient_zip_purge_missing');
assert.ok(packageRoute.includes('EXTRACTED_THEN_DISCARDED'), 'transient_zip_retention_state_missing');

assert.ok(fieldState.includes('DERIVED_DISPLAY_ONLY'), 'world_visual_derivation_label_missing');
assert.ok(fieldState.includes('studio_sessions'), 'field_must_use_existing_session_source');
assert.ok(fieldState.includes('studio_archive_events'), 'timelap_persisted_event_source_missing');

const migrationFiles = walk('supabase/migrations').filter((file) => file.endsWith('.sql'));
const migrationText = migrationFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
assert.ok(!/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?studio_object_relations\b/i.test(migrationText), 'duplicate_studio_relation_table_present');

for (const removed of [
  'src/components/studio/workspace/StudioObjectReport.tsx',
  'src/components/studio/workspace/StudioCapabilityDrawer.tsx',
  'src/components/studio/workspace/StudioTraceDrawer.tsx',
]) assert.ok(!existsSync(path.join(root, removed)), `replaced_studio_component_still_present:${removed}`);

console.log(JSON.stringify({
  ok: true,
  existingAgentExecutorsVerified: requiredAgents.length,
  cognitiveTwinBound: true,
  llmInferenceFailClosed: true,
  candidateMemoryNonCanonical: true,
  independentVerificationRequired: true,
  learningPersistsAsStableCandidateUpsert: true,
  sfiMethodsPersisted: ['FAD', 'MIHM', 'MOP-H', 'DIOL-SF'],
  zipRangeAnalysis: true,
  zipHeavySourcePurged: true,
  duplicateRelationTable: false,
  removedDashboardComponents: 3,
}, null, 2));
