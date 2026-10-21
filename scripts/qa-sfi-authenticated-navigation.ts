import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),read=(p:string)=>fs.readFileSync(path.join(root,p),'utf8');
const nav=read('src/components/sfi/SfiNeuralNavigation.tsx');
const css=read('src/components/sfi/SfiNeuralNavigation.css');
const layout=read('src/app/layout.tsx');
const scene=read('src/app/[scene]/page.tsx');
const consoleUi=read('src/components/sfi/SfiConsole.tsx');
const rootUi=read('src/components/sfi/RootNeuralGraphView.tsx');
const publicUi=read('src/components/public/SfiPublicChrome.tsx');
const surfaceCss=read('src/components/sfi/SfiUnifiedSurfaces.css');
const required=['/root','/root/evidence-review','/root/discovery','/timeline','/reality-chain','/observatory','/method-lab'];
for(const route of required) if(!nav.includes("href:'"+route+"'")) throw new Error('missing neural route: '+route);
if(!layout.includes('<SfiNeuralNavigation />')) throw new Error('neural navigation must be mounted exactly once in shared layout');
if((layout.match(/<SfiNeuralNavigation \/>/g)||[]).length!==1) throw new Error('duplicate neural navigation mount');
if(scene.includes('<AuthenticatedSfiMenu/>')) throw new Error('obsolete authenticated menu still mounted in ROOT');
if(publicUi.includes('singleNeuralSurface')===false) throw new Error('global public menu must respect unified surfaces');
if(!nav.includes('SFI_NEURAL_SURFACES')||!nav.includes('sfiNeuralLines')||!css.includes('sfiNeuralFlow'))
  throw new Error('interconnected animated neural branches missing');
if(!rootUi.includes("searchParams.get('reading')")) throw new Error('ROOT readings no longer addressable');
if(!surfaceCss.includes('earthStage[data-earth-surface="RESTORED-WEBGL-1"]'))
  throw new Error('original WebGL globe must remain in Observatory');
if(!surfaceCss.includes('overflow-x:auto')||!surfaceCss.includes('overflow-y:hidden'))
  throw new Error('horizontal viewport contract missing');
if(consoleUi.includes('sfiOperatingNav')) throw new Error('legacy authenticated top navigation remains');
const access=read('src/lib/system/access/server.ts');
const denied=read('src/app/unauthorized/page.tsx');
if(!access.includes("redirect('/unauthorized')")) throw new Error('access-denial redirect missing');
if(!denied.includes('Institutional access required')||!denied.includes('/observatory')) throw new Error('access denial must be explained');
console.log('PASS · one neural navigation; protected surfaces, WebGL globe and horizontal tile layout');
