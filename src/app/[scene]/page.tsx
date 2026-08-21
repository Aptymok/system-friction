import { notFound } from 'next/navigation';
import { SfiConsole } from '@/components/sfi/SfiConsole';
import { SCENE_KEYS, type SceneKey } from '@/components/sfi/scenes';
export default async function ScenePage({ params }:{ params:Promise<{scene:string}> }){ const { scene } = await params; if(!SCENE_KEYS.includes(scene as SceneKey)) notFound(); return <SfiConsole scene={scene as SceneKey}/>; }
