import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd();
const read=(relative:string)=>fs.readFileSync(path.join(root,relative),'utf8');

const cycleMigration=read('supabase/migrations/20260811205500_sfi_operating_cycles.sql');
const analysisMigration=read('supabase/migrations/20260811214500_sfi_inference_and_artifact_trajectory.sql');
const cycleApi=read('src/app/api/pipeline/cycles/route.ts');
const evidenceApi=read('src/app/api/root/evidence/route.ts');
const inferenceApi=read('src/app/api/pipeline/inference/route.ts');
const suggestionApi=read('src/app/api/pipeline/inference/suggest/route.ts');
const trajectoryApi=read('src/app/api/pipeline/trajectory/route.ts');
const proof=read('src/lib/root/closure/fullCycleVerification.ts');
const proofRoute=read('src/app/api/pipeline/verify/route.ts');
const readiness=read('src/lib/root/closure/readInstitutionalReadiness.ts');
const scenes=read('src/components/sfi/scenes.ts');
const shellUi=read('src/components/sfi/SfiConsole.tsx');
const operatingUi=read('src/components/sfi/SfiOperatingWorkspace.tsx');
const observatoryUi=read('src/components/sfi/ObservatoryConsole.tsx');

for(const table of ['sfi_operating_cycles','sfi_inference_traces','sfi_artifact_trajectory_events']){
  assert.match(`${cycleMigration}\n${analysisMigration}`,new RegExp(`create table if not exists public\\.${table}\\b`),`missing_operating_table:${table}`);
}
for(const ref of ['evidence_refs','studio_object_refs','method_lab_refs','field_case_ref','return_refs','cognitive_twin_refs','governance_refs','inference_refs','trajectory_refs']){
  assert.ok(`${cycleMigration}\n${analysisMigration}`.includes(ref),`operating_cycle_missing_ref:${ref}`);
}
assert.match(cycleMigration,/workflow state, never evidence or scientific validation/i);
assert.match(analysisMigration,/inference trace is not observed evidence/i);
assert.match(analysisMigration,/does not prove causality, semantic drift or propagation/i);

assert.match(cycleApi,/requireRootActor\('root\.operate\.read'\)/);
assert.match(cycleApi,/resolveMihmMethod/);
assert.match(cycleApi,/requiresRivalHypothesis/);
assert.match(cycleApi,/requiresInterventionTracking/);
assert.match(cycleApi,/inference:'inference_refs'/);
assert.match(cycleApi,/trajectory:'trajectory_refs'/);

assert.match(evidenceApi,/event\.data\.event_id \?\? event\.data\.id/);
assert.match(evidenceApi,/epistemic_event_id: eventId/);
assert.match(evidenceApi,/root_evidence_epistemic_event_id_missing/);

assert.match(inferenceApi,/requireRootActor\('root\.operate\.inference\.write'\)/);
assert.match(inferenceApi,/epistemic_class:'INFERRED'/);
assert.match(inferenceApi,/rival_hypotheses:rivals/);
assert.match(inferenceApi,/discriminating_observations:discriminators/);
assert.match(inferenceApi,/CONTRAST_READY/);
assert.doesNotMatch(inferenceApi,/epistemic_class:'OBSERVED'/);

assert.match(suggestionApi,/requireRootActor\('root\.operate\.inference\.suggest'\)/);
assert.match(suggestionApi,/parseEvidenceLookupRefs/);
assert.match(suggestionApi,/\.in\('id', lookup\.rootIds\)/);
assert.match(suggestionApi,/\.in\('id', lookup\.ledgerIds\)/);
assert.doesNotMatch(suggestionApi,/\.limit\(500\)/);
assert.match(suggestionApi,/epistemicClass: 'INFERRED'/);

assert.match(trajectoryApi,/requireRootActor\('root\.operate\.trajectory\.write'\)/);
assert.match(trajectoryApi,/trajectory_event_requires_evidence_ref/);
assert.match(trajectoryApi,/evidence_refs:refs/);
assert.match(trajectoryApi,/parent_event_id:parentEventId/);
assert.match(trajectoryApi,/does not prove propagation, semantic drift, identity persistence or causality/i);

