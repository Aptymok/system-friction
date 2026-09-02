import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const worldApi = read('src/app/api/field/map/world/route.ts');
const cognitive = read('src/app/api/field/map/world/cognitive/route.ts');
const worldCycle = read('src/lib/world-observatory/worldCycle.ts');
const worldReadModel = read('src/app/api/observatory/world/route.ts');
const publicTimeline = read('src/lib/observatory/public/worldSnapshotTimeline.ts');
const nationalField = read('src/lib/world-observatory/inegiNationalField.ts');
const nationalFieldRoute = read('src/app/api/root/cognitive-twin/national-field/route.ts');
const nationalScenario = read('src/core/cognitive-twin/nationalFieldScenario.ts');
const nationalScenarioRoute = read('src/app/api/root/cognitive-twin/national-field/analyze/route.ts');
const directTwin = read('src/app/api/root/cognitive-twin/deliberate/route.ts');
const twinState = read('src/core/cognitive-twin/readState.ts');
const scenes = read('src/components/sfi/scenes.ts');
const shellUi = read('src/components/sfi/SfiConsole.tsx');
const observatoryUi = read('src/components/sfi/ObservatoryConsole.tsx');
const operatingUi = read('src/components/sfi/SfiOperatingWorkspace.tsx');
const governanceUi = read('src/components/sfi/SfiGovernanceWorkspace.tsx');
const observatoryPage = read('src/app/observatory/page.tsx');

// Backend temporal truth remains intact after the visual replacement.
assert.ok(worldApi.includes('readPagedRows'), 'world_history_must_paginate');
assert.ok(worldApi.includes("'world_hypotheses', 'cutoff_at'"), 'world_hypotheses_must_be_temporally_read');
assert.ok(worldApi.includes("'world_hypothesis_outcomes', 'evaluated_at'"), 'world_outcomes_must_be_temporally_read');
assert.ok(worldApi.includes("'world_learning_events', 'created_at'"), 'world_learning_must_be_temporally_read');
assert.ok(!worldApi.includes(".from('world_hypotheses').select('*').order('created_at', { ascending: false }).limit(100)"), 'legacy_first_100_hypothesis_limit_present');

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
assert.ok(worldCycle.includes('governed AI comparison against post-cutoff persisted source records'), 'world_calibration_must_be_governed_ai_not_keyword_overlap');

for (const token of [
  "from('worldspect_snapshots')",
  'readPublicWorldSnapshotTimeline',
  'VECTOR_DEFINITIONS',
  'Historical frames are reconstructed only from persisted WorldSpect snapshots.',
]) assert.ok(publicTimeline.includes(token), `public_timeline_source_contract_missing:${token}`);

// FIELD remains the canonical scene entry. The visual instrument is now ObservatoryConsole:
// Earth + satellite + persisted world records + traceable hypothesis graph.
for (const token of [
  "field:{key:'field'",
  "liveSource:'/api/observatory/world'",
  "markers:['source_record','derived_metric','hypothesis_graph','trajectory','return','contrast']",
]) assert.ok(scenes.includes(token), `field_live_scene_contract_missing:${token}`);

for (const token of [
  "fetchJson('/api/observatory/world')",
  "fetchJson('/api/observatory/timeline')",
  'setInterval(pull,20000)',
  '/sfi-scenes/satellite.png',
  "type Lens='field'|'hypotheses'|'trajectory'|'sources'",
  'selectedEvidenceIds',
  'selectedAffectedIds',
  'consequenceChain',
  'sourceSummary',
  "ownedText('FILTROS','FILTERS')",
]) assert.ok(observatoryUi.includes(token), `satellite_observatory_runtime_missing:${token}`);

for (const token of [
  "from('world_source_observations')",
  "from('world_hypotheses')",
  "from('world_hypothesis_outcomes')",
  "from('world_learning_events')",
  "relation:'EVIDENCE_INPUT_TO_INFERENCE'",
  "relation:'INFERRED_IMPACT'",
  "epistemicClass:'INFERRED'",
  "epistemicClass:'LINEAGE'",
  "semanticBoundary:'SOURCE/PROVENANCE does not imply accepted EVIDENCE.'",
  'sourceSummary',
]) assert.ok(worldReadModel.includes(token), `public_world_read_model_missing:${token}`);
assert.ok(worldReadModel.includes("nodes.forEach(node=>sourceCounts.set(node.sourceId"), 'live_source_count_must_derive_from_persisted_observation_nodes');

assert.ok(observatoryPage.includes('ObservatoryConsole'), 'public_observatory_must_render_native_observatory_console');
assert.equal(observatoryPage.includes('redirect('), false, 'public_observatory_must_not_be_forced_back_into_legacy_redirect_semantics');
assert.equal(observatoryUi.includes('sfi_cognitive_twin_memory'), false, 'public_live_scene_must_not_expose_private_cognitive_twin_corpus');
assert.equal(observatoryUi.includes('sfi_cognitive_twin_decisions'), false, 'public_live_scene_must_not_expose_private_cognitive_twin_decisions');

for (const token of [
  'INEGI_NATIONAL_FIELD_VERSION',
  "sourceId: 'inegi-indicators'",
  "sourceId: 'inegi-denue'",
  "from('world_source_observations').upsert",
  "epistemicClass: 'IMPORTED'",
  'noAutomaticFrictionReading: true',
  'noAutomaticHypothesisPromotion: true',
  'rawPersonLevelEmbedding: false',
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
assert.ok(operatingUi.includes('SfiGovernanceWorkspace'), 'governance_scene_must_delegate_to_canonical_workspace');
assert.ok(governanceUi.includes('/api/acp/proposals'), 'live_twin_proposal_surface_missing');
assert.ok(governanceUi.includes('ACEPTAR') && governanceUi.includes('DENEGAR'), 'root_plain_language_decision_controls_missing');
assert.ok(shellUi.includes('ObservatoryConsole'), 'field_scene_must_route_to_native_observatory_console');

console.log(JSON.stringify({
  ok: true,
  worldField: {
    paginatedHistory: true,
    temporalKnowledgeBoundary: true,
    cognitiveFrameExecution: true,
    satelliteInstrument: true,
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
    canonicalSurface: 'NATIVE_OBSERVATORY_CONSOLE',
    fieldSceneRemainsCanonicalEntry: true,
    persistedWorldSpectFrames: true,
    persistedSourceOnlyLiveCounts: true,
    traceableHypothesisGraph: true,
    privateTwinExposure: false,
  },
}, null, 2));