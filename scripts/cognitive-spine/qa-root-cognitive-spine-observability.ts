import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const reader = read('src/lib/root/cognitiveSpineStatus.ts');
const route = read('src/app/api/root/cognitive-spine/status/route.ts');
const scenes = read('src/components/sfi/scenes.ts');
const liveUi = read('src/components/sfi/SfiConsole.tsx');
const scenePage = read('src/app/[scene]/page.tsx');
const anatomy = read('src/components/root/cognitive-spine/CognitiveSpineAnatomy.tsx');
const workboard = read('src/components/sfi/RootOperationalWorkboard.tsx');
const workboardCss = read('src/components/sfi/RootOperationalWorkboard.css');
const operationRoute = read('src/app/api/root/operational/trigger-observation/route.ts');
const runtimeRoute = read('src/app/api/root/cognitive-runtime/route.ts');

assert.ok(reader.includes('ROOT_GOVERNANCE_CONTEXT_PROFILE'), 'root_ct_status_profile_missing');
assert.ok(reader.includes('consume: false'), 'root_ct_status_must_not_consume_context');
assert.ok(reader.includes('internalRefsExposed: false'), 'root_ct_status_internal_ref_boundary_missing');
assert.ok(reader.includes('sources: state.derivedState.sourceCount'), 'root_ct_status_source_count_missing');
assert.ok(reader.includes('evidence: state.evidenceRefs.length'), 'root_ct_status_evidence_count_missing');
assert.ok(reader.includes('verificationDebt: state.verificationDebt.absolute'), 'root_ct_status_verification_debt_missing');
assert.equal(reader.includes('evidenceRefs: state.evidenceRefs'), false, 'root_ct_status_exposes_evidence_refs');
assert.equal(reader.includes('memoryRefs: state.memoryRefs'), false, 'root_ct_status_exposes_memory_refs');
assert.equal(reader.includes('decisionRefs: state.decisionRefs'), false, 'root_ct_status_exposes_decision_refs');
assert.equal(reader.includes('.insert('), false, 'root_ct_status_writes_state');
assert.equal(reader.includes('.update('), false, 'root_ct_status_mutates_state');
assert.ok(reader.includes('available: false as const'), 'root_ct_status_unavailability_fallback_missing');

assert.ok(route.includes("requireRootViewer('root.cognitive-spine.status')"), 'root_ct_status_endpoint_not_root_gated');
assert.ok(route.includes("'Cache-Control': 'no-store'"), 'root_ct_status_endpoint_cache_boundary_missing');

// ROOT observability remains in the canonical live-scene runtime.
assert.ok(scenes.includes("root:{key:'root'"), 'root_live_scene_missing');
assert.ok(scenes.includes("title:'SFI · director operativo'"), 'root_live_scene_semantics_missing');
assert.ok(liveUi.includes('COGNITIVE TWIN'), 'root_live_scene_twin_observability_missing');
assert.ok(liveUi.includes('/api/acp/proposals'), 'root_live_scene_proposal_feed_missing');
assert.ok(liveUi.includes('ACEPTAR') && liveUi.includes('RECHAZAR'), 'root_live_scene_governance_controls_missing');
assert.ok(liveUi.includes('auth.identity?.alias||auth.status'), 'root_live_scene_identity_observability_missing');
assert.ok(scenePage.includes('SCENE_KEYS.includes'), 'dynamic_scene_gate_missing');
assert.ok(scenePage.includes('<SfiConsole') && scenePage.includes('scene={scene as SceneKey}'), 'dynamic_scene_runtime_missing');

// The park extends the existing ROOT/Cognitive Spine owner; it does not become a new app or persistence owner.
assert.ok(workboard.includes("@/components/root/cognitive-spine/CognitiveSpineAnatomy"), 'root_workboard_spine_anatomy_missing');
assert.ok(workboard.includes('<CognitiveSpineAnatomy'), 'root_workboard_spine_mount_missing');
assert.ok(workboard.includes('focusOptions={focusOptions}'), 'spine_observation_focus_missing');
assert.ok(workboard.includes('canOperate={canOperate}'), 'spine_sovereign_operation_boundary_missing');
assert.ok(workboard.includes("data?.authority === 'root'"), 'spine_operation_authority_not_derived_from_workboard');

for (const asset of [
  'public/cognitive-spine/park-desktop.avif',
  'public/cognitive-spine/park-tablet.avif',
  'public/cognitive-spine/park-mobile.avif',
]) {
  const absolute = path.join(root, asset);
  assert.ok(existsSync(absolute), `spine_park_asset_missing:${asset}`);
  assert.ok(statSync(absolute).size > 20_000, `spine_park_asset_unexpectedly_small:${asset}`);
}
assert.ok(anatomy.includes('/cognitive-spine/park-desktop.avif'), 'desktop_park_art_not_used');
assert.ok(anatomy.includes('/cognitive-spine/park-tablet.avif'), 'tablet_park_art_not_used');
assert.ok(anatomy.includes('/cognitive-spine/park-mobile.avif'), 'mobile_park_art_not_used');
assert.ok(anatomy.includes('<picture className="csParkArt"'), 'responsive_park_picture_missing');

