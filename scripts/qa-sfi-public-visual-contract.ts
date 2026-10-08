import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p:string)=>fs.readFileSync(path.join(root,p),'utf8');
const checks:Array<[string,boolean]>=[];
const check=(name:string,ok:boolean)=>checks.push([name,ok]);

const chrome=read('src/components/public/SfiPublicChrome.tsx');
const chromeCss=read('src/components/public/SfiPublicChrome.css');
const landing=read('src/components/sfi/PublicEntryGateway.tsx');
const landingCss=read('src/components/sfi/PublicEntryGateway.css');
const manifest=read('src/components/sfi/publicSceneManifest.ts');

check('canonical SFI mark is shared and never redrawn',
  chrome.includes('/library/assets/sfi-mark.svg')
  && !chrome.includes('sfi-institutional-seal.png')
  && chromeCss.includes('object-fit:contain'));

check('institutional screen palette is canonical',
  chromeCss.includes('#060605')
  && chromeCss.includes('#C8A951')
  && chromeCss.includes('#E8DDC3'));

for(const label of ['ROOT','OBSERVATORY','REALITY CHAIN','METHOD LAB','WORLD VECTOR','REPOSITORY','TIMELINE','ACCESS']){
  check(`fixed canonical menu exposes ${label}`,chrome.includes(`label:'${label}'`));
}
check('menu is physically fixed',chromeCss.includes('position:fixed!important')&&chromeCss.includes('.sfiPublicPageNav'));

check('fixed footer is the global timeline',
  chrome.includes('SFI / GLOBAL TIMELINE')
  && chrome.includes('NOTHING ACTS ALONE. REALITY ANSWERS BACK.')
  && chrome.includes("['2023','2024','2025','2026','2027','2028','2029']")
  && chromeCss.includes('.sfiGlobalTimeline')
  && chromeCss.includes('position:fixed!important'));

check('public landing is horizontal only',
  landingCss.includes('touch-action:pan-x')
  && landingCss.includes('translate3d(calc(var(--scene-offset) * 100%),0,0)')
  && landing.includes("event.key==='ArrowRight'")
  && landing.includes("event.key==='ArrowLeft'")
  && !landing.includes('CHANGE SURFACE'));

check('home/index declares canonical institution and slogan',
  landing.includes('SFI | SYSTEM FRICTION INSTITUTE')
  && landing.includes('NOTHING ACTS ALONE.')
  && landing.includes('REALITY ANSWERS BACK.'));

check('home/index exposes all eight operational instruments',
  landing.includes('SURFACE_RAIL')
  && landing.includes("sceneId:'root'")
  && landing.includes("sceneId:'observatory'")
  && landing.includes("sceneId:'reality-chain'")
  && landing.includes("sceneId:'method-lab'")
  && landing.includes("sceneId:'world-vector'")
  && landing.includes("sceneId:'repository'")
  && landing.includes("sceneId:'timeline'")
  && landing.includes("sceneId:'access'"));

check('operational surfaces expose selected reading and result dock',
  landing.includes('sfiOperationalPanorama')
  && landing.includes('sfiInstrumentTabs')
  && landing.includes('sfiOperationalModules')
  && landing.includes('sfiResultDock')
  && landingCss.includes('.sfiResultDock'));

check('ROOT public preview preserves dense field grammar',
  landing.includes('ROOT_FIELD_NODES')
  && landing.includes('sfiRootFieldPreview')
  && landing.includes('GOVERNANCE')
  && landing.includes('CASES & PROJECTS')
  && landing.includes('AUTHORITY BOUNDARY')
  && landing.includes('EXTERNAL REALITY'));

check('landing visual stage remains shared and parallax-capable',
  landing.includes('sfiVisualStage')
  && landing.includes('sceneBackground=scene.background')
  && landing.includes('sceneAssets=scene.assets')
  && landing.includes('handlePointerMove')
  && landing.includes('sfiSceneParallaxLayer')
  && landingCss.includes('.sfiSceneParallaxLayer'));

