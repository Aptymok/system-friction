import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireRootActor, auditRootAction } from '@/lib/root/server';

export const dynamic='force-dynamic';
export const runtime='nodejs';

type Row=Record<string,unknown>;
const RELATIONS=new Set(['ORIGIN','OBSERVED_STATE','COPY','REMIX','MUTATION','PUBLICATION','RECOVERY','RETURN']);
function text(value:unknown){return typeof value==='string'&&value.trim()?value.trim():''}
function list(value:unknown){return Array.isArray(value)?value.map(item=>text(item)).filter(Boolean).slice(0,24):[]}
function validIso(value:string){const date=new Date(value);return Number.isFinite(date.getTime())?date.toISOString():new Date().toISOString()}

export async function POST(request:Request){
  const gate=await requireRootActor('root.operate.trajectory.write');
  if(!gate.ok)return NextResponse.json(gate.body,{status:gate.status});
  const body=await request.json().catch(()=>({})) as Row;
  const operatingCycleId=text(body.operatingCycleId);
  const objectRef=text(body.objectRef);
  const relationRaw=text(body.relation).toUpperCase();
  const relation=RELATIONS.has(relationRaw)?relationRaw:'OBSERVED_STATE';
  const evidenceRefs=list(body.evidenceRefs);
  if(!operatingCycleId||objectRef.length<2)return NextResponse.json({ok:false,error:'cycle_and_object_ref_required'},{status:400});

  const cycle=await gate.ctx.service.from('sfi_operating_cycles').select('id,evidence_refs,trajectory_refs').eq('id',operatingCycleId).eq('owner_id',gate.ctx.user.id).maybeSingle();
  if(cycle.error||!cycle.data)return NextResponse.json({ok:false,error:'operating_cycle_not_found',details:cycle.error?.message},{status:404});
  const refs=evidenceRefs.length?evidenceRefs:list(cycle.data.evidence_refs);
  if(!refs.length)return NextResponse.json({ok:false,error:'trajectory_event_requires_evidence_ref'},{status:400});

  const sourceUri=text(body.sourceUri)||null;
  const contentHash=text(body.contentHash)||null;
  const parentEventId=text(body.parentEventId)||null;
  const observedAt=validIso(text(body.observedAt));
  const platform=text(body.platform)||null;
  const markerRef=text(body.markerRef)||null;
  const semanticState=body.semanticState&&typeof body.semanticState==='object'&&!Array.isArray(body.semanticState)?body.semanticState:{};
  if(parentEventId){
    const parent=await gate.ctx.service.from('sfi_artifact_trajectory_events').select('id').eq('id',parentEventId).eq('owner_id',gate.ctx.user.id).maybeSingle();
    if(parent.error||!parent.data)return NextResponse.json({ok:false,error:'trajectory_parent_not_found',details:parent.error?.message},{status:404});
  }

  const eventEnvelope={operatingCycleId,objectRef,parentEventId,platform,sourceUri,observedAt,relation,contentHash,markerRef,evidenceRefs:refs,semanticState};
  const eventRecordHash=createHash('sha256').update(JSON.stringify(eventEnvelope)).digest('hex');
  const inserted=await gate.ctx.service.from('sfi_artifact_trajectory_events').upsert({
    operating_cycle_id:operatingCycleId,
    owner_id:gate.ctx.user.id,
    object_ref:objectRef,
    parent_event_id:parentEventId,
    platform,
    source_uri:sourceUri,
    observed_at:observedAt,
    relation,
    content_hash:contentHash,
    event_record_hash:eventRecordHash,
    marker_ref:markerRef,
    evidence_refs:refs,
    semantic_state:semanticState,
    payload:{
      artifactHashStatus:contentHash?'DECLARED_UPSTREAM_HASH':'MISSING',
      claimBoundary:'This event records a bounded artifact state/relation linked to evidence. event_record_hash identifies this record envelope; content_hash remains NULL unless a real artifact/content hash was supplied. This record does not prove propagation, semantic drift, identity persistence or causality by itself.',
    },
  },{onConflict:'event_record_hash'}).select('*').single();
  if(inserted.error||!inserted.data)return NextResponse.json({ok:false,error:'trajectory_event_persist_failed',details:inserted.error?.message},{status:503});

  const trajectoryRefs=Array.from(new Set([...list(cycle.data.trajectory_refs),String(inserted.data.id)]));
  await gate.ctx.service.from('sfi_operating_cycles').update({trajectory_refs:trajectoryRefs,updated_at:new Date().toISOString()}).eq('id',operatingCycleId).eq('owner_id',gate.ctx.user.id);
  const audit=await auditRootAction({actorId:gate.ctx.user.id,action:'operating_cycle.trajectory_event',target:String(inserted.data.id),payload:{operatingCycleId,objectRef,relation,evidenceRefs:refs,contentHash,eventRecordHash},request});
  return NextResponse.json({ok:true,event:inserted.data,audit},{status:201});
}