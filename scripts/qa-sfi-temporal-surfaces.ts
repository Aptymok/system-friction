import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const worldApi = read('src/app/api/field/map/world/route.ts');
const worldUi = read('src/components/field/map/WorldFieldObservatory.tsx');
const cognitive = read('src/app/api/field/map/world/cognitive/route.ts');
const worldCycle = read('src/lib/world-observatory/worldCycle.ts');
const publicTimeline = read('src/lib/observatory/public/worldSnapshotTimeline.ts');
const publicTimelineUi = read('src/components/observatory/public/PublicObservatoryTimelineNavigator.tsx');
const observatoryPage = read('src/app/observatory/page.tsx');
const nationalField = read('src/lib/world-observatory/inegiNationalField.ts');
const nationalFieldRoute = read('src/app/api/root/cognitive-twin/national-field/route.ts');
const nationalScenario = read('src/lib/cognitive-twin/nationalFieldScenario.ts');
const nationalScenarioRoute = read('src/app/api/root/cognitive-twin/national-field/analyze/route.ts');
const directTwin = read('src/app/api/root/cognitive-twin/deliberate/route.ts');
const twinState = read('src/lib/cognitive-twin/readState.ts');
const twinUi = read('src/components/root/cognitive-twin/CognitiveTwinConsole.tsx');

assert.ok(worldApi.includes('readPagedRows'), 'world_history_must_paginate');
assert.ok(worldApi.includes("'world_hypotheses', 'cutoff_at'"), 'world_hypotheses_must_be_temporally_read');
assert.ok(worldApi.includes("'world_hypothesis_outcomes', 'evaluated_at'"), 'world_outcomes_must_be_temporally_read');
assert.ok(worldApi.includes("'world_learning_events', 'created_at'"), 'world_learning_must_be_temporally_read');
assert.ok(!worldApi.includes(".from('world_hypotheses').select('*').order('created_at', { ascending: false }).limit(100)"), 'legacy_first_100_hypothesis_limit_present');

for (const token of [
  'type="range"',
  'windowHours',
  'visibleNodes',
  'visibleHypotheses',
  'Timeline completa',
  '/api/field/map/world/cognitive',
  'ANALIZAR FRAME CON SFI',
  'sticky top-',
]) assert.ok(worldUi.includes(token), `world_field_temporal_contract_missing:${token}`);
assert.ok(!worldUi.includes('hypotheses.slice(0, 8)'), 'world_field_still_hides_hypotheses_after_eight');
assert.ok(!worldUi.includes('<path key={`${previous.id}:${node.id}`'), 'world_field_still_draws_unpersisted_previous_node_edges');

for (const token of [
  'executeSfiRuntime',
  'runLlmTask',
  "sfi_cognitive_twin_memory",
  "sfi_cognitive_twin_decisions",
  "eq('status', 'CANONICAL')",
  "eq('status', 'APPROVED')",
  "role: 'world_field_frame_analysis'",
  'llmAugmentation: false',
  "epistemicClass: llm.ok ? 'PROPOSED' : 'MISSING'",
  ".lte('fetched_at', cutoffAt)",
  'knownByCutoff',
  "status: llm.ok ? 'PROPOSED' : 'REJECTED'",
]) assert.ok(cognitive.includes(token), `world_field_cognitive_bridge_missing:${token}`);
assert.ok(!/Math\.random|setInterval|setTimeout|while\s*\(\s*true\s*\)/.test(cognitive), 'world_field_cognitive_bridge_must_be_bounded_and_non_synthetic');
assert.ok(/cannot rewrite observations|cannot rewrite/i.test(cognitive), 'world_field_cognitive_mutation_boundary_missing');

assert.ok(worldCycle.includes(".gt('fetched_at', hypothesis.cutoff_at)"), 'world_outcome_calibration_must_use_acquisition_time');
assert.ok(worldCycle.includes(".lte('fetched_at', now)"), 'world_outcome_calibration_must_bound_acquisition_time');
assert.ok(!worldCycle.includes(".gt('observed_at', hypothesis.cutoff_at)"), 'world_outcome_calibration_must_not_backdate_knowledge');

