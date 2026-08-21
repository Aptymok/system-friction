import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const worldApi = read('src/app/api/field/map/world/route.ts');
const cognitive = read('src/app/api/field/map/world/cognitive/route.ts');
const worldCycle = read('src/lib/world-observatory/worldCycle.ts');
const publicTimeline = read('src/lib/observatory/public/worldSnapshotTimeline.ts');
const nationalField = read('src/lib/world-observatory/inegiNationalField.ts');
const nationalFieldRoute = read('src/app/api/root/cognitive-twin/national-field/route.ts');
const nationalScenario = read('src/core/cognitive-twin/nationalFieldScenario.ts');
const nationalScenarioRoute = read('src/app/api/root/cognitive-twin/national-field/analyze/route.ts');
const directTwin = read('src/app/api/root/cognitive-twin/deliberate/route.ts');
const twinState = read('src/core/cognitive-twin/readState.ts');
const scenes = read('src/components/sfi/scenes.ts');
const liveUi = read('src/components/sfi/SfiConsole.tsx');
const legacyObservatory = read('src/app/observatory/page.tsx');

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

for (const token of [
  "from('worldspect_snapshots')",
  'readPublicWorldSnapshotTimeline',
  'VECTOR_DEFINITIONS',
  'Historical frames are reconstructed only from persisted WorldSpect snapshots.',
]) assert.ok(publicTimeline.includes(token), `public_timeline_source_contract_missing:${token}`);

// The public temporal UI is now the FIELD live scene, not the deleted
// WorldFieldObservatory/PublicObservatory dashboard components.
for (const token of [
  "field:{key:'field'",
  "liveSource:'/api/root/state'",
  "markers:['observación','persistencia','emergencia','provenance']",
]) assert.ok(scenes.includes(token), `field_live_scene_contract_missing:${token}`);
for (const token of [
  'setInterval(pull,12000)',
  'spec.liveSource',
  'scene-${scene}',
  'dataNode dn1',
  'COGNITIVE TWIN',
]) assert.ok(liveUi.includes(token), `live_scene_runtime_missing:${token}`);
assert.ok(legacyObservatory.includes("redirect('/field')") || legacyObservatory.includes("redirect('/archive')") || legacyObservatory.includes('redirect('), 'legacy_observatory_must_resolve_into_live_scene_system');
assert.equal(liveUi.includes('sfi_cognitive_twin_memory'), false, 'public_live_scene_must_not_expose_private_cognitive_twin_corpus');
assert.equal(liveUi.includes('sfi_cognitive_twin_decisions'), false, 'public_live_scene_must_not_expose_private_cognitive_twin_decisions');

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
assert.ok(liveUi.includes('/api/acp/proposals'), 'live_twin_proposal_surface_missing');
assert.ok(liveUi.includes('ACEPTAR') && liveUi.includes('RECHAZAR'), 'root_plain_language_decision_controls_missing');

console.log(JSON.stringify({
  ok: true,
  worldField: {
    paginatedHistory: true,
    temporalKnowledgeBoundary: true,
    cognitiveFrameExecution: true,
    liveSceneReplacement: true,
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
    canonicalSurface: 'FIELD_LIVE_SCENE',
    persistedWorldSpectFrames: true,
    privateTwinExposure: false,
  },
}, null, 2));
