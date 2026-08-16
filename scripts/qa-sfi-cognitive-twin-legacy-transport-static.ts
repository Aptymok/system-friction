import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const exists=(file:string)=>fs.existsSync(path.join(root,file));
const bridge=read('src/lib/cognitive-twin/legacyCapabilityBridge.ts');

const requiredIds=[
  'episodic_memory_engine','timeline_builder','meta_observer','policy_engine','observer_feedback_loop',
  'identity_state_engine','operating_mode_distribution','causal_trace','governed_mutation','external_observation_field',
];
for(const id of requiredIds){
  assert.ok(bridge.includes(`id:'${id}'`),`legacy_capability_manifest_missing:${id}`);
}
assert.doesNotMatch(bridge,/status:'MISSING'/,'retained_legacy_capability_marked_missing');
for(const fn of ['buildCognitiveTwinTimeline','deriveOperatingModeDistribution','buildCognitiveTwinMetaObservation','buildCognitiveTwinCausalTrace','recordCognitiveTwinFeedback','readCognitiveTwinAncestralState']){
  assert.ok(bridge.includes(`function ${fn}`),`legacy_bridge_missing_function:${fn}`);
}
for(const invariant of ['EVIDENCE_BEFORE_INFERENCE','SIMULATION_IS_NOT_OBSERVATION','MEMORY_IS_NOT_AUTHORITY','LEARNING_DOES_NOT_EXPAND_AUTHORITY','MISSING_REMAINS_MISSING','LINEAGE_IS_PROVENANCE_NOT_INDIVIDUATION'])assert.ok(bridge.includes(invariant),`legacy_bridge_missing_invariant:${invariant}`);
for(const action of ['apply_subject_mutation','publish','mutate_canon','change_formula','grant_root_access','transfer_ip','execute_irreversible'])assert.ok(bridge.includes(`'${action}'`),`legacy_bridge_missing_reserved_action:${action}`);
assert.match(bridge,/epistemicClass:'OBSERVED_RETURN'/);
assert.match(bridge,/CognitiveTwinLineageHealth/);
assert.match(bridge,/readInstitutionalReadiness/);
assert.match(bridge,/recordCognitiveTwinExperience/);
assert.match(bridge,/Software-complete legacy transport/);

for(const file of [
  'src/lib/cognitive-twin/experienceBridge.ts',
  'src/lib/cognitive-twin/integratedInstitutionalCycle.ts',
  'src/lib/cognitive-twin/reentry/runtime.ts',
  'src/lib/cognitive-twin/reentry/mutationState.ts',
  'src/lib/root/closure/readInstitutionalReadiness.ts',
  'src/app/api/root/cognitive-twin-state/route.ts',
  'src/app/root/cognitive-twin/page.tsx',
  'src/app/root/cognitive-twin/system.module.css',
])assert.ok(exists(file),`legacy_transport_support_file_missing:${file}`);

const systemPage=read('src/app/root/cognitive-twin/page.tsx');
for(const phrase of ['Memoria longitudinal de SFI','ARQUITECTURA RECUPERADA','METAOBSERVADOR','TIMELINE INSTITUCIONAL','no es un LLM'])assert.ok(systemPage.includes(phrase),`visual_twin_system_missing:${phrase}`);

console.log(JSON.stringify({
  ok:true,
  retainedCapabilities:requiredIds.length,
  missing:[],
  verification:'STATIC_ARCHITECTURE_AND_BOUNDARY_CHECK',
  boundary:'This QA verifies present code representation of the retained legacy capability set without executing server-only runtime. Production behavior still requires runtime verification.',
},null,2));
