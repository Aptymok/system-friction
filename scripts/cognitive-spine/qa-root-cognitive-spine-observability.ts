import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root=process.cwd();const read=(relative:string)=>readFileSync(path.join(root,relative),'utf8');
const reader=read('src/lib/root/cognitiveSpineStatus.ts');
const route=read('src/app/api/root/cognitive-spine/status/route.ts');
const anatomy=read('src/components/root/cognitive-spine/CognitiveSpineAnatomy.tsx');
const shared=read('src/components/sfi/CognitiveSpinePark.tsx');
const sharedCss=read('src/components/sfi/CognitiveSpinePark.css');
const workboard=read('src/components/sfi/RootOperationalWorkboard.tsx');
const operationRoute=read('src/app/api/root/operational/trigger-observation/route.ts');
const pipeline=read('src/components/sfi/PipelineConsole.tsx');

assert(reader.includes('ROOT_GOVERNANCE_CONTEXT_PROFILE'));assert(reader.includes('consume: false'));assert(reader.includes('internalRefsExposed: false'));assert(reader.includes('verificationDebt: state.verificationDebt.absolute'));assert(!reader.includes('evidenceRefs: state.evidenceRefs'));assert(!reader.includes('.insert('));assert(!reader.includes('.update('));
assert(route.includes("requireRootViewer('root.cognitive-spine.status')"));assert(route.includes("'Cache-Control': 'no-store'"));
assert(workboard.includes("@/components/root/cognitive-spine/CognitiveSpineAnatomy"));assert(workboard.includes('canOperate={canOperate}'));assert(workboard.includes("data?.authority === 'root'"));
assert(anatomy.includes("@/components/sfi/CognitiveSpinePark"),'ROOT must use shared park renderer');
assert(pipeline.includes("from './CognitiveSpinePark'"),'PIPELINE must use shared park renderer');
assert(anatomy.includes("fetch('/api/root/cognitive-spine/status'"));assert(anatomy.includes("fetch('/api/root/cognitive-runtime'"));assert(anatomy.includes("fetch('/api/logbook/visible?role=root'"));assert(anatomy.includes('/api/root/operational/trigger-observation?job='));
assert(operationRoute.includes("requireRootActor('root.operational.observe')"));
assert(!pipeline.includes('/api/root/'),'tenant park must not consume ROOT contracts');
assert(!anatomy.includes('createServiceSupabaseClient'));assert(!shared.includes('createServiceSupabaseClient'));assert(!shared.includes('/api/'),'shared visual renderer must own no backend reads/writes');
assert(!anatomy.includes('/api/root/governance/promote'),'park must not promote canon');
assert(anatomy.includes('SFI_AGENT_EXECUTED'),'ROOT live glow must derive from observed execution');
assert(shared.includes('OBSERVED OBJECT · NEVER LOST'));assert(shared.includes('AMBIENT MOTION ≠ ACTIVITY'));assert(shared.includes('LIVE = OBSERVED EVENT ONLY'));
assert(sharedCss.includes('@media(prefers-reduced-motion:reduce)'));
for(const asset of ['public/cognitive-spine/park-desktop.avif','public/cognitive-spine/park-tablet.avif','public/cognitive-spine/park-mobile.avif']){const absolute=path.join(root,asset);assert(existsSync(absolute),`spine_park_asset_missing:${asset}`);assert(statSync(absolute).size>20_000,`spine_park_asset_unexpectedly_small:${asset}`);}
assert(shared.includes('/cognitive-spine/park-desktop.avif'));assert(shared.includes('/cognitive-spine/park-tablet.avif'));assert(shared.includes('/cognitive-spine/park-mobile.avif'));assert(shared.includes('<picture className="sfiParkArt"'));
for(const zone of ['observer','memory','affective','signal','fragment','core','return'])assert(anatomy.includes(`'${zone}'`),`root_spine_zone_missing:${zone}`);
console.log(JSON.stringify({ok:true,statusContract:'SFI-ROOT-CT-STATUS-1.3',sharedRenderer:true,rootOnlyOperations:true,tenantRootLeak:false,rawDb:false,hardcodedActivity:false,canonPromotionControl:false},null,2));
