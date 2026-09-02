import assert from 'node:assert/strict';
import fs from 'node:fs';

const proof = fs.readFileSync('src/lib/root/closure/totalProof.ts','utf8');
const readiness = fs.readFileSync('src/lib/root/closure/readInstitutionalReadiness.ts','utf8');
const route = fs.readFileSync('src/app/api/root/readiness/route.ts','utf8');
const continuityRoute = fs.readFileSync('src/app/api/root/continuity/route.ts','utf8');
const scenes = fs.readFileSync('src/components/sfi/scenes.ts','utf8');
const shellUi = fs.readFileSync('src/components/sfi/SfiConsole.tsx','utf8');
const operatingUi = fs.readFileSync('src/components/sfi/SfiOperatingWorkspace.tsx','utf8');

for (const stage of ['STRUCTURAL','AUTHORITY','OBSERVATION','INTERVENTION','RETURN','LAB','LEARNING','REPORTING']) {
  assert.match(proof, new RegExp(`id:'${stage}'`), `missing_total_proof_stage:${stage}`);
}
assert.match(proof,/field_outcomes/,'total_proof_missing_real_outcome_gate');
assert.match(proof,/longitudinalPass = stages\.every/,'longitudinal_proof_not_all_stages');
assert.match(proof,/software build, simulation, proposal or registered fork cannot satisfy/i,'truth_boundary_missing');
assert.match(proof,/institutional\.total_proof\.recorded/,'proof_receipt_event_missing');
assert.match(proof,/requireGovernedActor\('root\.total-proof\.record'\)/,'proof_receipt_not_governed');
assert.match(route,/requireRootViewer/,'proof_read_not_root_guarded');
assert.match(readiness,/scientificComplete:false/,'software_must_not_claim_scientific_completion');
assert.match(readiness,/externalGates/,'external_gate_separation_missing');

// Readiness and continuity remain backend truth contracts. Their telemetry is now
// expressed through the converged ROOT/GOVERNANCE/TWIN workspace rather than the
// deleted dashboard copy that previously exposed FUENTE VIVA / ESTADO literals.
assert.ok(scenes.includes("root:{key:'root'"), 'root_live_scene_missing');
assert.ok(scenes.includes("governance:{key:'governance'"), 'governance_live_scene_missing');
assert.ok(scenes.includes("twin:{key:'twin'"), 'twin_live_scene_missing');
assert.ok(operatingUi.includes("jsonFetch('/api/root/workboard')") && operatingUi.includes('workboard?.operationalNext'), 'live_readiness_telemetry_missing');
assert.ok(operatingUi.includes("jsonFetch('/api/root/cognitive-runtime')") && operatingUi.includes('AGENTES'), 'live_runtime_telemetry_missing');
assert.ok(operatingUi.includes("proposalReadState==='DEGRADED'") && operatingUi.includes('Fuente de propuestas DEGRADED'), 'degraded_governance_read_must_remain_visible');
assert.ok(operatingUi.includes("surface==='twin'") && operatingUi.includes('CognitiveSpineAnatomy'), 'live_twin_observability_missing');
assert.ok(operatingUi.includes('ACEPTAR') && operatingUi.includes('DENEGAR') && operatingUi.includes('PEDIR EVIDENCIA'), 'root_governed_decision_controls_missing');
assert.ok(shellUi.includes('GOVERNANCE QUEUE'), 'governance_queue_contract_missing');

assert.match(continuityRoute,/readContinuityDashboard/,'continuity_dashboard_handler_missing');
assert.match(continuityRoute,/runContinuityHeartbeat/,'continuity_heartbeat_handler_missing');
assert.match(continuityRoute,/continuity\.mode\.change/,'continuity_mode_audit_missing');

console.log(JSON.stringify({ok:true,contract:'SFI-TOTAL-PROOF-1.1',stages:8,continuityApiSeparated:true,rootSurface:'CONVERGED_ROOT_GOVERNANCE_TWIN_WORKSPACE'},null,2));