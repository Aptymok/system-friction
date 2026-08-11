import { NextResponse } from 'next/server';
import { createLineageCheckpoint, readLatestLineageCheckpoint } from '@/lib/cognitive-twin/reentry/checkpoint';
import { auditRootAction, requireRootActor, requireRootViewer } from '@/lib/root/server';

export const dynamic='force-dynamic';
export const runtime='nodejs';

export async function GET(){
  const gate=await requireRootViewer('root.cognitive-twin.checkpoint.read');
  if(!gate.ok)return NextResponse.json(gate.body,{status:gate.status});
  try{return NextResponse.json({ok:true,checkpoint:await readLatestLineageCheckpoint(),boundary:'Internal checkpoint package only; independent timestamp authority remains pending until an external receipt exists.'},{headers:{'Cache-Control':'no-store'}});}catch(error){return NextResponse.json({ok:false,error:'ct_checkpoint_read_failed',details:error instanceof Error?error.message:String(error)},{status:503});}
}

export async function POST(request:Request){
  const gate=await requireRootActor('root.cognitive-twin.checkpoint.create');
  if(!gate.ok)return NextResponse.json(gate.body,{status:gate.status});
  try{const result=await createLineageCheckpoint(gate.ctx.user.id);const audit=await auditRootAction({actorId:gate.ctx.user.id,action:'root.cognitive-twin.checkpoint.create',target:'CT-A01',payload:{taskId:result.taskId,checkpointHash:result.checkpointHash,externalAnchor:'PENDING'},request});if(!audit.ok)return NextResponse.json(audit,{status:500});return NextResponse.json({ok:true,...result,audit});}catch(error){return NextResponse.json({ok:false,error:'ct_checkpoint_create_failed',details:error instanceof Error?error.message:String(error)},{status:409});}
}
