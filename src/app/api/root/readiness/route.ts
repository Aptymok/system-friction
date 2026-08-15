import { NextResponse } from 'next/server';
import { readInstitutionalReadiness } from '@/lib/root/closure/readInstitutionalReadiness';
import { recordTotalProofReceipt } from '@/lib/root/closure/totalProof';
import { requireRootViewer } from '@/lib/root/server';

export const dynamic='force-dynamic';
export const runtime='nodejs';

export async function GET(){
  const gate=await requireRootViewer('root.readiness.read');
  if(!gate.ok)return NextResponse.json(gate.body,{status:gate.status});
  try{return NextResponse.json({ok:true,readiness:await readInstitutionalReadiness()},{headers:{'Cache-Control':'no-store'}});}catch(error){return NextResponse.json({ok:false,error:'institutional_readiness_failed',details:error instanceof Error?error.message:String(error)},{status:503});}
}

export async function POST(){
  try{
    const result=await recordTotalProofReceipt();
    return NextResponse.json(result.body,{status:result.status});
  }catch(error){return NextResponse.json({ok:false,error:'total_proof_record_failed',details:error instanceof Error?error.message:String(error)},{status:503});}
}
