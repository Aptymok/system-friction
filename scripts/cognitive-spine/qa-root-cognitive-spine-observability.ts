import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

// Cognitive Spine anatomy is a read-only ROOT projection, not a new page/API/storage owner.
assert.ok(workboard.includes("@/components/root/cognitive-spine/CognitiveSpineAnatomy"), 'root_workboard_spine_anatomy_missing');
assert.ok(workboard.includes('<CognitiveSpineAnatomy'), 'root_workboard_spine_mount_missing');
assert.ok(workboard.includes('focusOptions={focusOptions}'), 'spine_observation_focus_missing');
assert.ok(anatomy.includes("fetch('/api/root/cognitive-spine/status'"), 'spine_anatomy_must_reuse_existing_status_contract');
assert.ok(anatomy.includes("fetch('/api/root/cognitive-runtime'"), 'spine_anatomy_must_reuse_existing_runtime_contract');
assert.ok(anatomy.includes('createPortal'), 'spine_anatomy_overlay_must_not_reflow_root');
assert.ok(anatomy.includes('OBSERVATION FOCUS') && anatomy.includes('OBSERVED OBJECT'), 'spine_anatomy_must_remain_object_focused');
assert.ok(anatomy.includes('SFI_AGENT_EXECUTED'), 'agent_status_must_use_observed_execution_trace');
for (const layer of ['observe','reconstruct','simulate','understand','project','decide','act','learn']) {
  assert.ok(anatomy.includes(`${layer}: { label:`), `spine_anatomy_layer_missing:${layer}`);
}
assert.ok(anatomy.includes('Spine context is not evidence.'), 'spine_epistemic_boundary_missing');
assert.ok(anatomy.includes('Agent registration is not execution.'), 'agent_execution_boundary_missing');
assert.ok(anatomy.includes('ROOT canon remains a separate governed promotion.'), 'spine_canon_boundary_missing');
assert.equal(/fetch\([^\n]+method:\s*['"]POST['"]/.test(anatomy), false, 'spine_anatomy_must_not_write');
assert.equal(/createServiceSupabaseClient|\.from\s*\(\s*['"][A-Za-z_][A-Za-z0-9_]*['"]\s*\)/.test(anatomy), false, 'spine_anatomy_must_not_read_raw_db');
assert.ok(workboardCss.includes('.csOverlay{position:fixed'), 'spine_overlay_visual_layer_missing');
assert.ok(workboardCss.includes('.csSpineAxis'), 'spine_axis_visual_missing');
assert.ok(workboardCss.includes('.csAgentFigure'), 'agent_figure_visual_missing');

console.log(JSON.stringify({
  ok: true,
  statusContract: 'SFI-ROOT-CT-STATUS-1.2',
  rootOnly: true,
  consumesCt: false,
  canonicalWrite: false,
  internalRefsExposed: false,
  rootDependsOnCtAvailability: false,
  rootSurface: 'ROOT_LIVE_SCENE',
  cognitiveSpineAnatomy: 'READ_ONLY_EXISTING_CONTRACT_PROJECTION',
  observationFocusPreserved: true,
  runtimeAgentTruth: 'OBSERVED_EXECUTION_NOT_REGISTRY_PRESENCE',
  twinProposalObservability: true,
  governedDecisionControls: true,
}, null, 2));
