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
const surface=read('src/components/sfi/PublicInstrumentSurface.tsx');
const surfaceCss=read('src/components/sfi/PublicInstrumentSurface.css');
const route=read('src/app/instruments/[surface]/page.tsx');
const manifest=read('src/components/sfi/publicSceneManifest.ts');
const repositoryPage=read('src/app/repository/page.tsx');
const repositoryUi=read('src/app/repository/RepositoryConsole.tsx');
const repositoryCss=read('src/app/repository/repository.css');

check('canonical SFI mark is shared and never redrawn',
  chrome.includes('/library/assets/sfi-mark.svg')
  && !chrome.includes('sfi-institutional-seal.png')
  && chromeCss.includes('object-fit:contain'));

check('institutional screen palette is canonical',
  chromeCss.includes('#060605')
  && chromeCss.includes('#C8A951')
  && chromeCss.includes('#E8DDC3'));

for(const label of ['ROOT','OBSERVATORY','REALITY CHAIN','METHOD LAB','REPOSITORY','TIMELINE','ACCESS']){
  check(`fixed canonical menu exposes ${label}`,chrome.includes(`label:'${label}'`));
}
for(const id of ['root','observatory','reality-chain','method-lab','timeline','access']){
  check(`menu routes independently to ${id}`,chrome.includes(`href:'/instruments/${id}'`));
}
check('Repository menu enters the canonical repository console',chrome.includes("{key:'repository',label:'REPOSITORY',href:'/repository'}"));
check('menu is physically fixed',chromeCss.includes('position:fixed!important')&&chromeCss.includes('.sfiPublicPageNav'));

check('home is independent from operational instrument deck',
  landing.includes('sfiHomeExperience')
  && landing.includes('SFI_HOME_PANORAMA.png')
  && fs.existsSync('public/assets/sfi/instruments/SFI_HOME_PANORAMA.png')
  && !landing.includes('SFI_HOME_INDEX_PANORAMA_20261008.png')
  && landing.includes('SURFACE_RAIL')
  && !landing.includes('SCENES.map')
  && !landing.includes('sfiSceneDeck'));

check('home uses fixed UI over a two-part horizontal panorama',
  landing.includes('sfiHomePanoramaScroller')
  && landing.includes('sfiHomePanoramaTrack')
  && landing.includes('window.addEventListener(\'wheel\'')
  && landingCss.includes('width:200vw')
  && landingCss.includes('.sfiHomeHeader')
  && landingCss.includes('.sfiHomeSurfaceRail')
  && landingCss.includes('.sfiHomeTimeline'));

check('home removes fabricated live identity and event claims',
  !landing.includes('ANNA MARIN')
  && !landing.includes('1,236 EVENTS')
  && landing.includes('RECONSTRUCTIBLE INSTITUTIONAL MEMORY'));

check('home keeps canonical Reality Chain order in micro-orientation',
  ['REAL WORLD','SIGNAL','OBSERVATION','EVIDENCE','INFERENCE','AUTHORITY','EXECUTION','RETURN']
    .every(token=>landing.includes(`'${token}'`)));

check('home exposes canonical surfaces and enters Repository console',
  ['root','observatory','reality-chain','method-lab','timeline','access']
    .every(id=>landing.includes(`href:'/instruments/${id}'`))
  && landing.includes("sceneId:'repository',href:'/repository'")
  && !landing.includes("href:'/instruments/world-vector'"));

check('instrument route excludes duplicate Repository deck and redirects aliases',
  route.includes("['root','observatory','reality-chain','method-lab','timeline','access']")
  && route.includes("surface==='world-vector'")
  && route.includes("redirect('/instruments/observatory')")
  && route.includes("surface==='repository'")
  && route.includes("redirect('/repository')"));

check('each public instrument is a five-screen horizontal surface',
  surfaceCss.includes('width:500vw')
  && surfaceCss.includes('flex:0 0 100vw')
  && surfaceCss.includes('scroll-snap-type:x mandatory')
  && surface.includes("String(index+1).padStart(2,'0')")
  && surface.includes("01 / 05")===false);

check('Timeline lower rail is an active navigation control rather than decoration',
  surface.includes('sfiTimelineDock')
  && surface.includes('goTo(activeIndex-1)')
  && surface.includes('goTo(activeIndex+1)')
  && surface.includes('onClick={()=>goTo(index)}')
  && surfaceCss.includes('.sfiTimelineDockTrack button[data-active="true"]'));

check('one existing artwork is assigned per public surface',
  [
    '11_40_18-1.png','11_40_22-2.png','RealityChain.png','11_40_26-3.png',
    '11_40_38-6.png','11_40_42-7.png'
  ].every(asset=>surface.includes(asset)));
check('Repository exists only as unified operational/public surface and uses requested artwork',
  !surface.includes("repository:'/assets/sfi/instruments/")
  && fs.existsSync('public/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_42-7.png')
  && repositoryCss.includes("Imagen de ChatGPT 8 oct 2026, 11_40_42-7.png"));