for (const token of [
  "from('worldspect_snapshots')",
  'readPublicWorldSnapshotTimeline',
  'VECTOR_DEFINITIONS',
  'Historical frames are reconstructed only from persisted WorldSpect snapshots.',
]) assert.ok(publicTimeline.includes(token), `public_timeline_source_contract_missing:${token}`);
assert.ok(publicTimelineUi.includes('/api/observatory/timeline'), 'public_timeline_ui_not_wired');
assert.ok(publicTimelineUi.includes('type="range"'), 'public_timeline_cursor_missing');
assert.ok(publicTimelineUi.includes('Cada posición corresponde a un snapshot WorldSpect almacenado'), 'public_timeline_epistemic_boundary_missing');
assert.ok(observatoryPage.includes('<PublicObservatoryTimelineNavigator />'), 'public_observatory_timeline_not_rendered');
assert.ok(!publicTimelineUi.includes('sfi_cognitive_twin_'), 'public_observatory_must_not_expose_private_cognitive_twin_corpus');

for (const token of [
  "INEGI_NATIONAL_FIELD_VERSION",
  "sourceId: 'inegi-indicators'",
  "sourceId: 'inegi-denue'",
  "from('world_source_observations').upsert",
  "epistemicClass: 'IMPORTED'",
  'noAutomaticFrictionReading: true',
  'noAutomaticHypothesisPromotion: true',
  "rawPersonLevelEmbedding: false",
  "plannedPrograms: ['ENOE', 'ENIGH', 'ENVIPE']",
  'ingestionDoesNotBackdateKnowledge: true',
]) assert.ok(nationalField.includes(token), `inegi_national_field_contract_missing:${token}`);
assert.ok(!nationalField.includes("from('world_friction_readings')"), 'inegi_import_must_not_create_friction_readings');
assert.ok(!nationalField.includes("from('world_hypotheses')"), 'inegi_import_must_not_promote_hypotheses');
assert.ok(nationalFieldRoute.includes("requireRootActor('national_field.ingest')"), 'inegi_ingest_must_be_root_governed');

for (const token of [
  'INEGI_NATIONAL_SCENARIOS',
  'executeSfiRuntime',
  'runLlmTask',
  ".eq('publisher', 'INEGI')",
  ".lte('fetched_at', cutoffAt)",
  "epistemicClass: 'IMPORTED'",
  "role: 'national_field_scenario_analysis'",
  "status: llm.ok ? 'PROPOSED' : 'REJECTED'",
  "const runStatus = !llm.ok ? 'BLOCKED'",
]) assert.ok(nationalScenario.includes(token), `national_scenario_runtime_missing:${token}`);
assert.ok(nationalScenarioRoute.includes("requireRootActor('national_field.analyze')"), 'national_scenario_analysis_must_be_root_governed');

assert.ok(!directTwin.includes("status: 'READY'"), 'direct_twin_must_not_persist_unconditional_ready');
assert.ok(directTwin.includes("const runStatus = !llm.ok ? 'BLOCKED'"), 'direct_twin_degraded_provider_must_block_run');
assert.ok(directTwin.includes("status: llm.ok ? 'PROPOSED' : 'REJECTED'"), 'direct_twin_envelope_must_reflect_provider_failure');
assert.ok(twinState.includes('providerExecutionObserved'), 'twin_readiness_must_require_observed_provider_execution');
assert.ok(twinState.includes(".in('status', ['APPROVED', 'APPROVED_WITH_LIMITS'])"), 'twin_model_readiness_must_require_approved_model_status');
assert.ok(twinUi.includes('EJECUCIÓN LLM NO VERIFICADA'), 'twin_ui_must_distinguish_configuration_from_execution');
assert.ok(twinUi.includes('<NationalFieldPanel />'), 'twin_ui_must_expose_national_field_surface');

console.log(JSON.stringify({
  ok: true,
  worldField: {
    paginatedHistory: true,
    temporalNodeFiltering: true,
    allHypothesesVisible: true,
    stickyMapContext: true,
    cognitiveFrameExecution: true,
    noTemporalKnowledgeLeakage: true,
  },
  cognitiveBridge: {
    agents: true,
    oneLlmSynthesis: true,
    canonicalTwinMemoryOnly: true,
    approvedRulesOnly: true,
    proposedNotObserved: true,
    degradedProviderCannotBecomeReady: true,
  },
  nationalField: {
    inegiIndicators: true,
    denue: true,
    scenarios: true,
    microdataAggregationBoundary: true,
    automaticFrictionPromotion: false,
    automaticHypothesisPromotion: false,
  },
  publicObservatory: {
    persistedWorldSpectFrames: true,
    interactiveTimeline: true,
    privateTwinExposure: false,
  },
}, null, 2));
