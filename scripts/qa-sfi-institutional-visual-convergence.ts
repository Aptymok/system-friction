import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');
const rail=read('src/components/sfi/InstitutionalSurfaceRail.tsx');
const railCss=read('src/components/sfi/InstitutionalSurfaceRail.css');
const rootScene=read('src/app/[scene]/page.tsx');
const lab=read('src/components/sfi/MethodLabUnifiedSurface.tsx');
const neural=read('src/components/sfi/RootNeuralGraphView.tsx');
const neuralPixi=read('src/components/sfi/RootCognitiveFieldPixi.tsx');
const discovery=read('src/app/root/discovery/page.tsx');
const evidence=read('src/components/sfi/RootEvidenceReviewConsole.tsx');
const evidenceCss=read('src/components/sfi/RootEvidenceReviewConsole.css');
const access=read('src/app/root/access/page.tsx');
const accessCss=read('src/app/root/access/root-access.css');
const observatory=read('src/components/sfi/ObservatoryConsole.tsx');
const observatoryCss=read('src/components/sfi/ObservatoryConsole.css');
const observatoryGlobe=read('src/components/sfi/ObservatoryGlobe.tsx');
const publicChrome=read('src/components/public/SfiPublicChrome.tsx');
const publicEntry=read('src/components/sfi/PublicEntryGateway.tsx');
const realityCss=read('src/components/sfi/RealityChainWorkbench.css');
const methodCss=read('src/components/sfi/MethodLabUnifiedSurface.css');
const repositoryCss=read('src/app/repository/repository.css');
const repositoryUi=read('src/app/repository/RepositoryConsole.tsx');
const methodPanorama=read('src/components/sfi/MethodLabPanorama.tsx');
const timelineUi=read('src/components/sfi/OperationalTimeline.tsx');
const timelinePage=read('src/app/timeline/page.tsx');
const methodNativeCss=read('src/components/sfi/MethodLabNativeHub.css');
const methodNativeUi=read('src/components/sfi/MethodLabNativeHub.tsx');
const methodPanoramaUi=read('src/components/sfi/MethodLabPanorama.tsx');
const methodPanoramaCss=read('src/components/sfi/MethodLabPanorama.css');
const instruments=read('src/components/sfi/PublicInstrumentSurface.tsx');

for(const token of ['ROOT','LABORATORY','DISCOVERY','EVIDENCE','ACCESS']) assert.ok(rail.includes(token),'institutional_surface_missing:'+token);
for(const token of ['ACCESS ≠ AUTHORITY','SIMULATED ≠ OBSERVED','EXPOSURE ≠ DISCOVERY','SOURCE ≠ EVIDENCE']) assert.ok(rail.includes(token),'institutional_boundary_missing:'+token);
assert.ok(neural.includes('reality?:') && neural.includes('epistemicClass') && neural.includes('observedReturn'),'root_neural_epistemic_boundary_missing');
assert.ok(rail.includes('data-sfi-internal-shell="SFI-INTERNAL-VISUAL-1.0"'),'internal_visual_contract_missing');
assert.ok(railCss.includes('prefers-reduced-motion'),'internal_shell_reduced_motion_missing');

assert.ok(rootScene.includes('data-root-primary-interface="CANONICAL_COGNITIVE_FIELD"') && rootScene.includes('<RootNeuralGraphView'),'root_neural_field_not_canonical');
assert.ok(lab.includes('CONTROLLED EXPERIMENTATION') && lab.includes('METHOD LAB') && lab.includes('EVIDENCE / RUN') && lab.includes('RESEARCH / RETURN'),'lab_not_converged');
assert.ok(neural.includes('data-neural-graph-contract="SFI-ROOT-NEURAL-GRAPH-1.1"') && neural.includes('<RootCognitiveFieldPixi') && neuralPixi.includes("from 'pixi.js'"),'root_neural_visual_contract_missing');
assert.equal(neural.includes('<InstitutionalSurfaceRail surface="NEURAL_GRAPH"'),false,'neural_graph_must_not_reappear_as_separate_institutional_surface');
assert.ok(discovery.includes('<InstitutionalSurfaceRail surface="DISCOVERY"'),'discovery_not_converged');
assert.ok(evidence.includes('<InstitutionalSurfaceRail surface="EVIDENCE"'),'evidence_not_converged');
assert.ok(access.includes('<InstitutionalSurfaceRail surface="ACCESS"'),'access_not_converged');

assert.ok(evidence.includes('Evidence is admitted, not assumed.'),'evidence_chamber_identity_missing');
assert.ok(evidence.includes('SOURCE ≠ EVIDENCE'),'evidence_chamber_boundary_missing');
assert.ok(evidenceCss.includes('.rootEvidenceShell'),'evidence_visual_shell_missing');
assert.ok(access.includes('Invite access without manufacturing authority.'),'access_chamber_identity_missing');
assert.ok(access.includes('ACCESS ≠ AUTHORITY'),'access_chamber_boundary_missing');
assert.ok(accessCss.includes('.rootAccessShell'),'access_visual_shell_missing');

