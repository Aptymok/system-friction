import { NextResponse } from 'next/server';
import { requireSfiMember, AccessDeniedError } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
type Row=Record<string,unknown>;
const rec=(v:unknown):Row=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request:Request){
  try{
    const {user,profile}=await requireSfiMember();
    if(rec(profile.module_access).studio!==true)return NextResponse.json({ok:false,error:'STUDIO_ACCESS_REQUIRED'},{status:403});
    const sessionId=new URL(request.url).searchParams.get('sessionId')??'';
    if(!UUID.test(sessionId))return NextResponse.json({ok:false,error:'INVALID_SESSION'},{status:400});
    const db=createServiceSupabaseClient();
    const owned=await db.from('studio_sessions').select('id')
      .eq('id',sessionId).eq('owner_id',user.id).maybeSingle();
    if(owned.error)return NextResponse.json({ok:false,error:'SESSION_READ_UNAVAILABLE'},{status:503});
    if(!owned.data)return NextResponse.json({ok:false,error:'SESSION_NOT_OWNED'},{status:403});
    const objectRead=await db.from('studio_objects')
      .select('id,object_type').eq('session_id',sessionId).eq('owner_id',user.id).limit(120);
    if(objectRead.error)return NextResponse.json({ok:false,error:'OBJECTS_READ_UNAVAILABLE'},{status:503});
    const ids=(objectRead.data??[]).filter(o=>['music','audio','song','music_audio'].includes(String(o.object_type??'').toLowerCase())).map(o=>String(o.id));
    if(!ids.length)return NextResponse.json({
      ok:true,features:[],dataStatus:'NO_MUSIC_OBJECTS',source:'studio_audio_features',
      energyTransform:'DBFS_TO_LINEAR_MEAN_SQUARE_PROXY_NOT_VALIDATED',notAudienceEvidence:true,
    },{headers:{'Cache-Control':'private, no-store'}});
    const features=await db.from('studio_audio_features')
      .select('object_id,rms,created_at').in('object_id',ids).eq('owner_id',user.id)
      .order('created_at',{ascending:false}).limit(350);
    if(features.error)return NextResponse.json({ok:false,error:'AUDIO_FEATURES_READ_UNAVAILABLE'},{status:503});
    const byId=new Map<string,{objectId:string;energyProxy:number;observedAt:string|null}>();
    for(const f of features.data??[]){
      const id=String(f.object_id);
      const rmsDbfs=typeof f.rms==='number'?f.rms:NaN;
      // Existing audioPersistence stores RMS in dBFS, not a linear 0–1 value.
      const energyProxy=Number.isFinite(rmsDbfs)&&rmsDbfs<=0&&rmsDbfs>=-120
        ?Math.pow(10,rmsDbfs/10):NaN; // squared normalized RMS amplitude (mean-square proxy)
      if(!byId.has(id)&&Number.isFinite(energyProxy)&&energyProxy>=0&&energyProxy<=1){
        // RMS in linear amplitude is used only as a sequencing proxy.
        byId.set(id,{objectId:id,energyProxy:Number(energyProxy.toFixed(6)),
          observedAt:typeof f.created_at==='string'?f.created_at:null});
      }
    }
    return NextResponse.json({
      ok:true,features:[...byId.values()],dataStatus:features.data?.length===350?'TRUNCATED':'READ',
      source:'studio_audio_features',energyTransform:'DBFS_TO_LINEAR_MEAN_SQUARE_PROXY_NOT_VALIDATED',
      notAudienceEvidence:true,notNarrativeJudgment:true,
    },{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    if(error instanceof AccessDeniedError)return NextResponse.json({ok:false,error:error.code},{status:error.status});
    return NextResponse.json({ok:false,error:'AUDIO_FEATURES_UNAVAILABLE'},{status:503});
  }
}
