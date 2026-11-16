import { NextResponse } from 'next/server';
import { requireSfiMember, AccessDeniedError } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { studioAttractorProjection } from '@/components/studio/studioAttractorProjection';
import { sequenceStudioReleases, type ReleaseSequenceItem } from '@/components/studio/localAlbumReleaseSequencer';
import type { CampaignEvidenceInput } from '@/components/studio/localNarrativeCampaignPlanner';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
type Row=Record<string,unknown>;
const rec=(v:unknown):Row=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request:Request){
  try{
    const {user,profile}=await requireSfiMember();
    if(rec(profile.module_access).studio!==true)return NextResponse.json({ok:false,error:'STUDIO_ACCESS_REQUIRED'},{status:403});
    const body=await request.json().catch(()=>null);
    const data=rec(body);
    const sessionId=data.sessionId;
    const selectedNodeIds=data.selectedNodeIds;
    if(typeof sessionId!=='string'||!UUID.test(sessionId)||
      !Array.isArray(selectedNodeIds)||selectedNodeIds.length<1||selectedNodeIds.length>24||
      !selectedNodeIds.every(id=>typeof id==='string'&&id.length<250)||
      typeof data.earliestDate!=='string'||data.earliestDate.length>10||
      (data.worldEvidence!==undefined&&(!Array.isArray(data.worldEvidence)||
        data.worldEvidence.length>12))){
      return NextResponse.json({ok:false,error:'INVALID_SEQUENCE_REQUEST'},{status:400});
    }
    if(JSON.stringify(body).length>8000)return NextResponse.json({ok:false,error:'INPUT_TOO_LARGE'},{status:413});
    const futureEvidence:CampaignEvidenceInput[]=Array.isArray(data.worldEvidence)
      ?data.worldEvidence.map(value=>{
        const row=rec(value);
        return {
          sourceUrl:String(row.sourceUrl??'').slice(0,500),
          sourceTitle:String(row.sourceTitle??'').slice(0,150),
          observedAt:typeof row.observedAt==='string'?row.observedAt:'',
          relevance:'UNKNOWN' as const,
          relevanceRationale:'User-declared dated event, not independently verified',
          observationKind:'DATED_FUTURE_EVENT' as const,
          eventDate:typeof row.eventDate==='string'?row.eventDate:null,
        };
      }):[];
    if(futureEvidence.some(entry=>!entry.sourceUrl.startsWith('https://')||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.eventDate??''))){
      return NextResponse.json({ok:false,error:'FUTURE_EVENT_SOURCE_INVALID'},{status:400});
    }
    const db=createServiceSupabaseClient();
    const session=await db.from('studio_sessions').select('id,title,metadata')
      .eq('id',sessionId).eq('owner_id',user.id).maybeSingle();
    if(session.error)return NextResponse.json({ok:false,error:'SESSION_READ_UNAVAILABLE'},{status:503});
    if(!session.data)return NextResponse.json({ok:false,error:'SESSION_NOT_OWNED'},{status:403});
    const objects=await db.from('studio_objects')
      .select('id,title,session_id,metadata,object_type,created_at,updated_at')
      .eq('session_id',sessionId).eq('owner_id',user.id).limit(120);
    if(objects.error)return NextResponse.json({ok:false,error:'OBJECTS_UNAVAILABLE'},{status:503});
    const graph=studioAttractorProjection((objects.data??[]) as Row[],[session.data as Row]);
    const musicObjects=(objects.data??[]).filter(x=>x.object_type==='music').map(o=>String(o.id));
    const acoustic=musicObjects.length?await db.from('studio_audio_features')
      .select('object_id,rms,created_at').in('object_id',musicObjects).eq('owner_id',user.id)
      .order('created_at',{ascending:false}).limit(350):null;
    if(acoustic?.error)return NextResponse.json({ok:false,error:'ACOUSTIC_READ_FAILED'},{status:503});
    const measurements=new Map<string,number>();
    for(const row of acoustic?.data??[]){
      const id=String(row.object_id);
      const rms=typeof row.rms==='number'?row.rms:NaN;
      if(!measurements.has(id)&&Number.isFinite(rms)&&rms>=0&&rms<=1){
        measurements.set(id,Number(rms.toFixed(6)));
      }
    }
    const unique=new Set<string>();
    const sequence:ReleaseSequenceItem[]=[];
    for(const [index,id] of (selectedNodeIds as string[]).entries()){
      const node=graph.nodes.find(n=>n.id===id&&n.kind!=='attractor');
      if(!node||unique.has(id))return NextResponse.json({ok:false,error:'NODE_NOT_IN_OWNED_SESSION'},{status:403});
      unique.add(id);
      const audioIds=node.sourceObjectId?[node.sourceObjectId]:
        graph.nodes.filter(n=>n.parentId===node.id&&n.sourceObjectId).map(n=>n.sourceObjectId!);
      const sources=audioIds.filter(x=>measurements.has(x));
      const energy=sources.length===1?measurements.get(sources[0])!:null;
      sequence.push({
        id,title:node.label,narrative:typeof node.passport.description==='string'?node.passport.description:null,
        originalOrder:index,
        acousticEnergyProxy:energy,
        proxySource:energy===null?'UNAVAILABLE':'RECORDED_STUDIO_FEATURE',
        priorReleaseDate:null,
      });
    }
    let proposed:ReturnType<typeof sequenceStudioReleases>;
    try{
      proposed=sequenceStudioReleases({
        items:sequence,earliestDate:data.earliestDate as string,
        spacingWeeks:data.spacingWeeks as number,
        scenarioId:data.scenarioId as 'DECLARED'|'NARRATIVE_DECLARED'|'ENERGY_RAMP'|'ENERGY_CONTRAST',
        narrativePrecedence:graph.edges.filter(edge=>edge.relation==='PRECEDES')
          .map(edge=>({from:edge.from,to:edge.to})),
        worldEvidence:futureEvidence,
      });
    }catch(error){
      return NextResponse.json({ok:false,error:error instanceof Error?error.message:'SEQUENCE_INVALID'},{status:400});
    }
    const archived=await db.from('studio_archive_events').insert({
      owner_id:user.id,session_id:sessionId,object_id:null,
      event_type:'STUDIO_RELEASE_SEQUENCE_PROPOSED',
      label:'Secuencia de lanzamientos · '+sequence.length+' obras',
      source:'studio_release_sequencer_v1',
      payload:{
        sequence:proposed,
        sourceNodeIds:sequence.map(item=>item.id),
        sourceFeatureIds:[...measurements.keys()],
        provenance:'OWNER_SCOPED_FIELD_AND_RECORDED_ACOUSTIC_DATA',
        publicationAuthorized:false,releaseScheduled:false,observedReturn:null,
      },
    }).select('id').maybeSingle();
    if(archived.error||!archived.data)return NextResponse.json({ok:false,error:'RELEASE_SEQUENCE_ARCHIVE_FAILED'},{status:503});
    const reread=await db.from('studio_archive_events').select('id,event_type')
      .eq('id',archived.data.id).eq('owner_id',user.id).eq('session_id',sessionId).maybeSingle();
    const persisted=Boolean(reread.data?.event_type==='STUDIO_RELEASE_SEQUENCE_PROPOSED'&&!reread.error);
    return NextResponse.json({
      ok:persisted,eventId:archived.data.id,persisted,
      sequence:proposed,authority:'PLAN_ONLY_NO_PUBLICATION',
      returnObserved:false,
    },{status:persisted?201:503,headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    if(error instanceof AccessDeniedError)return NextResponse.json({ok:false,error:error.code},{status:error.status});
    return NextResponse.json({ok:false,error:'RELEASE_SEQUENCE_UNAVAILABLE'},{status:503});
  }
}
