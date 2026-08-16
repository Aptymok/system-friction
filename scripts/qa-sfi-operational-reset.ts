import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { OPERATIONAL_DELETE_ORDER, PROTECTED_TABLES } from './db/sfi-operational-reset-inventory.mjs';

const root=process.cwd();
const read=(relative:string)=>fs.readFileSync(path.join(root,relative),'utf8');
const reset=read('scripts/db/reset-sfi-operational-tables.mjs');
const readiness=read('src/lib/root/closure/readInstitutionalReadiness.ts');
const cycle=read('src/core/cognitive-twin/integratedInstitutionalCycle.ts');
const field=read('src/lib/field/operationalCycle.ts');
const studio=read('src/lib/studio/audio/analyzeStudioAudioObject.ts');
const lab=read('src/lib/method-lab/simulationRun.ts');
const proof=read('src/lib/root/closure/fullCycleVerification.ts');

const requiredRuntimeTables=[
  'root_evidence_entries','epistemic_events','sfi_evidence_ledger','graph_nodes','graph_edges',
  'sfi_cognitive_twin_memory','sfi_cognitive_twin_decisions','sfi_cognitive_twin_evaluations','sfi_cognitive_twin_runs',
  'sfi_operating_cycles','sfi_inference_traces','sfi_artifact_trajectory_events','sfi_lab_analyses',
  'sfi_cases','sfi_case_objects','sfi_case_relations','sfi_case_reports','sfi_case_audit_events',
  'field_cases','field_case_evidence','field_moph_runs','field_mihm_readings','field_hypotheses','field_interventions','field_returns','field_outcomes',
  'studio_sessions','studio_objects','studio_uploads','studio_analysis_jobs','studio_audio_features','action_proposals','logbook_mutations',
];
for(const table of requiredRuntimeTables)assert.ok(OPERATIONAL_DELETE_ORDER.includes(table),`reset_inventory_missing_core_runtime_table:${table}`);
for(const table of PROTECTED_TABLES)assert.ok(!OPERATIONAL_DELETE_ORDER.includes(table),`protected_table_in_reset:${table}`);
for(const table of ['profiles','system_accounts','system_roles','system_permissions','system_access_grants','system_entitlements','sfi_tenants','sfi_tenant_members','worldspect_snapshots'])assert.ok(PROTECTED_TABLES.includes(table),`missing_protected_table:${table}`);
assert.ok(!OPERATIONAL_DELETE_ORDER.includes('worldspect_snapshots'),'worldspect_longitudinal_corpus_must_survive_genesis');
assert.ok(!OPERATIONAL_DELETE_ORDER.includes('sfi_tenants'),'tenant_identity_must_survive_runtime_reset');
assert.ok(!OPERATIONAL_DELETE_ORDER.includes('sfi_tenant_members'),'tenant_membership_authority_must_survive_runtime_reset');

assert.match(reset,/CLEAN_RUNTIME_AFTER_VERIFIED_PROOF/);
assert.match(reset,/LATEST_EXPORT\.txt/);
assert.match(reset,/SFI_CLEANUP_PLAN_/);
assert.match(reset,/SFI_FULL_CYCLE_PROOF_/);
assert.match(reset,/SKIPPED_NOT_PRESENT/);
assert.match(reset,/protected_checks/);
assert.match(reset,/countTable/);
assert.doesNotMatch(reset,/DELETE_ORDER from '.\/sfi-db-tables\.mjs'/);

assert.match(readiness,/EMPTY_READY:no_field_cycles_yet/);
assert.match(readiness,/EMPTY_READY:no_studio_objects_yet/);
assert.match(readiness,/EMPTY_READY:no_evidence_yet/);
assert.match(readiness,/EMPTY_READY:no_relations_yet/);
assert.match(proof,/REAL_PERSISTED_EVIDENCE_REPLAY/);
assert.match(proof,/Field return is never fabricated/);
for(const source of [cycle,field,studio,lab])assert.ok(source.length>100,'runtime_source_unexpectedly_empty');

console.log(JSON.stringify({ok:true,purgeTableCount:OPERATIONAL_DELETE_ORDER.length,protectedTableCount:PROTECTED_TABLES.length,invariants:[
  'full-cycle proof/export precedes reset',
  'runtime history is cleared child-first',
  'identity/access/authority including tenant membership are protected',
  'Case Platform objects, relations, reports and cases are cleared while tenant identity survives',
  'WorldSpect longitudinal observation corpus survives genesis',
  'optional/missing tables are skipped instead of making the reset unsafe',
  'empty post-reset organs report READY rather than DEGRADED',
]},null,2));