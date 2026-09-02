'use client';

import Link from 'next/link';
import { useAuthState } from '@/components/auth/AuthProvider';
import { ObservatoryConsole } from './ObservatoryConsole';
import { RootOperationalWorkboard } from './RootOperationalWorkboard';
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
  if(scene==='field') return <ObservatoryConsole/>;

  const current=scene as InternalSceneKey;
  const spec=SCENE_LABELS[current];

  if(auth.status!=='authenticated'){
    return <main className="sfiOperatingShell sfiAccessShell">
      <header className="sfiOperatingTop">
        <Link href="/" className="sfiWordmark">SFI</Link>
        <SessionControls/>
      </header>
      <section className="sfiAccessCard">
        <span>ESPACIO OPERATIVO</span>
        <h1>{spec.title}</h1>
        <p>Esta superficie contiene casos, evidencia, decisiones y conocimiento gobernado. Inicia sesión para operar SFI.</p>
        <SessionControls/>
      </section>
    </main>;
  }

  return <main className="sfiOperatingShell">
    <header className="sfiOperatingTop">
      <div className="sfiOperatingIdentity">
        <Link href="/root" className="sfiWordmark">SFI</Link>
        <div><strong>{spec.title}</strong><small>{spec.subtitle}</small></div>
      </div>
      <nav className="sfiOperatingNav" aria-label="SFI operating surfaces">
        {NAV.map(item=><Link key={item.key} href={item.href} className={current===item.key?'isActive':''}>{SCENE_LABELS[item.key].label}</Link>)}
      </nav>
      <div className="sfiOperatingAccount"><span>{auth.identity?.alias||'ROOT'}</span><SessionControls/></div>
    </header>
    <RootOperationalWorkboard enabled surface={current}/>
  </main>;
}

export { INTERNAL_SCENE_KEYS };
