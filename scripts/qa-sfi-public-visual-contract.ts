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
const observatory=read('src/components/sfi/ObservatoryConsole.tsx');
const observatoryCss=read('src/components/sfi/ObservatoryConsole.css');
const observatoryWorldCss=read('src/components/sfi/ObservatoryWorldLayer.css');
const manifest=read('src/components/sfi/publicSceneManifest.ts');

const pxSizes=(source:string)=>[...source.matchAll(/font(?:-size)?\\s*:\\s*(?:[^;{}]*?\\s)?([0-9]+(?:\\.[0-9]+)?)px/g)].map((match)=>Number(match[1]));
const belowReadableFloor=(source:string)=>pxSizes(source).filter((value)=>value<11);

check('canonical SFI mark is vector and shared with authenticated navigation',
  chrome.includes('/library/assets/sfi-mark.svg')
  && !chrome.includes('sfi-institutional-seal.png')
  && chromeCss.includes('object-fit:contain'));
check('Observatory respects public readability floor and chrome clearance',
  belowReadableFloor(observatoryCss).length===0
  && belowReadableFloor(observatoryWorldCss).length===0
  && !/fontSize\s*:\s*(?:[0-9]|10)(?:\D|$)/.test(observatory)
  && observatory.includes("bottom:102")
  && observatory.includes("top:92,bottom:112"));

check('public home/chrome typography respects 11px readability floor',
  belowReadableFloor(chromeCss).length===0
  && belowReadableFloor(landingCss).length===0);
check('institutional screen compensation palette is declared',
  chromeCss.includes('#060605')
  && chromeCss.includes('#C8A951')
  && chromeCss.includes('#E8DDC3'));

check('canonical institutional public header exists',
  chrome.includes('SfiPublicHeader')
  && chrome.includes('sfiPublicPageNav')
  && chrome.includes('sfiPublicMenuItem')
  && chrome.includes("timeZone:'UTC'")
  && chrome.includes('Institutional access'));
check('reference header exposes the canonical SFI instrument surfaces',
  chrome.includes("label:'TIMELINE'")
  && chrome.includes("label:'REPOSITORY'")
  && chrome.includes("label:'WORLD VECTOR'")
  && chrome.includes("label:'METHOD LAB'")
  && chrome.includes("label:'REALITY CHAIN'")
  && chrome.includes("label:'OBSERVATORY'")
  && chrome.includes("label:'ROOT'")
  && chrome.includes('NAV_SURFACES')
  && chrome.includes('context.statement')
  && chrome.includes('context.stage'));
check('canonical semantic footer exists',
  chrome.includes('SfiPublicFooter')
  && chrome.includes('sfiFooterChains')
  && chrome.includes('REALITY CHAIN METHOD')
  && chrome.includes('AI WEEK NYC 2026')
  && chrome.includes('https://gomry.com/l/Kzcb3xl'));
check('institutional chain is ordered',
  chrome.includes("['REAL WORLD','SIGNAL','OBSERVATION','EVIDENCE','INFERENCE','AUTHORITY','EXECUTION','RETURN','CONTRAST','LEARNING','MEMORY','ADAPTATION']"));
check('Reality Chain Method is canonical and ordered',
  chrome.includes("['REAL WORLD','SIGNAL','OBSERVATION','EVIDENCE','INFERENCE','AUTHORITY','EXECUTION','RETURN']"));
check('footer does not repeat active title or statement',
  !chrome.includes('<b>{context.statement}</b>'));
check('public chrome hides route menu',
  !chrome.includes('SFI_PUBLIC_NAV.map')
  && !chrome.includes('sfiPublicModuleRail'));
check('reference chrome owns fixed header and semantic timeline clearances',
  chromeCss.includes('border-bottom:1px solid rgba(232,221,195,.22)')
  && chromeCss.includes('.sfiPublicChromeSpacer')
  && chromeCss.includes('sfiFooterChains')
  && chromeCss.includes('sfiFooterReality'));

check('landing owns vertical surface transition',landing.includes('goScene')&&landing.includes('CHANGE SURFACE'));
check('Home reference hero remains canonical and keeps the seven-surface rail',
  manifest.includes("eyebrow:'INSTITUTIONAL FIELD'")
  && manifest.includes("lead:'SYSTEM | FRICTION | INSTITUTE'")
  && !manifest.includes("actions:[{label:'Enter Observatory'")
  && !landing.includes('The world does not have the same time.')
  && landing.includes('SURFACE_RAIL')
  && landing.includes("label:'TIMELINE'")
  && landing.includes("label:'REALITY CHAIN'")
  && landing.includes("label:'ROOT'")
  && landingCss.includes('.sfiTopicRail'));