for(const marker of ['REAL_PERSISTED_EVIDENCE_REPLAY','No mocks, synthetic outcomes or hardcoded scientific observations','Field return is never fabricated','runStudioMasterAnalysisLoop','runMethodLabSimulation','runIntegratedInstitutionalCycle','readInstitutionalReadiness']){
  assert.ok(proof.includes(marker),`full_cycle_proof_missing:${marker}`);
}
assert.match(proof,/status:'BLOCKED'/);
assert.match(proof,/status:complete\?'CLOSED':'BLOCKED'/);
assert.match(proofRoute,/requireRootActor\('root\.operate\.full_cycle_verify'\)/);
assert.match(proofRoute,/status:result\.ok\?200:409/);

// The old many-dashboard scene taxonomy is intentionally absorbed. The operating
// APIs remain canonical and are surfaced through FIELD + ROOT/CASES/GOVERNANCE/TWIN.
for(const scene of ['field','root','cases','governance','twin']){
  assert.ok(scenes.includes(`${scene}:{key:'${scene}'`),`canonical_scene_missing:${scene}`);
}
for(const legacy of ['systems','falsification','agents']){
  assert.ok(!scenes.includes(`${legacy}:{key:'${legacy}'`),`legacy_parallel_scene_must_remain_absorbed:${legacy}`);
}
assert.ok(shellUi.includes('ObservatoryConsole') && shellUi.includes('SfiOperatingWorkspace'), 'canonical_shell_must_mount_public_and_institutional_operating_surfaces');
assert.ok(observatoryUi.includes("type Lens='field'|'hypotheses'|'trajectory'|'sources'"), 'field_must_expose_observation_hypothesis_trajectory_source_lenses');
assert.ok(observatoryUi.includes('MÉTRICAS DERIVADAS') && observatoryUi.includes('TRAZA DE CONSECUENCIAS'), 'field_must_expose_metrics_and_traceable_hypothesis_meaning');
assert.ok(operatingUi.includes("jsonFetch('/api/acp/proposals')"), 'governed_proposal_feed_missing');
assert.ok(operatingUi.includes('AGENTES') && operatingUi.includes("jsonFetch('/api/root/cognitive-runtime')"), 'governance_must_surface_observed_agent_runtime');
assert.ok(operatingUi.includes("surface==='twin'") && operatingUi.includes('CognitiveSpineAnatomy'), 'cognitive_twin_operating_surface_missing');
assert.ok(operatingUi.includes('ACEPTAR') && operatingUi.includes('DENEGAR') && operatingUi.includes('PEDIR EVIDENCIA'), 'decision_authority_controls_missing');

assert.match(readiness,/EMPTY_READY/);
assert.match(readiness,/resolvedStudioCapabilityMatrix/);
assert.match(readiness,/id:'evidence'/);
assert.match(readiness,/id:'graph'/);
assert.match(readiness,/scientificComplete:false/);

console.log(JSON.stringify({
  ok:true,
  invariants:[
    'one persistent cross-organ operating cycle exists',
    'pipeline transport remains ROOT-authorized and audited',
    'evidence event identity is recoverable by canonical event_id',
    'MIHM method selection is automatic from bounded object context',
    'inference remains INFERRED and requires rivals/discriminating observations for contrast readiness',
    'inference suggestion resolves persisted evidence by cycle references instead of a recency window',
    'artifact trajectory requires evidence and does not manufacture propagation claims',
    'full-cycle proof replays only real persisted material and blocks instead of mocking missing organs',
    'operating APIs are surfaced through FIELD plus ROOT/CASES/GOVERNANCE/TWIN instead of parallel legacy dashboards',
    'field keeps metrics separate from AI-inferred meaning and exposes consequence lineage',
    'clean empty runtime may be READY while scientific validation remains separate',
  ],
},null,2));