import { requireRootActor } from '@/lib/root/server';
import { RootDevelopmentResolvedView } from '@/components/root/development/RootDevelopmentResolvedView';

export const dynamic='force-dynamic';

export default async function RootDevelopmentPage(){
  const gate=await requireRootActor('development.registry.read');
  if(!gate.ok)return <main style={{padding:24}}>ROOT REQUIRED</main>;
  return <RootDevelopmentResolvedView/>;
}