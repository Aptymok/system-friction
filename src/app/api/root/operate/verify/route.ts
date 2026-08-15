import { NextResponse } from 'next/server';
import { requireRootActor, auditRootAction } from '@/lib/root/server';
import { runFullCycleVerification } from '@/lib/root/closure/fullCycleVerification';

export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=300;

export async function POST(request:Request){
  const gate=await requireRootActor('root.operate.full_cycle_verify');
  if(!gate.ok)return NextResponse.json(gate.body,{status:gate.status});
  const body=await request.json().catch(()=>({})) as Record<string,unknown>;
  const operatingCycleId=typeof body.operatingCycleId==='string'?body.operatingCycleId.trim():'';
  if(!operatingCycleId)return NextResponse.json({ok:false,error:'operating_cycle_id_required'},{status:400});
  try{
    const result=await runFullCycleVerification({ownerId:gate.ctx.user.id,operatingCycleId});
    const audit=await auditRootAction({actorId:gate.ctx.user.id,action:'operating_cycle.full_verify',target:operatingCycleId,payload:{complete:result.proof.complete,steps:result.proof.steps.map(step=>({id:step.id,status:step.status,ref:step.ref}))},request});
    return NextResponse.json({...result,audit},{status:result.ok?200:409});
  }catch(error){
    return NextResponse.json({ok:false,error:'full_cycle_verification_failed',details:error instanceof Error?error.message:String(error)},{status:503});
  }
}
