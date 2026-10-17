import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const proof = fs.readFileSync('src/lib/root/closure/totalProof.ts','utf8');
const fullCycleSource = fs.readFileSync('src/lib/root/closure/fullCycleVerification.ts','utf8');
const fullCycleExports:Record<string, any>={};
vm.runInNewContext(ts.transpileModule(fullCycleSource,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText,{exports:fullCycleExports,require:()=>({}),Date,Boolean,Number,Array,String,JSON});
const verifyField = fullCycleExports.hasObservedFieldReturn as (caseRow:object,returnRow:object,outcomeRow:object,interventionRow:object)=>boolean;
assert.equal(typeof verifyField,'function','full_cycle_field_return_admission_missing');
const fieldCase={id:'case-1',status:'CLOSED_OBSERVED',consent:true,deleted_at:null};
const fieldReturn={case_id:'case-1',intervention_id:'int-1',status:'RETURN_ACCEPTED',expected_at:'2026-10-10T12:00:00Z',returned_at:'2026-10-12T12:00:00Z',evidence_ids:['evidence-1']};
const fieldOutcome={id:'outcome-1',case_id:'case-1',intervention_id:'int-1',recorded_at:'2026-10-12T12:02:00Z',expected:'bounded expected change',actual:'observed change',evidence_ids:['evidence-1'],verified:false};
const intervention={id:'int-1',case_id:'case-1',status:'EXECUTION_RECORDED'};
assert.equal(verifyField(fieldCase,fieldReturn,fieldOutcome,intervention),true,'real accepted observed outcome may pass without claiming independent verification');
assert.equal(verifyField(fieldCase,{...fieldReturn,status:'WAITING_RETURN'},fieldOutcome,intervention),false,'pending return must not certify a cycle');
assert.equal(verifyField(fieldCase,{...fieldReturn,status:'RETURN_RECORDED_UNVERIFIED'},fieldOutcome,intervention),false,'unaccepted return must remain blocked');
assert.equal(verifyField(fieldCase,{...fieldReturn,returned_at:'2026-10-09T12:00:00Z'},fieldOutcome,intervention),false,'return before T1 must not certify a cycle');
assert.equal(verifyField(fieldCase,fieldReturn,{...fieldOutcome,intervention_id:'unrelated'},intervention),false,'outcome intervention must match the acknowledged execution');
assert.equal(verifyField(fieldCase,fieldReturn,{...fieldOutcome,evidence_ids:['unrelated']},intervention),false,'evidence lineage must be shared');
assert.equal(verifyField({...fieldCase,consent:false},fieldReturn,fieldOutcome,intervention),false,'no independent consent means no Field proof');
assert.equal(verifyField(fieldCase,fieldReturn,fieldOutcome,{...intervention,status:'PENDING'}),false,'non-executed intervention cannot prove external RETURN');
assert.ok(fullCycleSource.includes("order('recorded_at'"), 'Field outcome query must use its actual recorded_at column');
assert.ok(fullCycleSource.includes(".eq('intervention_id',interventionId)"), 'Field return query must constrain the same intervention');

const readiness = fs.readFileSync('src/lib/root/closure/readInstitutionalReadiness.ts','utf8');
const route = fs.readFileSync('src/app/api/root/readiness/route.ts','utf8');
const continuityRoute = fs.readFileSync('src/app/api/root/continuity/route.ts','utf8');
const scenes = fs.readFileSync('src/components/sfi/scenes.ts','utf8');
const shellUi = fs.readFileSync('src/components/sfi/SfiConsole.tsx','utf8');
const authMenu = fs.readFileSync('src/components/sfi/AuthenticatedSfiMenu.tsx','utf8');
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
assert.ok(governanceUi.includes("jsonFetch('/api/root/interactive?surface=governance')") && governanceUi.includes('/api/root/cognitive-runtime/records?agentId=') && governanceUi.includes('AGENTS · PASSPORT'), 'live_runtime_telemetry_missing');
assert.ok(governanceUi.includes('DEFERRED HYDRATION') && governanceUi.includes('includeTargets=1'), 'governance_selective_hydration_missing');
assert.doesNotMatch(governanceUi,/setInterval\(/,'governance_ui_must_not_poll');
assert.doesNotMatch(operatingUi,/setInterval\(/,'operating_ui_must_not_poll');
assert.doesNotMatch(rootUi,/setInterval\(/,'root_ui_must_not_poll');
assert.ok(operatingUi.includes("surface==='twin'") && operatingUi.includes('CognitiveSpineAnatomy'), 'live_twin_observability_missing');
assert.ok(rootUi.includes('ACCEPT') && rootUi.includes('DENY') && rootUi.includes('REQUEST EVIDENCE'), 'root_governed_decision_controls_missing');
assert.doesNotMatch(governanceUi,/ACEPTAR|DENEGAR|PEDIR EVIDENCIA|SOLICITAR EVIDENCIA/,'runtime_surface_must_not_duplicate_sovereign_controls');
assert.ok(authMenu.includes("href:'/root?reading=CURRENT_STATE'"), 'decision_navigation_must_converge_on_canonical_root_field');

assert.match(continuityRoute,/readContinuityDashboard/,'continuity_dashboard_handler_missing');
assert.match(continuityRoute,/runContinuityHeartbeat/,'continuity_heartbeat_handler_missing');
assert.match(continuityRoute,/continuity\.mode\.change/,'continuity_mode_audit_missing');

console.log(JSON.stringify({ok:true,contract:'SFI-TOTAL-PROOF-1.3',stages:8,continuityApiSeparated:true,rootSurface:'SOVEREIGN_ROOT_RUNTIME_DEFERRED_NO_UI_POLLING'},null,2));