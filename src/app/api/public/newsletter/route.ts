import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime='nodejs';

function email(value:unknown){
  const text=typeof value==='string'?value.trim().toLowerCase():'';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)&&text.length<=320?text:null;
}

export async function POST(request:Request){
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const address=email(body?.email);
  if(!address||body?.consent!==true)return NextResponse.json({ok:false,error:'A valid email address and explicit consent are required.'},{status:400});
  const db=createServiceSupabaseClient();
  const result=await db.from('sfi_public_newsletter_subscribers').upsert({
    email:address,
    consent:true,
    source:typeof body?.source==='string'?body.source.slice(0,80):'PUBLIC',
    status:'ACTIVE',
    consented_at:new Date().toISOString(),
    updated_at:new Date().toISOString(),
  },{onConflict:'email'}).select('id').maybeSingle();
  if(result.error)return NextResponse.json({ok:false,error:'Subscription persistence is currently unavailable.'},{status:503});
  return NextResponse.json({ok:true},{status:201});
}
