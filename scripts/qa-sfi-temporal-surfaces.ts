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
const observatoryWorldField = read('src/components/sfi/ObservatoryWorldField.tsx');
const observatorySemanticGpuLayer = read('src/components/sfi/ObservatorySemanticGpuLayer.tsx');
const observatoryWorldLayerCss = read('src/components/sfi/ObservatoryWorldLayer.css');
const hypothesisClosureDiff = read('src/components/sfi/HypothesisClosureDiff.tsx');
const worldHypothesisClosureReport = read('src/lib/reports/worldHypothesisClosureReport.ts');
const worldObservatoryCron = read('src/app/api/cron/world-observatory/route.ts');
const observatoryAvailability = read('src/lib/observatory/public/readAvailability.ts');
const observatoryPage = read('src/app/observatory/page.tsx');
const worldVectorRetrospective = read('src/lib/world-vector/retrospective.ts');
const worldVectorPersistence = read('src/lib/world-vector/persistence.ts');
const externalWorldRoute = read('src/app/api/external/v1/world/route.ts');
const authenticatedGatewayProjection = read('src/lib/mcp/authenticatedGatewayProjection.ts');
const worldSpectCron = read('src/app/api/cron/worldspect/route.ts');
const worldSpectHistoricalRecovery = read('src/lib/worldspect/historicalRecovery.ts');
const worldSpectRunAdapters = read('src/lib/worldspect/runAdapters.ts');

// Temporal truth must be reconstructed from persisted records, not a recent-row shortcut.
assert.ok(worldApi.includes('readPagedRows'), 'world_history_must_paginate');
assert.ok(worldApi.includes("'world_hypotheses', 'cutoff_at'"), 'world_hypotheses_must_be_temporally_read');
assert.ok(worldApi.includes("'world_hypothesis_outcomes', 'evaluated_at'"), 'world_outcomes_must_be_temporally_read');
assert.ok(worldApi.includes("'world_learning_events', 'created_at'"), 'world_learning_must_be_temporally_read');
assert.ok(!worldApi.includes(".from('world_hypotheses').select('*').order('created_at', { ascending: false }).limit(100)"), 'legacy_first_100_hypothesis_limit_present');

// World Vector retrospective reconstruction is same-day/as-of only and may regenerate derived observations without rewriting WorldSpect T0.
for (const token of [
  'getWorldSpectSnapshotIndexRead',
  'getWorldSpectSnapshotAtOrBefore',
  "snapshot.observed_at.slice(0, 10) !== day",
  'recentSampleCount(ordered, Date.parse(snapshot.observed_at))',
  "RETROSPECTIVE RECONSTRUCTION ONLY",
  "Future snapshots are never projected backward",
]) assert.ok(worldVectorRetrospective.includes(token), `world_vector_retrospective_boundary_missing:${token}`);
assert.ok(worldVectorPersistence.includes('overwrite?: boolean'), 'world_vector_regeneration_overwrite_contract_missing');
assert.ok(worldVectorPersistence.includes('.update(observationRow)'), 'world_vector_regeneration_update_path_missing');
assert.ok(externalWorldRoute.includes("'regenerate_world_vector'"), 'world_vector_regeneration_external_operation_missing');
assert.ok(externalWorldRoute.includes("rewritesWorldSpectT0: false"), 'world_vector_regeneration_t0_boundary_missing');
assert.ok(authenticatedGatewayProjection.includes("operation === 'regenerate_world_vector'"), 'world_vector_regeneration_mcp_scope_missing');
assert.ok(worldSpectCron.includes("scheduledEgressGuardResponse({ lane: 'WORLD_OBSERVATION' })"), 'worldspect_cron_must_use_independent_world_observation_egress_lane');
assert.ok(externalWorldRoute.includes("'measure_worldspect'"), 'worldspect_governed_manual_measurement_missing');
assert.ok(authenticatedGatewayProjection.includes("operation === 'measure_worldspect'"), 'worldspect_manual_measurement_mcp_scope_missing');
assert.ok(externalWorldRoute.includes("'recover_worldspect_history'"), 'worldspect_historical_recovery_operation_missing');
assert.ok(authenticatedGatewayProjection.includes("operation === 'recover_worldspect_history'"), 'worldspect_historical_recovery_mcp_scope_missing');
for (const token of [
  'SFI-WORLDSPECT-HISTORICAL-RECOVERY-1.0',
  'EXACT_ARCHIVE',
  'ARCHIVED_FORECAST',
  'AS_OF_PROXY_CURRENT_INDEX',
  'ORIGINAL_SEMANTICS_UNAVAILABLE',
  "persistWorldSpectObservations(observations, 'diagnostic'",
  'originalCronExecutionClaimed: false',
  'cognitiveSpineReentryPerformed: false',
  'canonicalPromotionPerformed: false',
]) assert.ok(worldSpectHistoricalRecovery.includes(token), `worldspect_historical_recovery_boundary_missing:${token}`);
assert.ok(worldSpectRunAdapters.includes('snapshotObservedAt?: string'), 'worldspect_historical_snapshot_timestamp_missing');
assert.ok(worldSpectRunAdapters.includes('skipCognitiveSpineContrast?: boolean'), 'worldspect_historical_reentry_suppression_missing');
assert.ok(worldSpectRunAdapters.includes('options.skipCognitiveSpineContrast !== true'), 'worldspect_historical_reentry_guard_missing');

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
  'getWorldSpectPublicHistoryRead',
  'readPublicWorldSnapshotTimeline',
  'VECTOR_DEFINITIONS',
]) assert.ok(publicTimeline.includes(token), `public_timeline_source_contract_missing:${token}`);
assert.ok(!publicTimeline.includes("from('worldspect_snapshots')"), 'public_timeline_must_not_own_persistence_query');
assert.match(
  publicTimeline,
  /Historical frames are reconstructed only from[\s\S]*persisted WorldSpect snapshots/,
  'public_timeline_persisted_snapshot_boundary_missing',
);

