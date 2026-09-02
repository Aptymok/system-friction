'use client';

import Link from 'next/link';
import { useAuthState } from '@/components/auth/AuthProvider';
import { translateUiText, useSfiLanguage } from '@/components/i18n/SfiLanguageProvider';
import { ObservatoryConsole } from './ObservatoryConsole';
import { ObservatoryInterpretiveFlow } from './ObservatoryInterpretiveFlow';
import { SfiOperatingWorkspace } from './SfiOperatingWorkspace';
import { SessionControls } from './SessionControls';
import { INTERNAL_SCENE_KEYS, SCENE_LABELS, type InternalSceneKey, type SceneKey } from './scenes';
import './SfiConsole.css';

const NAV: Array<{key:InternalSceneKey;href:string}> = [
  {key:'root',href:'/root'},
  {key:'cases',href:'/cases'},
  {key:'governance',href:'/governance'},
  {key:'twin',href:'/twin'},
];

export function SfiConsole({scene}:{scene:SceneKey}){
  const auth=useAuthState();
  const {language,text}=useSfiLanguage();
  const ui=(value:string)=>translateUiText(value,language);
  if(scene==='field') return <><ObservatoryConsole/><ObservatoryInterpretiveFlow/></>;

  const current=scene as InternalSceneKey;
  const spec=SCENE_LABELS[current];

  if(auth.status!=='authenticated'){
    return <main className="sfiOperatingShell sfiAccessShell">
      <header className="sfiOperatingTop">
        <Link href="/" className="sfiWordmark">SFI</Link>
        <SessionControls/>
      </header>
      <section className="sfiAccessCard">
        <span>{text('ESPACIO OPERATIVO','OPERATING SPACE')}</span>
        <h1>{ui(spec.title)}</h1>
        <p>{text('Esta superficie contiene casos, evidencia, decisiones y conocimiento gobernado. Inicia sesión para operar SFI.','This surface contains cases, evidence, decisions and governed knowledge. Sign in to operate SFI.')}</p>
        <SessionControls/>
      </section>
    </main>;
  }

  return <main className="sfiOperatingShell">
    <header className="sfiOperatingTop">
      <div className="sfiOperatingIdentity">
        <Link href="/root" className="sfiWordmark">SFI</Link>
        <div><strong>{ui(spec.title)}</strong><small>{ui(spec.subtitle)}</small></div>
      </div>
      <nav className="sfiOperatingNav" aria-label="SFI operating surfaces">
        {NAV.map(item=><Link key={item.key} href={item.href} className={current===item.key?'isActive':''}>{ui(SCENE_LABELS[item.key].label)}</Link>)}
      </nav>
      {current==='governance'&&<span className="srOnly" data-sfi-contract="GOVERNANCE QUEUE">{ui('COLA DE GOBERNANZA · COGNITIVE TWIN / ACP')}</span>}
      <div className="sfiOperatingAccount"><span>{auth.identity?.alias||'ROOT'}</span><SessionControls/></div>
    </header>
    <SfiOperatingWorkspace enabled surface={current}/>
  </main>;
}

export { INTERNAL_SCENE_KEYS };