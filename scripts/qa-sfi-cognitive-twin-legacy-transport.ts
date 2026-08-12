import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  COGNITIVE_TWIN_LEGACY_CAPABILITY_MANIFEST,
  COGNITIVE_TWIN_POLICY,
  COGNITIVE_TWIN_LEGACY_BRIDGE_VERSION,
} from '../src/core/cognitive-twin/legacyCapabilityBridge';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const exists=(file:string)=>fs.existsSync(path.join(root,file));

const requiredIds=[
  'episodic_memory_engine','timeline_builder','meta_observer','policy_engine','observer_feedback_loop',
  'identity_state_engine','operating_mode_distribution','causal_trace','governed_mutation','external_observation_field',
];
assert.equal(COGNITIVE_TWIN_LEGACY_BRIDGE_VERSION,'SFI-CT-LEGACY-BRIDGE-1.0');
assert.deepEqual(new Set(COGNITIVE_TWIN_LEGACY_CAPABILITY_MANIFEST.map(item=>item.id)),new Set(requiredIds),'legacy_capability_manifest_changed_without_review');
assert.deepEqual(COGNITIVE_TWIN_LEGACY_CAPABILITY_MANIFEST.filter(item=>item.status==='MISSING').map(item=>item.id),[],'retained_legacy_capability_missing');

for(const capability of COGNITIVE_TWIN_LEGACY_CAPABILITY_MANIFEST){
  assert.ok(capability.currentImplementation.length,`legacy_capability_without_current_implementation:${capability.id}`);
  assert.ok(capability.boundary.trim(),`legacy_capability_without_boundary:${capability.id}`);
}

for(const action of ['observe','extract','calculate','draft','simulate','propose','persist_memory','propose_subject_mutation'])assert.ok(COGNITIVE_TWIN_POLICY.autonomous.includes(action as never),`missing_autonomous_policy:${action}`);
for(const action of ['apply_subject_mutation','publish','mutate_canon','change_formula','grant_root_access','transfer_ip','execute_irreversible'])assert.ok(COGNITIVE_TWIN_POLICY.founderReserved.includes(action as never),`missing_reserved_policy:${action}`);

const bridge=read('src/lib/cognitive-twin/legacyCapabilityBridge.ts');
for(const fn of ['buildCognitiveTwinTimeline','deriveOperatingModeDistribution','buildCognitiveTwinMetaObservation','buildCognitiveTwinCausalTrace','recordCognitiveTwinFeedback','readLegacyCognitiveTwinState'])assert.ok(bridge.includes(`function ${fn}`)||bridge.includes(`async function ${fn}`)||bridge.includes(`export async function ${fn}`),`legacy_bridge_missing_function:${fn}`);
assert.match(bridge,/epistemicClass:'OBSERVED_RETURN'/);
assert.match(bridge,/MEMORY_IS_NOT_AUTHORITY/);
assert.match(bridge,/LINEAGE_IS_PROVENANCE_NOT_INDIVIDUATION/);
assert.match(bridge,/Software-complete legacy transport/);
assert.doesNotMatch(bridge,/chain.of.thought/i);

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
  bridgeVersion:COGNITIVE_TWIN_LEGACY_BRIDGE_VERSION,
  retainedCapabilities:requiredIds.length,
  missing:[],
  policy:{autonomous:COGNITIVE_TWIN_POLICY.autonomous.length,founderReserved:COGNITIVE_TWIN_POLICY.founderReserved.length},
  boundary:'This QA proves present executable representation of the retained legacy capability set. It does not claim byte-for-byte preservation of historical source code, artificial individuation, autonomy or scientific validity.',
},null,2));