check('public instrument artwork preserves source luminosity and color',
  surfaceCss.includes('.sfiInstrumentArtwork img{width:100%;height:100%;object-fit:cover;object-position:center;filter:none')
  && surfaceCss.includes('.sfiInstrumentArtworkVeil{position:absolute;inset:0;background:rgba(6,6,5,.08)')
  && !surfaceCss.includes('brightness(.72)')
  && !surfaceCss.includes('saturate(.72)'));

check('home panorama preserves original artwork with only a sub-10-percent global veil',
  landingCss.includes('.sfiHomePanoramaTrack img{display:block;width:200vw;height:100%;object-fit:cover;object-position:center 42%;filter:none')
  && landingCss.includes('.sfiHomePanoramaVeil{position:absolute;inset:0;z-index:1;pointer-events:none;background:rgba(6,6,5,.08)')
  && !landingCss.includes('brightness(.76)'));

check('Reality Chain preserves canonical sequence',
  ['REAL WORLD','SIGNAL','OBSERVATION','EVIDENCE','INFERENCE','AUTHORITY','EXECUTION','RETURN']
    .every(token=>manifest.includes(`label:'${token}'`)));

for(const token of [
  'REALITY PASSPORT','EPISTEMIC REGISTER','Traceability','independent','ABSTENTION',
  'Assignment ≠ execution','KNOWN THEN','Version','RETURN'
]){
  check(`2026-10-08 institutional adaptation visible: ${token}`,surface.toLowerCase().includes(token.toLowerCase()));
}

check('surface keeps public/operational boundary',
  surface.includes("href:'/root'")
  && surface.includes("href:'/observatory'")
  && surface.includes("href:'/method-lab'")
  && surface.includes("href:'/login'"));

check('Repository is a canonical-registry read surface rather than fabricated archive counts',
  repositoryPage.includes('SFI_CANONICAL_OBJECT_REGISTRY')
  && repositoryPage.includes('canonicalPublicationDisposition')
  && repositoryUi.includes('SOURCE RECORDS')
  && repositoryUi.includes('PROVENANCE')
  && repositoryUi.includes('LINEAGE')
  && repositoryUi.includes('VERSIONS')
  && repositoryUi.includes('HASHES')
  && repositoryUi.includes('NOT MATERIALIZED')
  && repositoryUi.includes('NOT OBSERVED'));

check('Repository reconstructs the supplied panoramic layout as UI components',
  repositoryCss.includes('.repoIdentity')
  && repositoryCss.includes('.repoArchiveRail')
  && repositoryCss.includes('.repoObjectInspector')
  && repositoryCss.includes('.repoProvenance')
  && repositoryCss.includes('.repoTimeline')
  && repositoryCss.includes('background:rgba(5,6,6,.08)')
  && repositoryCss.includes('filter:none'));

check('public visual stack has no baked human asset role',
  !manifest.includes("role:'human'")
  && !manifest.includes('observer.png')
  && !manifest.includes('people.png'));

const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks)console.log(`${ok?'PASS':'FAIL'} · ${name}`);
if(failed.length)process.exit(1);

import { SCENES } from '../src/components/sfi/publicSceneManifest';
const surfaces=['root','observatory','reality-chain','method-lab','repository','timeline','access'];
const reality=['REAL WORLD','SIGNAL','OBSERVATION','EVIDENCE','INFERENCE','AUTHORITY','EXECUTION','RETURN'];
const assert=(ok:boolean,message:string)=>{if(!ok)throw new Error(message);};
assert(JSON.stringify(SCENES.slice(1).filter(scene=>scene.id!=='world-vector').map(scene=>scene.id))===JSON.stringify(surfaces),'public surface sequence drift');
assert(JSON.stringify(SCENES.find(scene=>scene.id==='reality-chain')?.frames.map(frame=>frame.label))===JSON.stringify(reality),'Reality Chain sequence drift');
assert(SCENES.find(scene=>scene.id==='observatory')?.frames.some(frame=>frame.label==='TRAJECTORY'),'Observatory trajectory missing');
assert(!SCENES.some(scene=>scene.id==='world-vector'),'absorbed World Vector scene must remain absent');
assert(!surface.includes("'world-vector':["),'absorbed World Vector instrument panels must remain absent');
assert(!fs.existsSync('public/assets/sfi/instruments/SFI_WORLD_VECTOR_HERO_LAYER.png'),'absorbed World Vector hero asset must remain deleted');
assert(!fs.existsSync('public/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_30-4.png'),'absorbed World Vector deck artwork must remain deleted');
assert(!fs.existsSync('public/assets/sfi/instruments/SFI_REPOSITORY_HERO_LAYER.png'),'obsolete Repository hero layer must remain deleted');
assert(surface.includes('WORLD VECTOR / TENSIONS')&&surface.includes('World Vector remains an Observatory capability'),'World Vector context not absorbed into Observatory');
console.log('PASS · public SFI visual contract with World Vector owned by Observatory and Repository unified at /repository');
