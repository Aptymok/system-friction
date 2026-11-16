import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, AccessDeniedError } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { studioFieldMetadataFromUnknown } from '@/lib/studio/field/studioFieldState';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Row=Record<string,unknown>;
function rec(value:unknown):Row{return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Row:{};}
const text=(v:unknown,max=240)=>typeof v==='string'&&v.trim()?v.trim().slice(0,max):null;

/** Reads existing persisted Studio Field events scoped to a specific owned
 * node. This is a documentary timeline, not proof of scientific closure.
 * No cross-session name matching, writes or provider invocations. */
export async function GET(request:Request){
  try{
    const {user}=await requireAuthenticatedUser();
    const params=new URL(request.url).searchParams;
    const sessionId=params.get('sessionId')??'';
    const nodeId=params.get('nodeId')??'';
    if(!UUID.test(sessionId)||!UUID.test(nodeId)){
      return NextResponse.json({ok:false,error:'INVALID_FIELD_REFERENCE'},{status:400});
    }
    const db=createServiceSupabaseClient();
    const session=await db.from('studio_sessions').select('id,metadata')
      .eq('id',sessionId).eq('owner_id',user.id).maybeSingle();
    if(session.error)return NextResponse.json({ok:false,error:'STUDIO_FIELD_READ_UNAVAILABLE'},{status:503});
    if(!session.data)return NextResponse.json({ok:false,error:'STUDIO_FIELD_NOT_OWNED'},{status:403});
    const field=studioFieldMetadataFromUnknown(session.data.metadata);
    const declared=field.nodes.find(node=>node.id===nodeId&&!node.archivedAt);
    if(!declared && field.attractor?.id!==nodeId){
      return NextResponse.json({ok:false,error:'FIELD_NODE_NOT_IN_SESSION'},{status:404});
    }
    const events=await db.from('studio_archive_events')
      .select('id,event_type,label,source,created_at,payload,object_id')
      .eq('owner_id',user.id).eq('session_id',sessionId)
      .order('created_at',{ascending:false}).limit(350);
    if(events.error)return NextResponse.json({ok:false,error:'FIELD_HISTORY_UNAVAILABLE'},{status:503});
    const attached=await db.from('studio_objects')
      .select('id,title,created_at,metadata').eq('owner_id',user.id).eq('session_id',sessionId).limit(120);
    const derived=(events.data??[]).filter(entry=>{
      const payload=rec(entry.payload);
      const plan=rec(payload.plan);
      const anchor=rec(plan.anchor);
      const refs=rec(payload.related);
      return [payload.nodeId,payload.fieldAnchorId,anchor.id,refs.nodeId].some(value=>value===nodeId);
    }).slice(0,90).map(entry=>{
      const payload=rec(entry.payload);
      const plan=rec(payload.plan);
      const contrast=rec(payload.contrast);
      return {
        id:entry.id,type:text(entry.event_type,100)??'FIELD_EVENT',
        at:entry.created_at,
        label:text(entry.label,200)??'Evento de Studio Field',
        source:text(entry.source,120)??'studio_archive_events',
        status:text(payload.status,120)??'RECORDED_NOT_INDEPENDENTLY_VERIFIED',
        details:typeof plan.phase==='string'?'Fase propuesta: '+plan.phase:
          typeof contrast.status==='string'?'Estado del contraste: '+contrast.status:null,
        references:{objectId:entry.object_id??null,sourceEventId:text(payload.planEventId,120)},
      };
    });
    const ownedAttachments=attached.error?[]:(attached.data??[])
      .filter(obj=>rec(obj.metadata).fieldNodeId===nodeId)
      .map(obj=>({
        id:obj.id,type:'STUDIO_OBJECT_ATTACHED',at:obj.created_at,
        label:text(obj.title,200)??'Objeto adjunto',source:'studio_objects',
        status:'PERSISTED_ASSOCIATION_NOT_CAUSAL_PROOF',details:null,
        references:{objectId:obj.id,sourceEventId:null},
      }));
    return NextResponse.json({
      ok:true,sessionId,nodeId,
      evidence:[...derived,...ownedAttachments]
        .sort((a,b)=>String(b.at??'').localeCompare(String(a.at??''))),
      sources:{
        archiveRead:events.data?.length===350?'TRUNCATED':'READ',
        objectsRead:attached.error?'UNAVAILABLE':'READ',
      },
      contract:'SFI-STUDIO-FIELD-PASSPORT-READ-1.0',
      ownership:'VERIFIED_OWNER_SESSION',
      completeness:events.data?.length===350?'INCOMPLETE_LIMIT':'BOUNDED_READ',
      inference:'NO_LINK_BY_NAME',
      authorizedExecution:false,certifiedReturn:false,
    },{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    if(error instanceof AccessDeniedError)return NextResponse.json({ok:false,error:error.code},{status:error.status});
    return NextResponse.json({ok:false,error:'FIELD_PASSPORT_UNAVAILABLE'},{status:503});
  }
}
