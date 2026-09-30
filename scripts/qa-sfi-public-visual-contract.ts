import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p:string)=>fs.readFileSync(path.join(root,p),'utf8');
const checks:Array<[string,boolean]>=[];
const check=(name:string,ok:boolean)=>checks.push([name,ok]);

const chrome=read('src/components/public/SfiPublicChrome.tsx');
const globals=read('src/app/globals.css');
const landing=read('src/components/sfi/PublicEntryGateway.tsx');
const landingCss=read('src/components/sfi/PublicEntryGateway.css');
const manifest=read('src/components/sfi/publicSceneManifest.ts');

check('canonical public header exists',chrome.includes('SfiPublicHeader')&&chrome.includes('NEW YORK · AI WEEK 2026'));
check('canonical public footer is ultra-fine institutional chrome',chrome.includes('SfiPublicFooter')&&chrome.includes('EVIDENCE · AUTHORITY · RETURN'));
check('public chrome is one-page rather than route navigation',!chrome.includes('SFI_PUBLIC_NAV.map')&&!chrome.includes('PublicNewsletterForm'));
check('transparent glass chrome contract is global',globals.includes('SFI NYC LANDING CHROME 1.0')&&globals.includes('backdrop-filter:blur(18px)'));
check('landing owns vertical subject transition',landing.includes('goScene')&&landing.includes('CHANGE SUBJECT'));
check('landing owns horizontal explanation transition',landing.includes('moveFrame')&&landing.includes('CHANGE EXPLANATION'));
check('landing has no route CTAs',!landing.includes('sfiSceneActions')&&!landing.includes('primaryHref'));
check('NYC visual stack has no humans',!manifest.includes("role:'human'")&&!manifest.includes('observer.png')&&!manifest.includes('board.png')&&!manifest.includes('people.png'));
for(const asset of ['background.avif','earth.avif','moon.avif','clouds.avif','golden-circle.avif','structure.avif','lines.avif','lights.avif']){
  check(`NYC layer declared: ${asset}`,manifest.includes(`/sfi/nyc/${asset}`));
}
check('hyper-elite cinematic layering exists',landingCss.includes('.sfiSceneLayer--7')&&landingCss.includes('mix-blend-mode:screen')&&landingCss.includes('sfiNycDrift'));

const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks)console.log(`${ok?'PASS':'FAIL'} · ${name}`);
if(failed.length)process.exit(1);
