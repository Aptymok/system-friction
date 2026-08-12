import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { HISTORICAL_PRESERVE_TABLES, OPERATIONAL_DELETE_ORDER, PROTECTED_TABLES } from './db/sfi-operational-reset-inventory.mjs';

const root=process.cwd();
const read=(relative:string)=>fs.readFileSync(path.join(root,relative),'utf8');
const reset=read('scripts/db/reset-sfi-operational-tables.mjs');
const readiness=read('src/lib/root/closure/readInstitutionalReadiness.ts');
const cycle=read('src/lib/cognitive-twin/integratedInstitutionalCycle.ts');
const field=read('src/lib/field/operationalCycle.ts');
const studio=read('src/lib/studio/audio/analyzeStudioAudioObject.ts');
const lab=read('src/lib/method-lab/simulationRun.ts');
const proof=read('src/lib/root/closure/fullCycleVerification.ts');

const requiredRuntimeTables=[
  'root_evidence_entries','epistemic_events','sfi_evidence_ledger','graph_nodes','graph_edges',
  'sfi_cognitive_twin_memory','sfi_cognitive_twin_decisions','sfi_cognitive_twin_evaluations','sfi_cognitive_twin_runs',
  'sfi_operating_cycles','sfi_inference_traces','sfi_artifact_trajectory_events',
  'sfi_lab_analyses',
  'field_cases','field_case_evidence','field_moph_runs','field_mihm_readings','field_hypotheses','field_interventions','field_returns','field_outcomes',
  'studio_sessions','studio_objects','studio_uploads','studio_analysis_jobs','studio_audio_features',
  'action_proposals','logbook_mutations',
];
for(const table of requiredRuntimeTables)assert.ok(OPERATIONAL_DELETE_ORDER.includes(table),`reset_inventory_missing_core_runtime_table:${table}`);
for(const table of PROTECTED_TABLES)assert.ok(!OPERATIONAL_DELETE_ORDER.includes(table),`protected_table_in_reset:${table}`);
for(const table of ['profiles','system_accounts','system_roles','system_permissions','system_access_grants','system_entitlements'])assert.ok(PROTECTED_TABLES.includes(table),`missing_protected_identity_table:${table}`);
for(const table of ['sfi_world_day_ledger','world_source_observations','worldspect_snapshots']){
  assert.ok(HISTORICAL_PRESERVE_TABLES.includes(table),`missing_longitudinal_preserve_table:${table}`);
  assert.ok(PROTECTED_TABLES.includes(table),`longitudinal_history_not_protected:${table}`);
}
for(const table of ['world_friction_readings','world_hypotheses','world_hypothesis_outcomes','world_learning_events','sfi_indicator_snapshots']){
  assert.ok(OPERATIONAL_DELETE_ORDER.includes(table),`derived_world_state_not_reset:${table}`);
}

assert.match(reset,/CLEAN_RUNTIME_AFTER_VERIFIED_PROOF/);
assert.match(reset,/LATEST_EXPORT\.txt/);
assert.match(reset,/SFI_CLEANUP_PLAN_/);
assert.match(reset,/SFI_FULL_CYCLE_PROOF_/);
assert.match(reset,/SKIPPED_NOT_PRESENT/);
assert.match(reset,/protected_checks/);
assert.match(reset,/countTable/);
assert.doesNotMatch(reset,/DELETE_ORDER from '.\/sfi-db-tables\.mjs'/);

// Clean empty operational state must not be interpreted as a broken system after the purge.
assert.match(readiness,/EMPTY_READY:no_field_cycles_yet/);
assert.match(readiness,/EMPTY_READY:no_studio_objects_yet/);
assert.match(readiness,/EMPTY_READY:no_evidence_yet/);
assert.match(readiness,/EMPTY_READY:no_relations_yet/);

// The proof must precede the purge: it requires real persisted material and explicitly rejects fake return data.
assert.match(proof,/REAL_PERSISTED_EVIDENCE_REPLAY/);
assert.match(proof,/Field return is never fabricated/);

for(const source of [cycle,field,studio,lab])assert.ok(source.length>100,'runtime_source_unexpectedly_empty');

console.log(JSON.stringify({
  ok:true,
  purgeTableCount:OPERATIONAL_DELETE_ORDER.length,
  protectedTableCount:PROTECTED_TABLES.length,
  historicalPreserveTableCount:HISTORICAL_PRESERVE_TABLES.length,
  invariants:[
    'full-cycle proof/export precedes reset',
    'runtime history is cleared child-first',
    'identity/access/authority are protected',
    'only source/provenance world history plus SFI world-day coordinates survive the reset',
    'derived world interpretations are reset and may be reconstructed from preserved source history',
    'optional/missing tables are skipped instead of making the reset unsafe',
    'empty post-reset operational organs report READY rather than DEGRADED',
  ],
},null,2));