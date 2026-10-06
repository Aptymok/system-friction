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
check('reference header exposes the approved institutional menu',
  chrome.includes("label:'ROOT'")
  && chrome.includes("label:'OBSERVATORY'")
  && chrome.includes("label:'REPOSITORY'")
  && chrome.includes("label:'MOPH'")
  && chrome.includes("label:'WORLD VECTOR'")
  && chrome.includes("label:'PUBLICATIONS'")
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
  chrome.includes("['OBSERVATION','RESEARCH','EVIDENCE','INFERENCE','AUTHORITY','DECISION','EXECUTION','RETURN','LEARN','OBSERVATION']"));
check('Reality Chain Method is canonical and ordered',
  chrome.includes("['WORLD','SENSOR','SIGNAL','ARTIFACT','CONTEXT','INFERENCE','AUTHORITY','CLAIM','ACTION','RETURN']"));
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
check('landing owns vertical text subject transition',landing.includes('goScene')&&landing.includes('CHANGE SUBJECT'));
check('Home reference hero has direct Observatory entry and six-stage rail',
  landing.includes('Enter Observatory')
  && landing.includes('CORE_RAIL')
  && landing.includes("label:'OBSERVATION'")
  && landing.includes("label:'RETURN'")
  && landingCss.includes('.sfiHeroCta')
  && landingCss.includes('.sfiTopicRail'));
check('landing owns horizontal text explanation transition',landing.includes('moveFrame')&&landing.includes('CHANGE EXPLANATION'));
check('landing visual stage is shared once while active scene owns its clean visual sources',landing.includes('sfiVisualStage')&&landing.includes('sceneBackground=scene.background')&&landing.includes('sceneAssets=scene.assets')&&landing.includes('sceneAssets.map')&&landing.split('sfiVisualStage').length===2);
check('landing visual stage does not react to pointer',!landing.includes('handlePointerMove')&&!landing.includes('stage-shift'));
check('landing scene itself is static',!landingCss.includes('sfiNycDrift')&&!landingCss.includes('animation:sfiNycDrift'));
check('only text/interface scene transition remains',landingCss.includes('.sfiScene[data-state="past"]')&&landingCss.includes('.sfiFieldState'));
check('NYC visual stack has no humans',!manifest.includes("role:'human'")&&!manifest.includes('observer.png')&&!manifest.includes('board.png')&&!manifest.includes('people.png'));
for(const asset of ['background.avif','earth.avif','moon.avif','clouds.avif','golden-circle.avif','structure.avif','lines.avif']){
  check(`runtime NYC layer declared: ${asset}`,manifest.includes(`/sfi/nyc/runtime/${asset}`));
}
check('duplicate lights beam is absent',!manifest.includes('lights.avif'));
check('runtime asset motion contract is static',!manifest.includes("motion:'slow-drift'")&&!manifest.includes("motion:'pointer-parallax'"));

const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks)console.log(`${ok?'PASS':'FAIL'} · ${name}`);
if(failed.length)process.exit(1);
