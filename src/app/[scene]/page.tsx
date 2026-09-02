import { notFound, redirect } from 'next/navigation';
import { SfiConsole } from '@/components/sfi/SfiConsole';
import { LEGACY_INTERNAL_SCENES, SCENE_KEYS, type SceneKey } from '@/components/sfi/scenes';

export default async function ScenePage({ params }:{ params:Promise<{scene:string}> }){
  const { scene } = await params;
  if ((LEGACY_INTERNAL_SCENES as readonly string[]).includes(scene)) redirect('/root');
  if(!SCENE_KEYS.includes(scene as SceneKey)) notFound();
  return <SfiConsole scene={scene as SceneKey}/>;
}
