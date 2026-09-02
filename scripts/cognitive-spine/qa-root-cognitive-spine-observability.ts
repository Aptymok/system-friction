import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const reader = read('src/lib/root/cognitiveSpineStatus.ts');
const route = read('src/app/api/root/cognitive-spine/status/route.ts');
const scenes = read('src/components/sfi/scenes.ts');
const liveUi = read('src/components/sfi/SfiConsole.tsx');
const operatingUi = read('src/components/sfi/SfiOperatingWorkspace.tsx');
const scenePage = read('src/app/[scene]/page.tsx');
const anatomy = read('src/components/root/cognitive-spine/CognitiveSpineAnatomy.tsx');
const park = read('src/components/sfi/CognitiveSpinePark.tsx');
const parkCss = read('src/components/sfi/CognitiveSpinePark.css');
const workboard = read('src/components/sfi/RootOperationalWorkboard.tsx');

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

// ROOT stays on the canonical live-scene runtime. Method Lab is not an owner of this projection.
// Follow the current capability owners rather than a retired pre-convergence component location.
assert.ok(scenes.includes("root:{key:'root'"), 'root_live_scene_missing');
assert.ok(scenes.includes("title:'Observatorio de Fricción'"), 'root_live_scene_semantics_missing');
assert.ok(liveUi.includes('COGNITIVE TWIN'), 'root_live_scene_twin_observability_missing');
assert.ok(operatingUi.includes("jsonFetch('/api/acp/proposals')") && operatingUi.includes('setProposals'), 'root_operating_workspace_proposal_feed_missing');
assert.ok(operatingUi.includes('ACEPTAR') && operatingUi.includes('DENEGAR') && operatingUi.includes('PEDIR EVIDENCIA'), 'root_operating_workspace_governance_controls_missing');
assert.ok(scenePage.includes('SCENE_KEYS.includes'), 'dynamic_scene_gate_missing');
assert.ok(scenePage.includes('<SfiConsole') && scenePage.includes('scene={scene as SceneKey}'), 'dynamic_scene_runtime_missing');

// Workboard mounts the existing Spine owner and only ROOT receives sovereign operation controls.
assert.ok(workboard.includes("@/components/root/cognitive-spine/CognitiveSpineAnatomy"), 'root_workboard_spine_anatomy_missing');
assert.ok(workboard.includes('<CognitiveSpineAnatomy'), 'root_workboard_spine_mount_missing');
assert.ok(workboard.includes('focusOptions={focusOptions}'), 'spine_observation_focus_missing');
assert.ok(workboard.includes("canOperate={data?.authority === 'root'}"), 'spine_root_operation_authority_gate_missing');

// Anatomy is now a data adapter over the approved park, not the old CSS skeleton.
assert.ok(anatomy.includes("@/components/sfi/CognitiveSpinePark"), 'spine_shared_park_renderer_missing');
assert.ok(anatomy.includes('<CognitiveSpinePark'), 'spine_park_projection_missing');
assert.ok(anatomy.includes("fetch('/api/root/cognitive-spine/status'"), 'spine_anatomy_must_reuse_existing_status_contract');
assert.ok(anatomy.includes("fetch('/api/root/cognitive-runtime'"), 'spine_anatomy_must_reuse_existing_runtime_contract');
assert.ok(anatomy.includes("fetch('/api/logbook/visible?role=root'"), 'spine_root_logbook_observability_missing');
assert.ok(anatomy.includes('/api/root/operational/trigger-observation?job='), 'spine_must_reuse_existing_root_runner');
assert.ok(anatomy.includes('SFI_AGENT_EXECUTED'), 'agent_live_state_must_use_observed_execution_trace');
assert.ok(anatomy.includes('ACTIVITY_WINDOW_MS'), 'agent_activity_window_missing');
assert.ok(anatomy.includes('psychological_simulator'), 'affective_loop_must_map_actual_simulator');
assert.ok(anatomy.includes('Context is not evidence.'), 'spine_epistemic_boundary_missing');
assert.ok(anatomy.includes('CANON ONLY BY ROOT'), 'spine_canon_boundary_missing');
assert.equal(anatomy.includes('csSkull'), false, 'legacy_css_skull_must_not_be_primary_visual');
assert.equal(anatomy.includes('csRib'), false, 'legacy_css_ribs_must_not_be_primary_visual');
assert.equal(anatomy.includes('csSpineAxis'), false, 'legacy_css_spine_axis_must_not_be_primary_visual');
assert.equal(/createServiceSupabaseClient|\.from\s*\(\s*['"][A-Za-z_][A-Za-z0-9_]*['"]\s*\)/.test(anatomy), false, 'spine_anatomy_must_not_read_raw_db');
assert.equal(anatomy.includes('/api/root/governance/promote'), false, 'park_must_not_promote_canon');

// The shared renderer owns presentation only: exact approved responsive artwork + semantic overlays, no backend.
for (const asset of ['park-desktop.avif', 'park-tablet.avif', 'park-mobile.avif']) {
  const relative = `public/cognitive-spine/${asset}`;
  const absolute = path.join(root, relative);
  const buffer = readFileSync(absolute);
  assert.ok(statSync(absolute).size > 4000, `spine_park_asset_unexpectedly_small:${relative}`);
  const signature = buffer.subarray(0, 32).toString('ascii');
  assert.ok(signature.includes('ftypavif') || signature.includes('ftypavis'), `spine_park_asset_invalid_avif:${relative}`);
  assert.ok(park.includes(`/cognitive-spine/${asset}`), `spine_park_renderer_missing_asset:${asset}`);
}
assert.ok(park.includes('OBSERVED OBJECT · NEVER LOST'), 'spine_park_object_continuity_boundary_missing');
assert.ok(park.includes('AMBIENT MOTION ≠ ACTIVITY'), 'spine_park_ambient_truth_boundary_missing');
assert.ok(park.includes('LIVE = OBSERVED EVENT ONLY'), 'spine_park_live_truth_boundary_missing');
assert.equal(park.includes('fetch('), false, 'spine_park_renderer_must_not_own_backend_reads');
assert.equal(/supabase|createServiceSupabaseClient|\.from\s*\(/i.test(park), false, 'spine_park_renderer_must_not_own_storage');
assert.ok(parkCss.includes('.sfiParkArt img'), 'spine_approved_art_primary_layer_missing');
assert.ok(parkCss.includes('.sfiParkHotspot'), 'spine_operational_hotspot_layer_missing');
assert.ok(parkCss.includes('@media(max-width:640px)'), 'spine_mobile_projection_missing');
assert.ok(parkCss.includes('@media(prefers-reduced-motion:reduce)'), 'spine_reduced_motion_boundary_missing');

console.log(JSON.stringify({
  ok: true,
  statusContract: 'SFI-ROOT-CT-STATUS-1.2',
  rootOnlyOperations: true,
  consumesCt: false,
  canonicalWrite: false,
  internalRefsExposed: false,
  rootDependsOnCtAvailability: false,
  rootSurface: 'ROOT_LIVE_SCENE',
  cognitiveSpinePark: 'APPROVED_ARTWORK_EXISTING_CONTRACT_PROJECTION',
  observationFocusPreserved: true,
  runtimeAgentTruth: 'RECENT_PERSISTED_SFI_AGENT_EXECUTED',
  ambientMotionIsStatus: false,
  methodLabDelta: 'NONE',
}, null, 2));
