import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { classifyObservatoryRead, observableMetricValue } from '../src/lib/observatory/public/readAvailability';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');
const occurrences = (source: string, token: string) => source.split(token).length - 1;

const worldApi = read('src/app/api/field/map/world/route.ts');
const cognitive = read('src/app/api/field/map/world/cognitive/route.ts');
const worldCycle = read('src/lib/world-observatory/worldCycle.ts');
const worldReadModel = read('src/app/api/observatory/world/route.ts');
const publicTimeline = read('src/lib/observatory/public/worldSnapshotTimeline.ts');
const nationalField = read('src/lib/world-observatory/inegiNationalField.ts');
const nationalFieldRoute = read('src/app/api/root/cognitive-twin/national-field/route.ts');
const scenes = read('src/components/sfi/scenes.ts');
const shellUi = read('src/components/sfi/SfiConsole.tsx');
const observatoryUi = read('src/components/sfi/ObservatoryConsole.tsx');
const observatoryInterpretiveFlow = read('src/components/sfi/ObservatoryInterpretiveFlow.tsx');
const observatoryAvailability = read('src/lib/observatory/public/readAvailability.ts');
const observatoryPage = read('src/app/observatory/page.tsx');

// Temporal truth must be reconstructed from persisted records, not a recent-row shortcut.
assert.ok(worldApi.includes('readPagedRows'), 'world_history_must_paginate');
assert.ok(worldApi.includes("'world_hypotheses', 'cutoff_at'"), 'world_hypotheses_must_be_temporally_read');
assert.ok(worldApi.includes("'world_hypothesis_outcomes', 'evaluated_at'"), 'world_outcomes_must_be_temporally_read');
assert.ok(worldApi.includes("'world_learning_events', 'created_at'"), 'world_learning_must_be_temporally_read');
assert.ok(!worldApi.includes(".from('world_hypotheses').select('*').order('created_at', { ascending: false }).limit(100)"), 'legacy_first_100_hypothesis_limit_present');

// Cognitive interpretation remains bounded and may not rewrite observed reality.
for (const token of [
  'executeSfiRuntime',
  'runLlmTask',
  "sfi_cognitive_twin_memory",
  "sfi_cognitive_twin_decisions",
  "eq('status', 'CANONICAL')",
  "eq('status', 'APPROVED')",
  'llmAugmentation: false',
  "epistemicClass: llm.ok ? 'PROPOSED' : 'MISSING'",
  '.lte(\'fetched_at\', cutoffAt)',
]) assert.ok(cognitive.includes(token), `world_field_cognitive_bridge_missing:${token}`);
assert.ok(!/Math\.random|while\s*\(\s*true\s*\)/.test(cognitive), 'world_field_cognitive_bridge_must_be_bounded_and_non_synthetic');
assert.ok(/cannot rewrite observations|cannot rewrite/i.test(cognitive), 'world_field_cognitive_mutation_boundary_missing');

// Outcome calibration uses when SFI learned something, not a backdated source timestamp.
assert.ok(worldCycle.includes(".gt('fetched_at', hypothesis.cutoff_at)"), 'world_outcome_calibration_must_use_acquisition_time');
assert.ok(worldCycle.includes(".lte('fetched_at', now)"), 'world_outcome_calibration_must_bound_acquisition_time');
assert.ok(!worldCycle.includes(".gt('observed_at', hypothesis.cutoff_at)"), 'world_outcome_calibration_must_not_backdate_knowledge');
assert.ok(worldCycle.includes('governed AI comparison against post-cutoff persisted source records'), 'world_calibration_must_be_governed_ai_not_keyword_overlap');

for (const token of [
  "from('worldspect_snapshots')",
  'readPublicWorldSnapshotTimeline',
  'VECTOR_DEFINITIONS',
]) assert.ok(publicTimeline.includes(token), `public_timeline_source_contract_missing:${token}`);
assert.match(
  publicTimeline,
  /Historical frames are reconstructed only from .*persisted WorldSpect snapshots/i,
  'public_timeline_must_disclose_persisted_worldspect_snapshot_basis',
);

// FIELD remains one canonical Observatory surface; interpretive flow is a projection, not another reader.
for (const token of [
  "field:{key:'field'",
  "liveSource:'/api/observatory/world'",
  "markers:['source_record','derived_metric','hypothesis_graph','trajectory','return','contrast']",
]) assert.ok(scenes.includes(token), `field_live_scene_contract_missing:${token}`);
assert.ok(shellUi.includes('ObservatoryConsole'), 'canonical_field_surface_missing');
assert.ok(observatoryPage.includes('ObservatoryConsole'), 'public_observatory_must_render_native_observatory_console');
assert.equal(observatoryPage.includes('redirect('), false, 'public_observatory_must_not_be_forced_into_redirect_semantics');
assert.equal(occurrences(observatoryInterpretiveFlow, "fetch('/api/observatory/world'"), 0, 'interpretive_flow_must_not_fetch_world');
assert.equal(occurrences(observatoryInterpretiveFlow, 'setInterval('), 0, 'interpretive_flow_must_not_own_polling');
assert.ok(observatoryUi.includes('<ObservatoryInterpretiveFlow world={world} availability={availability.world}/>'), 'interpretive_flow_must_receive_canonical_world_read_model');

