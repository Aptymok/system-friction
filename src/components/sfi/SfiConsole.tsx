'use client';

import Link from 'next/link';
import { useAuthState } from '@/components/auth/AuthProvider';
import { translateUiText, useSfiLanguage } from '@/components/i18n/SfiLanguageProvider';
import { ObservatoryConsole } from './ObservatoryConsole';
import { SfiOperatingWorkspace } from './SfiOperatingWorkspace';
import { SfiRootWorkspace } from './SfiRootWorkspace';
import { SessionControls } from './SessionControls';
import { INTERNAL_SCENE_KEYS, SCENE_LABELS, type InternalSceneKey, type SceneKey } from './scenes';
import './SfiConsole.css';

const HUMAN_NAV = [
  { href:'/root', label:'AHORA', scene:'root' },
  { href:'/cases', label:'PROYECTOS / CASES', scene:'cases' },
  { href:'/root#decisions', label:'DECISIONES', scene:null },
  { href:'/root#reports', label:'REPORTES', scene:null },
  { href:'/observatory', label:'OBSERVATORY', scene:null },
  { href:'/library', label:'LIBRARY', scene:null },
] as const;

export function SfiConsole({scene}:{scene:SceneKey}){
  const auth=useAuthState();
  const {language,text}=useSfiLanguage();
  const ui=(value:string)=>translateUiText(value,language);
  if(scene==='field') return <ObservatoryConsole/>;

  const current=scene as InternalSceneKey;
  const spec=SCENE_LABELS[current];

  if(auth.status!=='authenticated'){
    return <main className="sfiOperatingShell sfiAccessShell">
      <header className="sfiOperatingTop"><Link href="/" className="sfiWordmark">SFI</Link><SessionControls/></header>
      <section className="sfiAccessCard"><span>{text('ESPACIO DE TRABAJO','WORK SPACE')}</span><h1>{ui(spec.title)}</h1><p>{text('Esta superficie contiene proyectos, casos, evidencia, decisiones, reportes y conocimiento autorizado. Inicia sesión para continuar.','This surface contains projects, cases, evidence, decisions, reports and authorized knowledge. Sign in to continue.')}</p><SessionControls/></section>
    </main>;
  }

  return <main className="sfiOperatingShell">
    <header className="sfiOperatingTop">
      <div className="sfiOperatingIdentity"><Link href="/root" className="sfiWordmark">SFI</Link><div><strong>{ui(spec.title)}</strong><small>{ui(spec.subtitle)}</small></div></div>
      <nav className="sfiOperatingNav" aria-label="SFI work surfaces">
        {HUMAN_NAV.map((item)=><Link key={item.href} href={item.href} className={item.scene===current?'isActive':''}>{ui(item.label)}</Link>)}
        <Link href="/cases/new" className="sfiCreateAction">NUEVO →</Link>
        <Link href="/governance" className={current==='governance'?'isActive':''}>SFI / SYSTEM</Link>
      </nav>
      <div className="sfiOperatingAccount"><span>{auth.identity?.alias||'ROOT'}{auth.identity?.displayTitle?` · ${auth.identity.displayTitle}`:''}</span><SessionControls/></div>
    </header>
    {current==='root'?<SfiRootWorkspace enabled/>:<SfiOperatingWorkspace enabled surface={current}/>}
  </main>;
}

export { INTERNAL_SCENE_KEYS };