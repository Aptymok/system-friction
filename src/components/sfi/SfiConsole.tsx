'use client';

import { useAuthState } from '@/components/auth/AuthProvider';
import { translateUiText, useSfiLanguage } from '@/components/i18n/SfiLanguageProvider';
import { ObservatoryConsole } from './ObservatoryConsole';
import { SfiOperatingWorkspace } from './SfiOperatingWorkspace';
import { SfiRootWorkspace } from './SfiRootWorkspace';
import { SessionControls } from './SessionControls';
import { INTERNAL_SCENE_KEYS, SCENE_LABELS, type InternalSceneKey, type SceneKey } from './scenes';
import './SfiConsole.css';
import { AuthenticatedSfiMenu } from './AuthenticatedSfiMenu';

export function SfiConsole({scene}:{scene:SceneKey}){
  const auth=useAuthState();
  const {language}=useSfiLanguage();
  const ui=(value:string)=>translateUiText(value,language);
  if(scene==='field') return <ObservatoryConsole/>;

  const current=scene as InternalSceneKey;
  const spec=SCENE_LABELS[current];

  if(auth.status!=='authenticated'){
    return <main className="sfiOperatingShell sfiAccessShell">
      <section className="sfiAccessCard"><span>WORK SPACE</span><h1>{ui(spec.title)}</h1><p>This surface contains projects, cases, evidence, decisions, reports and authorized knowledge. Authentication is required before the governed workspace is exposed.</p><SessionControls/></section>
    </main>;
  }

  if(current==='root') return <main className="sfiOperatingShell"><SfiRootWorkspace enabled/></main>;

  return <main className="sfiOperatingShell sfiAuthenticatedViewport">
    <AuthenticatedSfiMenu/>
    <div className="sfiAuthenticatedViewportContent"><SfiOperatingWorkspace enabled surface={current}/></div>
  </main>;
}

export { INTERNAL_SCENE_KEYS };