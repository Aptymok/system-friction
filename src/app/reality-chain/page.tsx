import { redirect } from 'next/navigation';
import { AccessDeniedError, requireUserProfile } from '@/lib/system/access/server';
import { RealityChainWorkbench } from '@/components/sfi/RealityChainWorkbench';

export const dynamic = 'force-dynamic';
export const metadata = { title:'Reality Chain | System Friction Institute', robots:{index:false,follow:false} };

export default async function RealityChainPage(){
  try { await requireUserProfile(); }
  catch(error){
    if(error instanceof AccessDeniedError && error.status===401)redirect('/login?next=%2Freality-chain');
    redirect('/unauthorized');
  }
  return <RealityChainWorkbench/>;
}
