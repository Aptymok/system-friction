import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(ROOT,file),'utf8');
const fail=(message:string):never=>{console.error('SFI English-interface QA failed: '+message);process.exit(1)};
const requireText=(haystack:string,needle:string,label:string)=>{if(!haystack.includes(needle))fail(label+' is missing: '+needle)};
const rejectText=(haystack:string,needle:string,label:string)=>{if(haystack.includes(needle))fail(label+' must not contain: '+needle)};

const provider=read('src/components/i18n/SfiLanguageProvider.tsx');
const nav=read('src/lib/navigation/publicNavigation.ts');
const publicChrome=read('src/components/public/SfiPublicChrome.tsx');
const authMenu=read('src/components/sfi/AuthenticatedSfiMenu.tsx');
const layout=read('src/app/layout.tsx');
const entry=read('src/components/sfi/PublicEntryGateway.tsx');
const observatory=read('src/components/sfi/ObservatoryConsole.tsx');
const consoleUi=read('src/components/sfi/SfiConsole.tsx');
const rootUi=read('src/components/sfi/SfiRootWorkspace.tsx');
const access=read('src/app/root/access/page.tsx');
const evidence=read('src/components/sfi/RootEvidenceReviewConsole.tsx');
const laboratory=read('src/app/laboratory/page.tsx');
const methodLab=read('src/app/method-lab/page.tsx');
const pkg=JSON.parse(read('package.json')) as {scripts?:Record<string,string>};

requireText(provider,"language: 'en'",'global English language owner');
requireText(provider,"document.documentElement.lang = 'en'",'document English synchronization');
requireText(provider,"text = useCallback((_es: string, en: string) => en",'English projection');
rejectText(provider,"window.localStorage.getItem(STORAGE_KEY)",'language preference read');
rejectText(provider,"aria-label={language === 'es'",'language switch');
rejectText(provider,"setPrivateLanguage",'mutable bilingual runtime');

requireText(nav,"href:'/'",'single public landing href');
requireText(nav,"label:'HOME'",'single public landing label');
for(const retired of ['/observatory','/laboratory','/publications','/institution','/contact','/method-lab']){
  rejectText(nav,`href:'${retired}'`,`public nav must not expose ${retired}`);
}

requireText(layout,'<html lang="en">','root document English declaration');
requireText(layout,'<SfiPublicHeader global/>','global institutional header');
requireText(layout,'<SfiPublicFooter global/>','global institutional footer');
rejectText(publicChrome,'SFI_PUBLIC_NAV.map','NYC chrome must not render route menu');
requireText(publicChrome,'NEW YORK 2026','NYC event identity');
requireText(publicChrome,'OCT 08 · 19:00 ET','NYC event time');
requireText(publicChrome,'href="/login"','shared public chrome sign-in');
requireText(publicChrome,'href="/privacy"','ultra-fine footer privacy');
rejectText(entry,'SFI_PUBLIC_NAV.map','home duplicate public navigation');
rejectText(observatory,'SFI_PUBLIC_NAV.filter','Observatory duplicate public navigation');
requireText(laboratory,"redirect('/')",'former Laboratory public surface converges to NYC landing');
requireText(methodLab,"requireUserProfile()",'Method Lab remains authenticated');
requireText(methodLab,"redirect('/login?next=%2Fmethod-lab')",'Method Lab unauthenticated redirect');

requireText(consoleUi,"if(current==='root') return",'ROOT single-shell handoff');
requireText(consoleUi,'<SfiRootWorkspace enabled/>','ROOT workspace owner');
for(const label of ['CURRENT STATE','TRAJECTORIES','OBSERVATORY','GOVERNANCE','TWIN / SPINE','PROJECTIONS & PHENOMENA','JR. LOGBOOK','TECHNICAL LOG','H1, HR, CONTRAST & LEARNING']) requireText(authMenu,`label:'${label}'`,'authenticated navigation English');
for(const stale of ['DESPLAZAMIENTO','TRAYECTORIAS','OBSERVATORIO','PROYECCIONES Y FENÓMENOS','BITÁCORA TÉCNICA','CONTRASTE Y APRENDIZAJE']) rejectText(authMenu,stale,'authenticated navigation stale Spanish label');
rejectText(consoleUi,'NUEVO →','Spanish create action');
rejectText(rootUi,'SOBERANÍA INSTITUCIONAL','ROOT Spanish authority heading');
rejectText(rootUi,'ACEPTAR','ROOT Spanish accept action');
rejectText(rootUi,'DENEGAR','ROOT Spanish deny action');
rejectText(rootUi,'SOLICITAR EVIDENCIA','ROOT Spanish evidence action');

for(const [source,label] of [[access,'ROOT Access'],[evidence,'ROOT Evidence']] as const){
  for(const token of ['Invitación','Correo','Cuenta','Actualizar','No hay','La ausencia','Ninguna fuente']){
    rejectText(source,token,label+' Spanish UI token');
  }
}

const build=pkg.scripts?.build??'';
const qaScript=pkg.scripts?.['qa:sfi-bilingual-interface']??'';
if(!qaScript.includes('qa-sfi-bilingual-interface.ts'))fail('package script qa:sfi-bilingual-interface is not wired');
if(!build.includes('qa:sfi-bilingual-interface'))fail('English-interface QA is not part of canonical build');

console.log(JSON.stringify({
  ok:true,
  contract:'SFI-ENGLISH-INTERFACE-4.0',
  language:'en',
  languageSwitchVisible:false,
  publicLanding:'/',
  formerPublicHubs:'redirect:/',
  governedMethodLab:'/method-lab',
  rootGlobalMenus:1,
},null,2));
