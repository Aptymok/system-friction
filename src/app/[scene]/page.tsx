import { notFound } from 'next/navigation';
import { SfiConsole } from '@/components/sfi/SfiConsole';
import { SceneFieldOverlay } from '@/components/sfi/SceneFieldOverlay';
import { SCENE_KEYS, type SceneKey } from '@/components/sfi/scenes';

export default async function ScenePage({ params }:{ params:Promise<{scene:string}> }){
  const { scene } = await params;
  if(!SCENE_KEYS.includes(scene as SceneKey)) notFound();
  const key = scene as SceneKey;
  return <><SfiConsole scene={key}/><SceneFieldOverlay scene={key}/></>;
}