// FIELD and public Observatory reuse one canonical ObservatoryConsole; no duplicate reader or writer is introduced.
for (const token of [
  "field:{key:'field'",
  "liveSource:'/api/observatory/world'",
  "markers:['source_record','derived_metric','hypothesis_graph','trajectory','return','contrast']",
]) assert.ok(scenes.includes(token), `field_live_scene_contract_missing:${token}`);
assert.ok(shellUi.includes('ObservatoryConsole'), 'canonical_internal_field_surface_missing');
assert.ok(observatoryPage.includes('ObservatoryConsole'), 'public_observatory_must_mount_canonical_console');
assert.equal(observatoryPage.includes("redirect('/')"), false, 'public_observatory_must_not_redirect_away_from_canonical_console');
assert.equal(observatoryUi.includes('ObservatoryInterpretiveFlow'), false, 'legacy_interpretive_flow_must_not_render_below_internal_observatory');
assert.ok(observatoryUi.includes('SFI SATELLITE → HUB'), 'satellite_hub_internal_interpretation_owner_missing');
assert.ok(observatoryUi.includes('LATEST HYPOTHESES'), 'satellite_hub_latest_hypothesis_lens_missing');
assert.ok(observatoryUi.includes('.slice(0,8)'), 'public_hypothesis_visual_budget_missing');
assert.ok(worldReadModel.includes('PUBLIC_HYPOTHESIS_LIMIT=8'), 'public_hypothesis_query_budget_missing');
assert.ok(worldReadModel.includes('LIVE_WORLD_MAX_AGE_HOURS=48'), 'live_world_freshness_window_missing');
assert.ok(worldReadModel.includes("liveWorldState=nodes.length>0?'LIVE':'STALE_OR_ABSENT'"), 'live_world_persisted_state_contract_missing');
assert.ok(observatoryUi.includes("world?.liveWorld?.state==='LIVE'"), 'world_visual_must_require_persisted_live_state');

