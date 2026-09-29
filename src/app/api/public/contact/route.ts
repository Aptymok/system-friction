import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime='nodejs';

const text=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):'';
function validEmail(value:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&value.length<=320}

export async function POST(request:Request){
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const name=text(body?.name,160),address=text(body?.email,320).toLowerCase(),subject=text(body?.subject,240),message=text(body?.message,6000);
  if(!name||!validEmail(address)||!subject||!message||body?.consent!==true)return NextResponse.json({ok:false,error:'Name, valid email, subject, message and explicit consent are required.'},{status:400});
  const db=createServiceSupabaseClient();
  const result=await db.from('sfi_public_contact_submissions').insert({
    name,
    email:address,
    organization:text(body?.organization,200)||null,
    subject,
    message,
    consent:true,
    source:text(body?.source,80)||'PUBLIC',
    status:'RECEIVED',
  }).select('id').maybeSingle();
  if(result.error)return NextResponse.json({ok:false,error:'Contact persistence is currently unavailable.'},{status:503});
  return NextResponse.json({ok:true},{status:201});
}
