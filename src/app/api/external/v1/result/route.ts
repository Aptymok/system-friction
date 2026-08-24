import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { sha256 } from '@/lib/operational/common';

export const dynamic='force-dynamic';
export const runtime='nodejs';

type Row=Record<string,unknown>;
const BLOCKED_KEYS=new Set(['content','raw','rawobject','raw_object','file','binary','bytes','blob','base64','dataurl','data_url']);
function sanitize(value:unknown,depth=0):unknown{
  if(depth>8)return '[depth-truncated]';
  if(value==null||typeof value==='string'||typeof value==='number'||typeof value==='boolean')return value;
  if(Array.isArray(value))return value.slice(0,500).map(v=>sanitize(v,depth+1));
  if(typeof value==='object'){
    const out:Row={};
    for(const [key,val] of Object.entries(value as Row)){
      if(BLOCKED_KEYS.has(key.toLowerCase()))continue;
      out[key]=sanitize(val,depth+1);
    }
    return out;
  }
  return String(value);
}

function text(value:unknown){return typeof value==='string'&&value.trim()?value.trim():null;}

export async function POST(req:Request){
  const auth=authorizeExternalRequest(req,'lab:write');
  if(!auth.credential)return NextResponse.json(externalAuthError(auth,'lab:write'),{status:401});
  const body=await req.json().catch(()=>({})) as Row;
  const object=body.object&&typeof body.object==='object'&&!Array.isArray(body.object)?sanitize(body.object) as Row:null;
  const result=body.result&&typeof body.result==='object'&&!Array.isArray(body.result)?sanitize(body.result) as Row:null;
  if(!object||!result)return NextResponse.json({ok:false,error:'object_and_structured_result_required'},{status:400});
  const serialized=JSON.stringify(result);
  if(serialized.length>750_000)return NextResponse.json({ok:false,error:'structured_result_too_large',limitBytes:750000},{status:413});

  const actorId=externalActor(auth.credential);
  const tenantId=auth.credential.tenantId??'sfi';
  const objectKey=text(object.objectKey)??text(object.id)??`object:${sha256(object)}`;
  const suppliedObjectHash=text(object.objectHash)??text(object.contentHash)??text(object.fingerprint);
  const objectHash=suppliedObjectHash??sha256({objectKey,kind:object.kind??null,name:object.name??null,mimeType:object.mimeType??null,sourceUrl:object.sourceUrl??null,assetRef:object.assetRef??null});
  const objectHashBasis=suppliedObjectHash?'CLIENT_CONTENT_FINGERPRINT':'REFERENCE_IDENTITY';
  const cycleId=typeof body.cycleId==='string'&&body.cycleId.trim()?body.cycleId.trim():randomUUID();
  const event=await appendEpistemicEvent({
    eventName:'SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED',
    epistemicClass:'derived',
    confidence:typeof body.confidence==='number'?Math.max(0,Math.min(1,body.confidence)):1,
    payload:{
      contract:'SFI-STRUCTURED-RESULT-1.1',
      storagePolicy:'REFERENCE_ONLY',
      rawObjectPersisted:false,
      actorId,tenantId,cycleId,objectKey,objectHash,objectHashBasis,
      question:typeof body.question==='string'?body.question:null,
      objective:typeof body.objective==='string'?body.objective:null,
      object,
      result,
      analyzer:body.analyzer&&typeof body.analyzer==='object'?sanitize(body.analyzer):null,
      receivedAt:new Date().toISOString(),
    },
    occurredAt:new Date().toISOString(),
    source:{sourceId:actorId,sourceType:'external_agent_structured_result'},
    logbookId:`structured-result:${cycleId}`,
    lineage:Array.isArray(body.lineage)?body.lineage.filter((v):v is string=>typeof v==='string').slice(0,100):[objectHash],
  });
  if(!event.ok)return NextResponse.json(event,{status:500});
  const eventId=String(event.data.event_id??'');
  return NextResponse.json({
    ok:true,
    cycleId,
    eventId,
    canonicalEventId:eventId,
    objectKey,
    objectHash,
    objectHashBasis,
    event:event.data,
    stored:{rawObject:false,structuredResult:true,storagePolicy:'REFERENCE_ONLY'},
    next:'Use this canonical eventId for reread/lineage verification. Keep the cycle open until an observed return is contrasted and closure conditions are satisfied.'
  },{status:201});
}