assert.ok(observatoryUi.includes('<ObservatoryWorldField'), 'world_field_projection_must_be_mounted');
assert.ok(observatoryUi.includes('function ObservatoryUtcClock()'), 'observatory_clock_must_be_isolated_from_field_parent');
assert.ok(observatoryUi.includes('const gpuNodes=useMemo') && observatoryUi.includes('const graphNodes=useMemo'), 'observatory_gpu_inputs_must_be_memoized');
assert.ok(!observatoryUi.includes('[clock,setClock]'), 'observatory_parent_must_not_tick_every_second');
assert.ok(observatoryUi.includes('graphNodes={rows(world?.graph?.nodes)}'), 'world_field_must_reuse_canonical_world_graph_nodes');
assert.ok(observatoryUi.includes('selectedGraphEdges={selectedGraphEdges}'), 'world_field_must_use_typed_selected_graph_edges');
assert.ok(observatoryUi.includes('vectors={frame?.vectors??[]}'), 'world_field_must_reuse_persisted_worldspect_frame_vectors');
for (const token of [
  'fieldEdgeLineage',
  'fieldEdgeDerived',
  'fieldEdgeInferred',
  'WORLD FIELD · GEOGRAPHIC OBSERVATIONS + INTERFACE ORBITS · ORBITAL POSITION ≠ GEOGRAPHY ≠ CAUSALITY',
  "kind==='SYSTEM'||kind==='HYPOTHESIS'",
]) assert.ok(observatoryWorldField.includes(token), `world_field_contract_missing:${token}`);
assert.ok(observatoryWorldField.includes("selectedGraphEdges.filter"), 'world_field_must_not_render_unbounded_graph_edges');
assert.ok(observatoryWorldField.includes(".slice(0,120)"), 'world_field_visual_edge_budget_missing');
assert.equal(/fetch\(|createServiceSupabaseClient|\.from\(/.test(observatoryWorldField), false, 'world_field_must_not_become_a_second_read_owner');
assert.ok(observatoryWorldLayerCss.includes('.worldSpectrumCorona') && observatoryWorldLayerCss.includes('.fieldHypothesisNode'), 'world_field_visual_layers_missing');
assert.ok(observatoryWorldLayerCss.includes('prefers-reduced-motion'), 'world_field_reduced_motion_boundary_missing');

assert.ok(observatoryUi.includes('<ObservatorySemanticGpuLayer'), 'semantic_gpu_layer_must_be_mounted');
assert.ok(observatorySemanticGpuLayer.includes("import('pixi.js')"), 'semantic_gpu_layer_must_use_existing_pixi_runtime');
assert.ok(observatorySemanticGpuLayer.includes("matchMedia('(prefers-reduced-motion: reduce)')"), 'semantic_gpu_layer_must_respect_reduced_motion_before_initialization');
assert.ok(observatorySemanticGpuLayer.includes('Math.min(window.devicePixelRatio||1,1.5)'), 'semantic_gpu_device_pixel_ratio_budget_missing');
assert.ok(observatorySemanticGpuLayer.includes('selectedGraphEdges.filter') && observatorySemanticGpuLayer.includes('.slice(0,maxEdges)'), 'semantic_gpu_must_be_bounded_to_typed_selected_edges');
assert.ok(observatorySemanticGpuLayer.includes("vectors.filter((vector)=>typeof vector.value==='number'"), 'semantic_gpu_vectors_must_derive_from_observed_worldspect_values');
assert.ok(observatorySemanticGpuLayer.includes('GPU ENHANCEMENT ≠ EVIDENCE'), 'semantic_gpu_epistemic_boundary_missing');
assert.ok(observatorySemanticGpuLayer.includes('SVG/DOM REMAINS CANONICAL INTERACTION SURFACE'), 'semantic_gpu_fallback_boundary_missing');
assert.doesNotMatch(observatorySemanticGpuLayer, /Math\.random|fetch\(|createServiceSupabaseClient|\.from\(|\.insert\(|\.update\(|\.upsert\(/, 'semantic_gpu_must_not_create_random_or_data-owning state');
assert.ok(observatoryWorldLayerCss.includes('.semanticGpuLayer') && observatoryWorldLayerCss.includes('display:none!important'), 'semantic_gpu_css_fallback_missing');

assert.ok(observatoryUi.includes('const[baselineTime,setBaselineTime]=useState(0)'), 'persisted_t0_t1_temporal_comparison_missing');
assert.ok(observatoryUi.includes('baselineFrameIndex') && observatoryUi.includes('temporalVectorDeltas'), 'temporal_snapshot_delta_projection_missing');
assert.ok(observatoryUi.includes('ghostVectors={baselineFrame?.vectors??[]}'), 'temporal_worldspect_ghost_not_mounted');
assert.ok(observatoryUi.includes('T0/T1 compares persisted WorldSpect snapshots only. The current source/hypothesis graph is not backdated or rewritten by this control.'), 'temporal_backdating_boundary_missing');
assert.ok(observatoryUi.includes('T0 → T1 · PERSISTED WORLDSPECT'), 'temporal_comparison_identity_missing');
assert.ok(observatoryWorldField.includes('worldSpectrumGhost') && observatoryWorldField.includes('ghostVectors'), 'worldspect_temporal_ghost_projection_missing');

assert.ok(observatoryUi.includes('<HypothesisClosureDiff hypothesis={selectedHypothesis}/>'), 'hypothesis_closure_return_diff_missing');
for (const token of ['T0 CLAIM','RETURN WINDOW','LATER EVIDENCE','CLASSIFICATION','LEARNING','EXPECTED ≠ OBSERVED','INCONCLUSIVE ≠ FALSE','REPORT ≠ RETURN']) {
  assert.ok(hypothesisClosureDiff.includes(token), `hypothesis_closure_diff_contract_missing:${token}`);
}
assert.equal(/fetch\(|createServiceSupabaseClient|\.from\(/.test(hypothesisClosureDiff), false, 'hypothesis_closure_diff_must_not_become_read_or_write_owner');

assert.ok(worldHypothesisClosureReport.includes('SFI-WORLD-HYPOTHESIS-CLOSURE-DOSSIER-1.0'), 'closure_dossier_contract_missing');
assert.ok(worldHypothesisClosureReport.includes('Outcome classification is owned by the World calibration cycle; this dossier does not reclassify hypotheses.'), 'closure_report_classification_authority_boundary_missing');
assert.ok(worldHypothesisClosureReport.includes('You are NOT the hypothesis evaluator.'), 'closure_report_editor_must_not_become_evaluator');
assert.ok(worldHypothesisClosureReport.includes('Do not call PARTIALLY_VALIDATED validated. Do not call INCONCLUSIVE false.'), 'closure_report_language_boundary_missing');
assert.ok(worldHypothesisClosureReport.includes("role:'report_agent'") && worldHypothesisClosureReport.includes("sfi_cognitive_twin_runs"), 'closure_report_must_use_existing_report_owner');
assert.ok(worldHypothesisClosureReport.includes('readContinuityPublicWorldBundle'), 'closure_report_continuity_read_fallback_missing');
assert.doesNotMatch(worldHypothesisClosureReport, /world_hypotheses[^\n]*\.update|from\('world_hypotheses'\)[\s\S]{0,300}\.update\(/, 'closure_report_must_never_write_hypothesis_classification');

assert.ok(worldObservatoryCron.includes('const calibration = await runWorldCalibrationCycle()'), 'world_calibration_owner_missing');
assert.ok(worldObservatoryCron.includes('persistWorldHypothesisClosureReport({ hypothesisIds: calibration.calibratedIds })'), 'closure_report_must_run_only_from_calibrated_ids');
assert.ok(worldObservatoryCron.includes('Closure-report generation is downstream narrative projection only and cannot change classification.'), 'manual_closure_report_boundary_missing');
assert.ok(worldObservatoryCron.includes('Hypothesis closure reports are downstream narrative projections of classifications already persisted by calibration and cannot change them.'), 'scheduled_closure_report_boundary_missing');

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
    worldVectorRetrospectiveSameDayOnly:true,
    worldVectorRetrospectiveMcpGoverned:true,
    worldSpectIndependentEgressLane:true,
    worldSpectGovernedManualMeasurement:true,
    worldSpectHistoricalRecoveryAuditable:true,
    worldSpectHistoricalRecoveryNoCronFabrication:true,
    acquisitionTimeCalibration:true,
    simulationDoesNotRewriteObservation:true,
    publicFieldSingleReadOwner:true,
    satelliteHubSingleInterpretiveOwner:true,
    latestPublicHypotheses:8,
    liveWorldRequiresRecentPersistedObservation:true,
    typedWorldFieldProjection:true,
    optionalSemanticGpuLayer:true,
    gpuCreatesEvidence:false,
    svgDomCanonicalInteractionSurface:true,
    persistedT0T1Comparison:true,
    hypothesisClosureReturnDiff:true,
    closureReportClassificationAuthority:'WORLD_CALIBRATION_ONLY',
    closureReportExistingOwner:'sfi_cognitive_twin_runs',
    historicalGraphBackdating:false,
    worldFieldSecondReadOwner:false,
    observatoryDataPolling:false,
    observatorySnapshotReuse:true,
    falseZeroPrevented:true,
    sourceEvidenceBoundaryPreserved:true,
    nationalFieldAutoPromotion:false,
  },
},null,2));