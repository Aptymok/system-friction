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

check('canonical contextual public header exists',
  chrome.includes('SfiPublicHeader')
  && chrome.includes('sfiPublicPageTitle')
  && chrome.includes("timeZone:'UTC'")
  && chrome.includes('SIGN IN'));
check('canonical semantic footer exists',
  chrome.includes('SfiPublicFooter')
  && chrome.includes('sfiFooterChain')
  && chrome.includes('AI WEEK NYC 2026')
  && chrome.includes('https://gomry.com/l/Kzcb3xl'));
check('public chrome hides route menu',
  !chrome.includes('SFI_PUBLIC_NAV.map')
  && !chrome.includes('sfiPublicModuleRail'));
check('ultra-fine glass chrome owns overlap spacing',
  chromeCss.includes('backdrop-filter:blur(12px)')
  && chromeCss.includes('.sfiPublicChromeSpacer')
  && chromeCss.includes('sfiFooterState'));
check('landing owns vertical text subject transition',landing.includes('goScene')&&landing.includes('CHANGE SUBJECT'));
check('landing owns horizontal text explanation transition',landing.includes('moveFrame')&&landing.includes('CHANGE EXPLANATION'));
check('landing visual stage is shared once',landing.includes('sfiVisualStage')&&landing.includes('sharedAssets.map')&&landing.split('sharedAssets.map').length===2);
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