assert.ok(anatomy.includes("fetch('/api/root/cognitive-spine/status'"), 'spine_park_must_reuse_existing_status_contract');
assert.ok(anatomy.includes("fetch('/api/root/cognitive-runtime'"), 'spine_park_must_reuse_existing_runtime_contract');
assert.ok(anatomy.includes("fetch('/api/logbook/visible?role=root'"), 'spine_park_logbook_must_reuse_existing_reader');
assert.ok(anatomy.includes('/api/root/operational/trigger-observation?job='), 'spine_park_root_operation_must_reuse_existing_runner');
assert.ok(anatomy.includes("method: 'POST'"), 'spine_park_governed_operation_not_wired');
assert.ok(anatomy.includes('PLAN PERSISTED · NOT EXECUTED'), 'spine_park_plan_execution_boundary_missing');
assert.ok(anatomy.includes('SFI_TASK_CREATED'), 'spine_park_task_graph_persistence_semantics_missing');
assert.ok(operationRoute.includes("requireRootActor('root.operational.observe')"), 'existing_root_operation_not_sovereign_gated');
assert.ok(runtimeRoute.includes("requireRootActor('root.cognitive-runtime.plan')"), 'existing_cognitive_plan_not_sovereign_gated');

const fetchTargets = [...anatomy.matchAll(/fetch\(\s*['"`]([^'"`]+)/g)].map((match) => match[1]);
const allowedFetchPrefixes = [
  '/api/root/cognitive-spine/status',
  '/api/root/cognitive-runtime',
  '/api/logbook/visible?role=root',
  '/api/root/operational/trigger-observation?job=',
];
for (const target of fetchTargets) {
  assert.ok(allowedFetchPrefixes.some((allowed) => target.startsWith(allowed)), `spine_park_unknown_fetch_target:${target}`);
}
assert.equal(/createServiceSupabaseClient|\.from\s*\(\s*['"][A-Za-z_][A-Za-z0-9_]*['"]\s*\)/.test(anatomy), false, 'spine_park_must_not_read_or_write_raw_db');
assert.equal(/\/api\/root\/governance\/promote/.test(anatomy), false, 'spine_park_must_not_promote_canon');
assert.equal(/executeRegisteredAgent|runCognitiveAgent|executeSfiRuntime/.test(anatomy), false, 'spine_park_must_not_bypass_existing_runtime_operation_boundary');

assert.ok(anatomy.includes('OBSERVED OBJECT · NEVER LOST'), 'spine_park_must_remain_object_focused');
assert.ok(anatomy.includes('SFI_AGENT_EXECUTED'), 'agent_activity_must_use_observed_execution_trace');
for (const zone of ['observer','memory','affective','signal','fragment','core','return']) {
  assert.ok(anatomy.includes(`id: '${zone}'`), `spine_park_zone_missing:${zone}`);
  assert.ok(workboardCss.includes(`.zone-${zone}`), `spine_park_zone_position_missing:${zone}`);
}
assert.ok(anatomy.includes('Spine context is not evidence.'), 'spine_epistemic_boundary_missing');
assert.ok(anatomy.includes('Registration is not execution.'), 'agent_execution_boundary_missing');
assert.ok(anatomy.includes('Planning is not execution.'), 'planning_execution_boundary_missing');
assert.ok(anatomy.includes('ROOT canon remains a separate promotion.'), 'spine_canon_boundary_missing');
assert.ok(workboardCss.includes('.csOverlay{position:fixed'), 'spine_overlay_visual_layer_missing');
assert.ok(workboardCss.includes('.csParkStage'), 'spine_park_stage_missing');
assert.ok(workboardCss.includes('.csZone.isLive'), 'spine_observed_activity_glow_missing');
assert.ok(workboardCss.includes('@media(prefers-reduced-motion:reduce)'), 'spine_motion_accessibility_boundary_missing');

console.log(JSON.stringify({
  ok: true,
  statusContract: 'SFI-ROOT-CT-STATUS-1.3',
  rootOnlyOperations: true,
  consumesCtForInspection: false,
  canonicalWrite: false,
  internalRefsExposed: false,
  rootDependsOnCtAvailability: false,
  rootSurface: 'ROOT_LIVE_SCENE',
  cognitiveSpinePark: 'RESPONSIVE_EXISTING_CONTRACT_INSTRUMENT',
  observationFocusPreserved: true,
  runtimeAgentTruth: 'OBSERVED_EXECUTION_NOT_REGISTRY_PRESENCE',
  semanticGlowTruth: 'RECENT_EXECUTION_OR_OBSERVED_STATE_ONLY',
  rootOperationContract: 'EXISTING_ROOT_OBSERVATION_RUNNER',
  planContract: 'SFI_TASK_CREATED_NOT_EXECUTION',
  newBackendOwner: false,
  newDatabaseObject: false,
  canonPromotionControl: false,
}, null, 2));
