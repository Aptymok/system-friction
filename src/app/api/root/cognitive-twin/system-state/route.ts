import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { readLegacyCognitiveTwinState } from '@/lib/cognitive-twin/legacyCapabilityBridge';

export const dynamic='force-dynamic';
export const runtime='nodejs';

export async function GET(){
  const gate=await requireRootActor('root.cognitive_twin.system_state.read');
  if(!gate.ok)return NextResponse.json(gate.body,{status:gate.status});
  try{
    const state=await readLegacyCognitiveTwinState();
    return NextResponse.json({ok:true,state},{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    return NextResponse.json({ok:false,error:'cognitive_twin_system_state_failed',details:error instanceof Error?error.message:String(error)},{status:503});
  }
}
