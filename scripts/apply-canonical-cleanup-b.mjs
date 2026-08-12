import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT=process.cwd();
const abs=p=>path.join(ROOT,p);
const exists=p=>fs.existsSync(abs(p));
const read=p=>fs.readFileSync(abs(p),'utf8');
const write=(p,c)=>{fs.mkdirSync(path.dirname(abs(p)),{recursive:true});fs.writeFileSync(abs(p),c)};
const rm=p=>{if(exists(p))execFileSync('git',['rm','-r','-f','--',p],{stdio:'inherit'})};
const all=[];
function walk(dir){if(!exists(dir))return;for(const e of fs.readdirSync(abs(dir),{withFileTypes:true})){const p=path.join(dir,e.name).replaceAll('\\','/');if(e.isDirectory())walk(p);else if(/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name))all.push(p)}}
walk('src');walk('scripts');
function refreshAll(){all.length=0;walk('src');walk('scripts')}
function replaceEverywhere(a,b){refreshAll();for(const p of all){if(!exists(p))continue;let s=read(p);if(s.includes(a)){s=s.replaceAll(a,b);write(p,s)}}}
function move(oldPath,newPath,transform=(s)=>s){if(!exists(oldPath))return;write(newPath,transform(read(oldPath)));replaceEverywhere(oldPath.replace(/^src\//,'@/').replace(/\.ts$/,''),newPath.replace(/^src\//,'@/').replace(/\.ts$/,''));rm(oldPath)}

move('src/core/cognitive-twin/legacyCapabilityBridge.ts','src/core/cognitive-twin/ancestralCapabilities.ts',s=>s
  .replaceAll('COGNITIVE_TWIN_LEGACY_BRIDGE_VERSION','COGNITIVE_TWIN_ANCESTRAL_CAPABILITIES_VERSION')
  .replaceAll('SFI-CT-LEGACY-BRIDGE-1.0','SFI-CT-ANCESTRAL-CAPABILITIES-1.0')
  .replaceAll('COGNITIVE_TWIN_LEGACY_CAPABILITY_MANIFEST','COGNITIVE_TWIN_ANCESTRAL_CAPABILITY_MANIFEST')
  .replaceAll('CognitiveTwinLegacyCapabilityId','CognitiveTwinAncestralCapabilityId')
  .replaceAll('CognitiveTwinLegacyCapabilityStatus','CognitiveTwinAncestralCapabilityStatus')
  .replaceAll('readLegacyCognitiveTwinState','readCognitiveTwinAncestralState')
  .replaceAll('legacy function','ancestral function')
  .replaceAll('legacy transport','ancestral capability integration')
  .replaceAll('Legacy','Ancestral')
  .replaceAll('legacy','ancestral')
  .replaceAll('bridgeVersion:COGNITIVE_TWIN_ANCESTRAL_CAPABILITIES_VERSION','capabilityVersion:COGNITIVE_TWIN_ANCESTRAL_CAPABILITIES_VERSION'));
replaceEverywhere('COGNITIVE_TWIN_LEGACY_BRIDGE_VERSION','COGNITIVE_TWIN_ANCESTRAL_CAPABILITIES_VERSION');
replaceEverywhere('COGNITIVE_TWIN_LEGACY_CAPABILITY_MANIFEST','COGNITIVE_TWIN_ANCESTRAL_CAPABILITY_MANIFEST');
replaceEverywhere('CognitiveTwinLegacyCapabilityId','CognitiveTwinAncestralCapabilityId');
replaceEverywhere('CognitiveTwinLegacyCapabilityStatus','CognitiveTwinAncestralCapabilityStatus');
replaceEverywhere('readLegacyCognitiveTwinState','readCognitiveTwinAncestralState');

if(exists('scripts/qa-sfi-cognitive-twin-legacy-transport.ts')){
  let qa=read('scripts/qa-sfi-cognitive-twin-legacy-transport.ts')
    .replaceAll('legacyCapabilityBridge','ancestralCapabilities')
    .replaceAll('COGNITIVE_TWIN_LEGACY_BRIDGE_VERSION','COGNITIVE_TWIN_ANCESTRAL_CAPABILITIES_VERSION')
    .replaceAll('COGNITIVE_TWIN_LEGACY_CAPABILITY_MANIFEST','COGNITIVE_TWIN_ANCESTRAL_CAPABILITY_MANIFEST')
    .replaceAll('SFI-CT-LEGACY-BRIDGE-1.0','SFI-CT-ANCESTRAL-CAPABILITIES-1.0')
    .replaceAll('readLegacyCognitiveTwinState','readCognitiveTwinAncestralState')
    .replaceAll('legacy_bridge_missing_function','ancestral_capability_missing_function')
    .replaceAll('legacy_capability','ancestral_capability')
    .replaceAll('legacy_transport','ancestral_integration')
    .replaceAll('legacy transport','ancestral capability integration')
    .replaceAll("const bridge=read('src/lib/cognitive-twin/ancestralCapabilities.ts');","const capabilitySource=read('src/core/cognitive-twin/ancestralCapabilities.ts');")
    .replaceAll('bridge.includes','capabilitySource.includes')
    .replaceAll('assert.match(bridge','assert.match(capabilitySource')
    .replaceAll('assert.doesNotMatch(bridge','assert.doesNotMatch(capabilitySource')
    .replaceAll("'src/lib/cognitive-twin/experienceBridge.ts'","'src/core/cognitive-twin/experienceBridge.ts'")
    .replaceAll("'src/lib/cognitive-twin/integratedInstitutionalCycle.ts'","'src/core/cognitive-twin/integratedInstitutionalCycle.ts'")
    .replaceAll("'src/lib/cognitive-twin/reentry/runtime.ts'","'src/core/cognitive-twin/reentry/runtime.ts'")
    .replaceAll("'src/lib/cognitive-twin/reentry/mutationState.ts'","'src/core/cognitive-twin/reentry/mutationState.ts'")
    .replaceAll('bridgeVersion:COGNITIVE_TWIN_ANCESTRAL_CAPABILITIES_VERSION','capabilityVersion:COGNITIVE_TWIN_ANCESTRAL_CAPABILITIES_VERSION');
  write('scripts/qa-sfi-cognitive-twin-ancestral-capabilities.ts',qa);
  rm('scripts/qa-sfi-cognitive-twin-legacy-transport.ts');
}

const mihm=exists('src/lib/amv/core/mihmBridge.ts')?read('src/lib/amv/core/mihmBridge.ts'):'';
const ws=exists('src/lib/amv/core/worldspectBridge.ts')?read('src/lib/amv/core/worldspectBridge.ts'):'';
if(mihm||ws){
  write('src/lib/amv/core/contextAvailability.ts',`${mihm}\n\n${ws}`.replaceAll('Bridge','Context').replaceAll('bridge','context').replaceAll('BRIDGE','CONTEXT'));
  replaceEverywhere('@/lib/amv/core/mihmBridge','@/lib/amv/core/contextAvailability');
  replaceEverywhere('@/lib/amv/core/worldspectBridge','@/lib/amv/core/contextAvailability');
  rm('src/lib/amv/core/mihmBridge.ts');rm('src/lib/amv/core/worldspectBridge.ts');
}

move('src/lib/amv/core/pythonBridgeAdapter.ts','src/infrastructure/python/amvRuntimeContract.ts',s=>s.replaceAll('Bridge','Runtime').replaceAll('bridge','runtime'));
move('src/lib/amv/core/pythonBridgeContract.ts','src/infrastructure/python/amvCognitiveContract.ts',s=>s
  .replaceAll("from './evidenceTypes'","from '@/lib/amv/core/evidenceTypes'")
  .replaceAll("from './focusVariableTypes'","from '@/lib/amv/core/focusVariableTypes'")
  .replaceAll("from './observableObjectTypes'","from '@/lib/amv/core/observableObjectTypes'")
  .replaceAll("from './observationModes'","from '@/lib/amv/core/observationModes'")
  .replaceAll('Bridge','Runtime').replaceAll('bridge','runtime'));
move('src/lib/scorefriction/python/pythonBridge.ts','src/infrastructure/python/scorefrictionClient.ts',s=>s.replaceAll('PythonBridge','PythonClient').replaceAll('python_bridge','python_client').replaceAll('Bridge','Client').replaceAll('bridge','client'));
move('src/lib/ppoi/phenomenonBridge.ts','src/lib/ppoi/phenomenonProjection.ts',s=>s.replaceAll('Bridge','Projection').replaceAll('bridge','projection'));
move('src/lib/sfi/cognitive-runtime/agentLlmBridge.ts','src/infrastructure/ai/agentLlmClient.ts',s=>s
  .replaceAll("from './convergedRegistry'","from '@/lib/sfi/cognitive-runtime/convergedRegistry'")
  .replaceAll("from './kernelContext'","from '@/lib/sfi/cognitive-runtime/kernelContext'")
  .replaceAll('Bridge','Client').replaceAll('bridge','client'));
move('src/lib/sfi/cognitive-runtime/runtimeEventBridge.ts','src/infrastructure/events/cognitiveRuntimeEventRepository.ts',s=>s
  .replaceAll('from "./eventBus"','from "@/lib/sfi/cognitive-runtime/eventBus"')
  .replaceAll('from "./eventPersistence"','from "@/lib/sfi/cognitive-runtime/eventPersistence"')
  .replaceAll("from './eventBus'","from '@/lib/sfi/cognitive-runtime/eventBus'")
  .replaceAll("from './eventPersistence'","from '@/lib/sfi/cognitive-runtime/eventPersistence'")
  .replaceAll('Bridge','Repository').replaceAll('bridge','repository'));
move('src/lib/sfi/cognitive-runtime/amvRuntimeBridge.ts','src/lib/amv/core/runtimePublisher.ts',s=>s
  .replaceAll("from './amvReading'","from '@/lib/sfi/cognitive-runtime/amvReading'")
  .replaceAll("from './PhenomenonRelay'","from '@/lib/sfi/cognitive-runtime/PhenomenonRelay'")
  .replaceAll('Bridge','Publisher').replaceAll('bridge','publisher'));

console.log('Canonical cleanup batch B applied.');