check('landing owns horizontal reading transition',landing.includes('moveFrame')&&landing.includes('CHANGE READING'));
check('landing visual stage is shared once while active scene owns its visual sources',
  landing.includes('sfiVisualStage')
  && landing.includes('sceneBackground=scene.background')
  && landing.includes('sceneAssets=scene.assets')
  && landing.includes('sceneAssets.map')
  && landing.split('sfiVisualStage').length===2);
check('landing visual stack has real pointer parallax',
  landing.includes('handlePointerMove')
  && landing.includes('sfiSceneParallaxLayer')
  && landing.includes('data-motion')
  && landingCss.includes('.sfiSceneParallaxLayer')
  && landingCss.includes('sfiSurfaceAmbientDrift'));
check('landing scene transition remains bounded to interface state',
  landingCss.includes('.sfiScene[data-state="past"]')
  && landingCss.includes('.sfiFieldState'));
check('public visual stack has no human layer',
  !manifest.includes("role:'human'")
  && !manifest.includes('observer.png')
  && !manifest.includes('people.png'));

for(const surface of ['timeline','repository','world-vector','method-lab','reality-chain','observatory','root']){
  check(`canonical public surface declared: ${surface}`,manifest.includes(`id:'${surface}'`));
}
for(const surface of ['ROOT','OBSERVATORY','REALITY_CHAIN','METHOD_LAB','WORLD_VECTOR','REPOSITORY','TIMELINE']){
  const asset=`SFI_${surface}_HERO_LAYER.png`;
  check(`approved hero declared and present: ${surface}`,manifest.includes(asset) && fs.existsSync(`public/assets/sfi/instruments/${asset}`));
}
for(const icon of ['GOVERNANCE','CASES_PROJECTS','ATTRACTOR','AUTHORITY_BOUNDARY']){
  const asset=`SFI_ROOT_ICON_${icon}.png`;
  check(`ROOT foreground declared and present: ${icon}`,manifest.includes(asset) && fs.existsSync(`public/assets/sfi/instruments/${asset}`));
}
check('instrument scenes use one hero at medium depth and foreground at higher depth',
  manifest.includes("motion:'pointer-parallax'") && manifest.includes('depth:3') && manifest.includes('depth:5'));
check('runtime master corpus remains available for intro',
  manifest.includes('/sfi/nyc/runtime/background.avif')
  && manifest.includes('/sfi/nyc/runtime/earth.avif')
  && manifest.includes('/sfi/nyc/runtime/structure.avif'));
check('duplicate lights beam is absent',!manifest.includes('lights.avif'));

const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks)console.log(`${ok?'PASS':'FAIL'} · ${name}`);
if(failed.length)process.exit(1);

// Inspect the actual manifest rather than only source tokens.
import { SCENES } from '../src/components/sfi/publicSceneManifest';
const surfaces=['root','observatory','reality-chain','method-lab','world-vector','repository','timeline'];
const reality=['REAL WORLD','SIGNAL','OBSERVATION','EVIDENCE','INFERENCE','AUTHORITY','EXECUTION','RETURN'];
const assert=(ok:boolean,message:string)=>{if(!ok)throw new Error(message);};
assert(JSON.stringify(SCENES.slice(1).map(scene=>scene.id))===JSON.stringify(surfaces),'surface sequence drift');
for(const scene of SCENES){
  assert(scene.background==='/sfi/nyc/runtime/background.avif',`background drift: ${scene.id}`);
  if(scene.id!=='intro')assert(scene.assets.length===1 && scene.assets[0].alpha===true && scene.assets[0].motion==='pointer-parallax',`hero stack drift: ${scene.id}`);
}
assert(JSON.stringify(SCENES.find(scene=>scene.id==='reality-chain')?.frames.map(frame=>frame.label))===JSON.stringify(reality),'Reality Chain sequence drift');
assert(SCENES.find(scene=>scene.id==='root')?.tiles?.length===4,'ROOT foreground missing');
assert(landing.includes('sfiRealityTrajectory') && landing.includes('inert={index!==sceneIndex}') && landing.includes("matchMedia('(prefers-reduced-motion: reduce)')"),'trajectory, focus isolation or reduced motion missing');
console.log('PASS · manifest sequence, shared background, hero stack, ROOT foreground and accessibility');

assert(!chrome.includes("stage:'RESEARCH'"), 'Method Lab visual stage must exist in the institutional chain');
assert(landingCss.includes('@media(min-width:901px) and (max-height:800px)'), 'compact desktop chrome clearance missing');
