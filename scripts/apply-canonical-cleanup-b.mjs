import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT=process.cwd();
const abs=p=>path.join(ROOT,p);
const exists=p=>fs.existsSync(abs(p));
const read=p=>fs.readFileSync(abs(p),'utf8');
const write=(p,c)=>{fs.mkdirSync(path.dirname(abs(p)),{recursive:true});fs.writeFileSync(abs(p),c)};
const rm=p=>{if(exists(p))execFileSync('git',['rm','-r','--',p],{stdio:'inherit'})};
const all=[];
function walk(dir){if(!exists(dir))return;for(const e of fs.readdirSync(abs(dir),{withFileTypes:true})){const p=path.join(dir,e.name).replaceAll('\\','/');if(e.isDirectory())walk(p);else if(/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name))all.push(p)}}
walk('src');walk('scripts');
function replaceEverywhere(a,b){for(const p of all){if(!exists(p))continue;let s=read(p);if(s.includes(a)){s=s.replaceAll(a,b);write(p,s)}}}
function move(oldPath,newPath,transform=(s)=>s){if(!exists(oldPath))return;write(newPath,transform(read(oldPath)));replaceEverywhere(oldPath.replace(/^src\//,'@/').replace(/\.ts$/,''),newPath.replace(/^src\//,'@/').replace(/\.ts$/,''));rm(oldPath)}

// CT historical capability reading is a canonical CT reader, not a compatibility bridge.
move('src/core/cognitive-twin/legacyCapabilityBridge.ts','src/core/cognitive-twin/ancestralCapabilityReader.ts');

// Collapse two contract-only AMV bridge files into one explicit context-availability contract.
const mihm=exists('src/lib/amv/core/mihmBridge.ts')?read('src/lib/amv/core/mihmBridge.ts'):'';
const ws=exists('src/lib/amv/core/worldspectBridge.ts')?read('src/lib/amv/core/worldspectBridge.ts'):'';
if(mihm||ws){
  write('src/lib/amv/core/contextAvailability.ts',`${mihm}\n\n${ws}`);
  replaceEverywhere('@/lib/amv/core/mihmBridge','@/lib/amv/core/contextAvailability');
  replaceEverywhere('@/lib/amv/core/worldspectBridge','@/lib/amv/core/contextAvailability');
  rm('src/lib/amv/core/mihmBridge.ts');rm('src/lib/amv/core/worldspectBridge.ts');
}

// Python is an infrastructure boundary, never an AMV/ScoreFriction core bridge.
move('src/lib/amv/core/pythonBridgeAdapter.ts','src/infrastructure/python/amvRuntimeContract.ts');
move('src/lib/amv/core/pythonBridgeContract.ts','src/infrastructure/python/amvCognitiveContract.ts',s=>s
  .replaceAll("from './evidenceTypes'","from '@/lib/amv/core/evidenceTypes'")
  .replaceAll("from './focusVariableTypes'","from '@/lib/amv/core/focusVariableTypes'")
  .replaceAll("from './observableObjectTypes'","from '@/lib/amv/core/observableObjectTypes'")
  .replaceAll("from './observationModes'","from '@/lib/amv/core/observationModes'"));
move('src/lib/scorefriction/python/pythonBridge.ts','src/infrastructure/python/scorefrictionClient.ts');

// PPOI owns the transformation; no bridge layer remains.
move('src/lib/ppoi/phenomenonBridge.ts','src/lib/ppoi/phenomenonProjection.ts');

// Provider invocation belongs to AI infrastructure.
move('src/lib/sfi/cognitive-runtime/agentLlmBridge.ts','src/infrastructure/ai/agentLlmClient.ts');

// Runtime persistence belongs to event infrastructure; AMV publication belongs to AMV core.
move('src/lib/sfi/cognitive-runtime/runtimeEventBridge.ts','src/infrastructure/events/cognitiveRuntimeEventRepository.ts');
move('src/lib/sfi/cognitive-runtime/amvRuntimeBridge.ts','src/lib/amv/core/runtimePublisher.ts',s=>s
  .replaceAll("from './amvReading'","from '@/lib/sfi/cognitive-runtime/amvReading'")
  .replaceAll("from './PhenomenonRelay'","from '@/lib/sfi/cognitive-runtime/PhenomenonRelay'"));

console.log('Canonical cleanup batch B applied.');