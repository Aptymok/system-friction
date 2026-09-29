import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');
const rail=read('src/components/sfi/InstitutionalSurfaceRail.tsx');
const railCss=read('src/components/sfi/InstitutionalSurfaceRail.css');
const rootScene=read('src/app/[scene]/page.tsx');
const lab=read('src/components/sfi/MethodLabEnvironment.tsx');
const neural=read('src/components/sfi/RootNeuralGraphView.tsx');
const discovery=read('src/app/root/discovery/page.tsx');
const evidence=read('src/components/sfi/RootEvidenceReviewConsole.tsx');
const evidenceCss=read('src/components/sfi/RootEvidenceReviewConsole.css');
const access=read('src/app/root/access/page.tsx');
const accessCss=read('src/app/root/access/root-access.css');

for(const token of ['ROOT','LABORATORY','DISCOVERY','EVIDENCE','ACCESS']) assert.ok(rail.includes(token),'institutional_surface_missing:'+token);
for(const token of ['ACCESS ≠ AUTHORITY','SIMULATED ≠ OBSERVED','EXPOSURE ≠ DISCOVERY','SOURCE ≠ EVIDENCE']) assert.ok(rail.includes(token),'institutional_boundary_missing:'+token);
assert.ok(neural.includes('RELATION ≠ CAUSALITY'),'root_neural_relation_boundary_missing');
assert.ok(rail.includes('data-sfi-internal-shell="SFI-INTERNAL-VISUAL-1.0"'),'internal_visual_contract_missing');
assert.ok(railCss.includes('prefers-reduced-motion'),'internal_shell_reduced_motion_missing');

assert.ok(rootScene.includes('data-root-primary-interface="CANONICAL_COGNITIVE_FIELD"') && rootScene.includes('<RootNeuralGraphView'),'root_neural_field_not_canonical');
assert.ok(lab.includes('<InstitutionalSurfaceRail surface="LABORATORY"'),'lab_not_converged');
assert.ok(neural.includes('data-neural-graph-contract="SFI-ROOT-NEURAL-GRAPH-1.0"'),'root_neural_visual_contract_missing');
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

for(const source of [rail,evidence,access]) assert.equal(/createServiceSupabaseClient|\.from\(|\.insert\(|\.update\(|\.upsert\(/.test(source),false,'visual convergence must not create a new data owner');

console.log(JSON.stringify({
  contract:'SFI-ELITE-P8-INSTITUTIONAL-VISUAL-CONVERGENCE-1.0',
  surfaces:['ROOT_NEURAL_FIELD','LABORATORY','DISCOVERY','EVIDENCE','ACCESS'],
  dataOwnershipChanged:false,
  authorityChanged:false,
  reducedMotionPreserved:true
}));
