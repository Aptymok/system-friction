import assert from 'node:assert/strict';
import fs from 'node:fs';

const proof = fs.readFileSync('src/lib/root/closure/totalProof.ts','utf8');
const readiness = fs.readFileSync('src/lib/root/closure/readInstitutionalReadiness.ts','utf8');
const route = fs.readFileSync('src/app/api/root/readiness/route.ts','utf8');
const continuityRoute = fs.readFileSync('src/app/api/root/continuity/route.ts','utf8');
const scenes = fs.readFileSync('src/components/sfi/scenes.ts','utf8');
const shellUi = fs.readFileSync('src/components/sfi/SfiConsole.tsx','utf8');
const rootUi = fs.readFileSync('src/components/sfi/SfiRootWorkspace.tsx','utf8');
const operatingUi = fs.readFileSync('src/components/sfi/SfiOperatingWorkspace.tsx','utf8');
const governanceUi = fs.readFileSync('src/components/sfi/SfiGovernanceWorkspace.tsx','utf8');
const interactiveApi = fs.readFileSync('src/app/api/root/interactive/route.ts','utf8');

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

// Readiness and continuity remain backend truth contracts. Presentation may evolve,
// but sovereign decisions must live in ROOT while runtime remains non-sovereign.
assert.ok(scenes.includes("root:{key:'root'"), 'root_live_scene_missing');
assert.ok(scenes.includes("governance:{key:'governance'"), 'governance_live_scene_missing');
assert.ok(scenes.includes("twin:{key:'twin'"), 'twin_live_scene_missing');
assert.ok(operatingUi.includes('/api/root/interactive?surface=') && operatingUi.includes('workboard?.operationalNext'), 'live_readiness_telemetry_missing');
assert.ok(interactiveApi.includes('readInteractiveOperationalNext') && interactiveApi.includes('duplicateBaseHttpReads: 0'), 'interactive_readiness_projection_must_be_bounded_and_nonduplicated');
assert.ok(interactiveApi.includes('targetHydrationDeferred: true') && interactiveApi.includes("includeTargets') === '1'"), 'governance_targets_must_be_deferred_until_requested');
assert.ok(operatingUi.includes('SfiGovernanceWorkspace'), 'governance_delegation_missing');
assert.ok(governanceUi.includes("jsonFetch('/api/root/interactive?surface=governance')") && governanceUi.includes('/api/root/cognitive-runtime/records?agentId=') && governanceUi.includes('AGENTES'), 'live_runtime_telemetry_missing');
assert.ok(governanceUi.includes('HIDRATACIÓN DIFERIDA') && governanceUi.includes('includeTargets=1'), 'governance_selective_hydration_missing');
assert.doesNotMatch(governanceUi,/setInterval\(/,'governance_ui_must_not_poll');
assert.doesNotMatch(operatingUi,/setInterval\(/,'operating_ui_must_not_poll');
assert.doesNotMatch(rootUi,/setInterval\(/,'root_ui_must_not_poll');
assert.ok(operatingUi.includes("surface==='twin'") && operatingUi.includes('CognitiveSpineAnatomy'), 'live_twin_observability_missing');
assert.ok(rootUi.includes('ACEPTAR') && rootUi.includes('DENEGAR') && rootUi.includes('SOLICITAR EVIDENCIA'), 'root_governed_decision_controls_missing');
assert.doesNotMatch(governanceUi,/ACEPTAR|DENEGAR|PEDIR EVIDENCIA|SOLICITAR EVIDENCIA/,'runtime_surface_must_not_duplicate_sovereign_controls');
assert.ok(shellUi.includes("label:'DECISIONES'") && shellUi.includes("href:'/root'"), 'decision_navigation_must_converge_on_root');

assert.match(continuityRoute,/readContinuityDashboard/,'continuity_dashboard_handler_missing');
assert.match(continuityRoute,/runContinuityHeartbeat/,'continuity_heartbeat_handler_missing');
assert.match(continuityRoute,/continuity\.mode\.change/,'continuity_mode_audit_missing');

console.log(JSON.stringify({ok:true,contract:'SFI-TOTAL-PROOF-1.3',stages:8,continuityApiSeparated:true,rootSurface:'SOVEREIGN_ROOT_RUNTIME_DEFERRED_NO_UI_POLLING'},null,2));