// One bounded refresh reads the three existing public owners. Returning to the surface reuses a recent snapshot.
for (const endpoint of [
  "fetchJson('/api/observatory/world')",
  "fetchJson('/api/observatory/state')",
  "fetchJson('/api/observatory/timeline')",
]) assert.equal(occurrences(observatoryUi, endpoint), 1, `observatory_duplicate_equivalent_read:${endpoint}`);
assert.equal(occurrences(observatoryUi, 'Promise.all(['), 1, 'observatory_second_read_owner_detected');
assert.match(observatoryUi, /OBSERVATORY_CACHE_TTL_MS=120_000/, 'observatory_recent_snapshot_cache_missing');
assert.match(observatoryUi, /observatorySnapshotCache/, 'observatory_snapshot_reuse_missing');
assert.match(observatoryUi, /pull\(false\)/, 'observatory_initial_bounded_read_missing');
assert.match(observatoryUi, /pull\(true\)/, 'observatory_manual_refresh_missing');
assert.doesNotMatch(observatoryUi, /setInterval\(pull|setInterval\([^\n]*fetchJson/, 'observatory_data_polling_must_not_return');
const requestTimeout = observatoryUi.match(/const OBSERVATORY_REQUEST_TIMEOUT_MS=(\d+);/);
assert.ok(requestTimeout && Number(requestTimeout[1]) > 0, 'observatory_request_timeout_missing');

// A 1-second visual clock is allowed because it performs no network or database read.
assert.match(observatoryUi, /setInterval\(tick,1000\)/, 'observatory_visual_clock_missing');

// Availability is epistemic state, not an empty-array alias.
for (const token of [
  "'LOADING' | 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE' | 'ERROR'",
  "'WORLD' | 'STATE' | 'TIMELINE'",
  'hasAuthoritativeShape',
  "payload.ok === false",
  "return availability === 'AVAILABLE' ? value : availability",
]) assert.ok(observatoryAvailability.includes(token), `observatory_availability_contract_missing:${token}`);

const availableWorld = { ok: true, status: 200, data: { ok: true, nodes: [], hypotheses: [], sourceSummary: [], warnings: [], filters: {}, graph: {} } };
assert.equal(classifyObservatoryRead(availableWorld, 'WORLD'), 'AVAILABLE');
assert.equal(observableMetricValue('AVAILABLE', 0), 0, 'authoritative_empty_read_must_render_zero');
assert.equal(classifyObservatoryRead({ ok: true, status: 200, data: {} }, 'WORLD'), 'DEGRADED');
assert.equal(observableMetricValue('DEGRADED', 0), 'DEGRADED', 'degraded_must_not_render_zero');
assert.equal(classifyObservatoryRead({ ok: false, status: 503, data: { ok: false } }, 'WORLD'), 'DEGRADED');
assert.equal(observableMetricValue('UNAVAILABLE', 0), 'UNAVAILABLE', 'unavailable_must_not_render_zero');
assert.equal(classifyObservatoryRead({ ok: false, status: 0, data: null, error: 'network' }, 'WORLD'), 'ERROR');
assert.equal(observableMetricValue('ERROR', 0), 'ERROR', 'error_must_not_render_zero');

// Public graph keeps source/provenance distinct from accepted evidence and inference.
for (const token of [
  "from('world_source_observations')",
  "from('world_hypotheses')",
  "from('world_hypothesis_outcomes')",
  "from('world_learning_events')",
  "relation:'EVIDENCE_INPUT_TO_INFERENCE'",
  "relation:'INFERRED_IMPACT'",
  "epistemicClass:'INFERRED'",
  "semanticBoundary:'SOURCE/PROVENANCE does not imply accepted EVIDENCE.'",
  'sourceSummary',
]) assert.ok(worldReadModel.includes(token), `public_world_read_model_missing:${token}`);
assert.equal(observatoryUi.includes('sfi_cognitive_twin_memory'), false, 'public_live_scene_must_not_expose_private_cognitive_twin_corpus');
assert.equal(observatoryUi.includes('sfi_cognitive_twin_decisions'), false, 'public_live_scene_must_not_expose_private_cognitive_twin_decisions');

// National-field ingestion remains imported evidence only; it may not silently create friction/hypothesis claims.
for (const token of [
  'INEGI_NATIONAL_FIELD_VERSION',
  "sourceId: 'inegi-indicators'",
  "sourceId: 'inegi-denue'",
  "from('world_source_observations').upsert",
  "epistemicClass: 'IMPORTED'",
  'noAutomaticFrictionReading: true',
  'noAutomaticHypothesisPromotion: true',
  'rawPersonLevelEmbedding: false',
  'ingestionDoesNotBackdateKnowledge: true',
]) assert.ok(nationalField.includes(token), `inegi_national_field_contract_missing:${token}`);
assert.ok(!nationalField.includes("from('world_friction_readings')"), 'inegi_import_must_not_create_friction_readings');
assert.ok(!nationalField.includes("from('world_hypotheses')"), 'inegi_import_must_not_promote_hypotheses');
assert.ok(nationalFieldRoute.includes("requireRootActor('national_field.ingest')"), 'inegi_ingest_must_be_root_governed');

console.log(JSON.stringify({
  ok:true,
  contract:'SFI-TEMPORAL-SURFACES-2.0',
  invariants:{
    temporalHistoryPaged:true,
    acquisitionTimeCalibration:true,
    simulationDoesNotRewriteObservation:true,
    publicFieldSingleReadOwner:true,
    observatoryDataPolling:false,
    observatorySnapshotReuse:true,
    falseZeroPrevented:true,
    sourceEvidenceBoundaryPreserved:true,
    nationalFieldAutoPromotion:false,
  },
},null,2));