for(const [name,source,contract] of [
  ['observatory',observatoryCss,'SFI-INSTRUMENT-OBSERVATORY-1.0'],
  ['reality-chain',realityCss,'SFI-INSTRUMENT-REALITY-CHAIN-1.0'],
  ['method-lab',methodCss,'SFI-INSTRUMENT-METHOD-LAB-1.0'],
  ['access',accessCss,'SFI-INSTRUMENT-ACCESS-1.0'],
  ['repository',repositoryCss,'SFI-LIVE-REPOSITORY-1.0'],
] as const) assert.ok(source.includes(contract),`canonical_visual_contract_missing:${name}`);
assert.ok(observatory.includes("fetchJson('/api/observatory/world')") && observatory.includes("fetchJson('/api/observatory/state?view=observatory')") && observatory.includes("fetchJson('/api/observatory/timeline')"),'observatory_visual_must_remain_live');
assert.ok(observatory.includes('useSearchParams') && observatory.includes('requestedLens'),'observatory_lens_deeplink_missing');
assert.ok(instruments.includes("href:'/observatory?lens=world-vector'") && instruments.includes("label:'OPEN INSTITUTIONAL TIMELINE',href:'/timeline'"),'world_vector_goes_to_observatory_but_timeline_must_go_to_timeline');
assert.ok(observatory.includes('<ObservatoryGlobe') && observatory.includes('data-earth-surface="RESTORED-WEBGL-1"'),'live_earth_must_be_mounted_in_observatory');
assert.ok(observatoryGlobe.includes("getContext('webgl'") && observatoryGlobe.includes('onPointerMove') && observatoryGlobe.includes('Pause rotation') && observatoryGlobe.includes('pinsRef.current'),'accepted_interactive_globe_controls_and_sourced_pins_missing');
assert.ok(observatoryGlobe.includes('IntersectionObserver') && observatoryGlobe.includes('gl.CLAMP_TO_EDGE'),'globe_must_throttle_offscreen_and_support_npot_webgl_texture');
assert.ok(observatoryCss.includes('.earthStage[data-earth-surface="RESTORED-WEBGL-1"]') && observatoryCss.includes('display:block!important'),'legacy_single_background_override_must_not_hide_accepted_globe');
assert.ok(publicChrome.includes("{key:'timeline',label:'TIMELINE',href:'/timeline'}") && publicEntry.includes("sceneId:'timeline',href:'/timeline'"),'public_timeline_must_open_operational_timeline_directly');

assert.ok(methodPanorama.includes('protocols.reduce') && methodPanorama.includes('sessions.filter') && methodPanorama.includes('evidenceCount') && methodPanorama.includes('SIMULATION ≠ OBSERVATION'),'method_lab_panorama_requires_persisted_operating_data');
assert.ok(timelinePage.includes('readPublicWorldSnapshotTimeline') && timelinePage.includes('SFI_CANONICAL_OBJECT_REGISTRY') && timelineUi.includes('NO RECORDED ENTRIES IN SELECTED WINDOW'),'timeline_must_preserve_real_data_and_empty_states');
assert.equal(methodNativeCss.includes("url('/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_26-3.png')"),false,'method_lab_must_not_render_screenshot_as_dashboard');
assert.ok(!/<h[1-6]\\b/.test(methodNativeUi) && !/<h[1-6]\\b/.test(methodPanoramaUi),'method_lab_operational_headlines_must_be_replaced_with_instructions');
assert.ok((methodNativeUi.match(/<details/g)||[]).length>=10 && methodNativeUi.includes('mlh-tile-trigger'),'method_lab_registry_and_workflow_tiles_must_use_native_accessible_accordions');
assert.ok(methodPanoramaUi.includes('mlp-tile') && methodPanoramaUi.includes('mlp-phase-content'),'method_lab_panorama_must_use_weighted_expandable_stage_tiles');
assert.ok(methodNativeUi.includes("'/api/root/method-lab/simulate'") && methodNativeUi.includes("'/api/root/cognitive-lab/sessions'"),'method_lab_actual_governed_actions_must_survive_visual_update');
for(const width of ['740px','370px','520px','770px','810px','310px'])assert.ok(methodNativeCss.includes(width),'method_lab_oversized_horizontal_section_must_be_narrowed:'+width);
assert.ok(methodNativeCss.includes('background:rgba(5,11,16,.30)!important') && methodPanoramaCss.includes('background:rgba(5,11,16,.30)!important'),'functional_method_lab_tiles_must_have_30_percent_alpha_not_text_opacity');
assert.ok(methodNativeCss.includes('.mlh-tile-trigger:focus-visible') && methodPanoramaCss.includes('.mlp-tile>summary:focus-visible'),'accordion_keyboard_focus_must_remain_visible');

assert.equal(repositoryCss.includes("url('/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_42-7.png')"),false,'repository_must_not_render_screenshot_as_dashboard');
assert.ok(repositoryUi.includes('SOURCE RECORDS') && repositoryUi.includes('DISCOVERY MESH') && repositoryUi.includes('REPOSITORY HISTORY') && repositoryCss.includes('.repoReader') && repositoryCss.includes('.repoDiscovery'), 'unified_repository_operational_visual_contract_missing');
assert.ok(realityCss.includes('blur(11px)') && realityCss.includes('width:300vw'),'reality_chain_reference_must_not_read_as_fake_ui');

for(const source of [rail,evidence,access]) assert.equal(/createServiceSupabaseClient|\.from\(|\.insert\(|\.update\(|\.upsert\(/.test(source),false,'visual convergence must not create a new data owner');

console.log(JSON.stringify({
  contract:'SFI-ELITE-P8-INSTITUTIONAL-VISUAL-CONVERGENCE-1.0',
  surfaces:['ROOT_NEURAL_FIELD','LABORATORY','DISCOVERY','EVIDENCE','ACCESS'],
  dataOwnershipChanged:false,
  authorityChanged:false,
  reducedMotionPreserved:true
}));
