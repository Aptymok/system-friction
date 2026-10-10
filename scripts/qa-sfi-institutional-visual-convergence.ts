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
const realityCss=read('src/components/sfi/RealityChainWorkbench.css');
const methodCss=read('src/components/sfi/MethodLabUnifiedSurface.css');
const repositoryCss=read('src/app/repository/repository.css');
const repositoryUi=read('src/app/repository/RepositoryConsole.tsx');
const methodPanorama=read('src/components/sfi/MethodLabPanorama.tsx');
const timelineUi=read('src/components/sfi/OperationalTimeline.tsx');
const timelinePage=read('src/app/timeline/page.tsx');
const methodNativeCss=read('src/components/sfi/MethodLabNativeHub.css');
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
assert.ok(instruments.includes("href:'/observatory?lens=world-vector'") && instruments.includes("href:'/observatory?lens=trajectory&focus=timeline'"),'world_vector_timeline_must_resolve_to_live_observatory');

assert.ok(methodPanorama.includes('protocols.reduce') && methodPanorama.includes('sessions.filter') && methodPanorama.includes('evidenceCount') && methodPanorama.includes('SIMULATION ≠ OBSERVATION'),'method_lab_panorama_requires_persisted_operating_data');
assert.ok(timelinePage.includes('readPublicWorldSnapshotTimeline') && timelinePage.includes('SFI_CANONICAL_OBJECT_REGISTRY') && timelineUi.includes('NO RECORDED ENTRIES IN SELECTED WINDOW'),'timeline_must_preserve_real_data_and_empty_states');
assert.equal(methodNativeCss.includes("url('/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_26-3.png')"),false,'method_lab_must_not_render_screenshot_as_dashboard');
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