check('public visual stack has no baked human asset role',
  !manifest.includes("role:'human'")
  && !manifest.includes('observer.png')
  && !manifest.includes('people.png'));

const canonicalSurfaces=['root','observatory','reality-chain','method-lab','world-vector','repository','timeline','access'];
for(const surface of canonicalSurfaces){
  check(`canonical public surface declared: ${surface}`,manifest.includes(`id:'${surface}'`));
}
for(const surface of ['ROOT','OBSERVATORY','REALITY_CHAIN','METHOD_LAB','WORLD_VECTOR','REPOSITORY','TIMELINE']){
  const asset=`SFI_${surface}_HERO_LAYER.png`;
  check(`approved hero declared and present: ${surface}`,manifest.includes(asset)&&fs.existsSync(`public/assets/sfi/instruments/${asset}`));
}
for(const icon of ['GOVERNANCE','CASES_PROJECTS','ATTRACTOR','AUTHORITY_BOUNDARY']){
  const asset=`SFI_ROOT_ICON_${icon}.png`;
  check(`ROOT foreground declared and present: ${icon}`,manifest.includes(asset)&&fs.existsSync(`public/assets/sfi/instruments/${asset}`));
}

const capabilityTokens=[
  'SOURCE HEALTH / FRESHNESS','SIGNALS','OBSERVATIONS','RECENT CHANGES','DEGRADED STATES',
  'EXPERIMENTS','COUNTERFACTUALS','PROVIDER / MODEL','PARAMETERS','HASHES','RESULTS',
  'VERSIONS','LINEAGE','MANIFESTS','DEPLOYMENTS','TEMPORAL RELATIONS','JR LOGBOOK','MATERIAL ACTIONS'
];
for(const token of capabilityTokens)check(`operational capability visible: ${token}`,manifest.includes(`label:'${token}'`));

const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks)console.log(`${ok?'PASS':'FAIL'} · ${name}`);
if(failed.length)process.exit(1);

import { SCENES } from '../src/components/sfi/publicSceneManifest';
const surfaces=['root','observatory','reality-chain','method-lab','world-vector','repository','timeline','access'];
const reality=['REAL WORLD','SIGNAL','OBSERVATION','EVIDENCE','INFERENCE','AUTHORITY','EXECUTION','RETURN'];
const assert=(ok:boolean,message:string)=>{if(!ok)throw new Error(message);};

assert(JSON.stringify(SCENES.slice(1).map(scene=>scene.id))===JSON.stringify(surfaces),'surface sequence drift');
assert(JSON.stringify(SCENES.find(scene=>scene.id==='reality-chain')?.frames.map(frame=>frame.label))===JSON.stringify(reality),'Reality Chain sequence drift');
assert(SCENES.find(scene=>scene.id==='root')?.tiles?.length===4,'ROOT foreground missing');
assert(SCENES.find(scene=>scene.id==='observatory')?.frames.some(frame=>frame.label==='DEGRADED STATES')===true,'Observatory degraded state missing');
assert(SCENES.find(scene=>scene.id==='method-lab')?.frames.some(frame=>frame.label==='RESULTS')===true,'Method Lab results missing');
assert(SCENES.find(scene=>scene.id==='repository')?.frames.some(frame=>frame.label==='MANIFESTS')===true,'Repository manifests missing');
assert(SCENES.find(scene=>scene.id==='timeline')?.frames.some(frame=>frame.label==='DEPLOYMENTS')===true,'Timeline deployments missing');
assert(SCENES.find(scene=>scene.id==='access')?.frames.some(frame=>frame.label==='ACCESS LOG')===true,'Access log missing');
assert(landing.includes('inert={index!==sceneIndex}')&&landing.includes("matchMedia('(prefers-reduced-motion: reduce)')"),'focus isolation or reduced motion missing');
console.log('PASS · canonical horizontal operational SFI visual contract');
