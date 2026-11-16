import { NextResponse } from 'next/server';
import { requireSfiMember, AccessDeniedError } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { studioAttractorProjection } from '@/components/studio/studioAttractorProjection';
import {
  planStudioContinuityCampaign,
  type CampaignConstraints,
} from '@/components/studio/localNarrativeCampaignPlanner';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;

type Row=Record<string,unknown>;
const row=(v:unknown):Row=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():null;

async function member(){
  const {user,profile}=await requireSfiMember();
  const access=row(profile.module_access);
  if(access.studio!==true)throw new AccessDeniedError(403,'SFI_MEMBER_REQUIRED','Studio access required.');
  return user;
}

/** Plans are stored in the existing Studio archive, not a new campaign table.
 * This records a proposed plan only, never executes publication or payment.
 */
export async function POST(request:Request) {
  try {
    const user=await member();
    const body=await request.json().catch(()=>null);
    const input=row(body);
    const sessionId=text(input.sessionId);
    if(!sessionId||!UUID.test(sessionId))return NextResponse.json({ok:false,error:'INVALID_SESSION'},{status:400});
    const constraints=row(input.constraints);
    if(typeof constraints.anchorId!=='string'||constraints.anchorId.length>250||
      typeof constraints.startDate!=='string'||constraints.startDate.length>10||
      !Array.isArray(constraints.channels)||!Array.isArray(constraints.assetFormats)||
      (constraints.releaseCandidates!==undefined&&!Array.isArray(constraints.releaseCandidates))||
      (constraints.externalObservations!==undefined&&!Array.isArray(constraints.externalObservations))){
      return NextResponse.json({ok:false,error:'INVALID_CAMPAIGN_CONSTRAINTS'},{status:400});
    }
    // Avoid oversized payloads and mutation through unbounded untrusted input.
    if(JSON.stringify(input).length>28000)return NextResponse.json({ok:false,error:'CAMPAIGN_INPUT_TOO_LARGE'},{status:413});
    const db=createServiceSupabaseClient();
    const session=await db.from('studio_sessions').select('id,title,metadata')
      .eq('id',sessionId).eq('owner_id',user.id).maybeSingle();
    if(session.error)return NextResponse.json({ok:false,error:'STUDIO_SESSION_READ_UNAVAILABLE'},{status:503});
    if(!session.data)return NextResponse.json({ok:false,error:'STUDIO_SESSION_NOT_OWNED'},{status:403});
    const owned=await db.from('studio_objects')
      .select('id,session_id,title,metadata,object_type,created_at,updated_at')
      .eq('owner_id',user.id).eq('session_id',sessionId).limit(120);
    if(owned.error)return NextResponse.json({ok:false,error:'STUDIO_OBJECTS_READ_UNAVAILABLE'},{status:503});
    const graph=studioAttractorProjection((owned.data??[]) as Row[],[session.data as Row]);
    let plan:ReturnType<typeof planStudioContinuityCampaign>;
    try{plan=planStudioContinuityCampaign(graph,constraints as unknown as CampaignConstraints);}
    catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:'INVALID_PLAN'},{status:400});}
    const direct=graph.nodes.find(node=>node.id===plan.anchor.id);
    const attached=direct?.sourceObjectId?[direct.sourceObjectId]:
      graph.nodes.filter(node=>node.parentId===plan.anchor.id&&node.sourceObjectId)
        .map(node=>node.sourceObjectId!);
    // Bind archive events to an object only when that relationship is unambiguous.
    const linkedObjectId=attached.length===1?attached[0]:null;
    const archived=await db.from('studio_archive_events').insert({
      owner_id:user.id,session_id:sessionId,object_id:linkedObjectId,
      event_type:'STUDIO_CAMPAIGN_PLAN_PROPOSED',
      label:'Propuesta de campaña · '+plan.anchor.title.slice(0,90),
      source:'studio_continuity_campaign_v1',
      payload:{plan,
        fieldAnchorId:plan.anchor.id,
        linkedObjectId,
        producer:'DETERMINISTIC_CAMPAIGN_PLANNER',
        status:'PROPOSED_NOT_EXECUTED',
        authorityGranted:false,
        returnObserved:false,
        originalMediaStored:false,
      },
    }).select('id,created_at').maybeSingle();
    if(archived.error||!archived.data)return NextResponse.json({ok:false,error:'CAMPAIGN_PLAN_ARCHIVE_FAILED'},{status:503});
    // Distinguish archived insert response from independently observable state.
    const check=await db.from('studio_archive_events')
      .select('id,event_type,owner_id,session_id')
      .eq('id',archived.data.id).eq('owner_id',user.id).eq('session_id',sessionId).maybeSingle();
    const persisted=Boolean(check.data&&check.data.event_type==='STUDIO_CAMPAIGN_PLAN_PROPOSED'&&!check.error);
    return NextResponse.json({
      ok:persisted,sessionId,plan,
      archivedEventId:String(archived.data.id),
      archiveReadback:persisted?'VERIFIED_PERSISTED':'UNVERIFIED',
      publicationExecuted:false,returnObserved:false,
    },{status:persisted?201:503,headers:{'Cache-Control':'private, no-store'}});
  }catch(error) {
    if(error instanceof AccessDeniedError)return NextResponse.json({ok:false,error:error.code},{status:error.status});
    return NextResponse.json({ok:false,error:'CAMPAIGN_PLAN_OPERATION_UNAVAILABLE'},{status:503});
  }
}
export async function GET(request:Request) {
  try {
    const user=await member();
    const sessionId=new URL(request.url).searchParams.get('sessionId');
    if(!sessionId||!UUID.test(sessionId))return NextResponse.json({ok:false,error:'INVALID_SESSION'},{status:400});
    const db=createServiceSupabaseClient();
    const session=await db.from('studio_sessions').select('id')
      .eq('id',sessionId).eq('owner_id',user.id).maybeSingle();
    if(session.error)return NextResponse.json({ok:false,error:'STUDIO_SESSION_READ_UNAVAILABLE'},{status:503});
    if(!session.data)return NextResponse.json({ok:false,error:'STUDIO_SESSION_NOT_OWNED'},{status:403});
    const result=await db.from('studio_archive_events').select('id,created_at,payload')
      .eq('session_id',sessionId).eq('owner_id',user.id)
      .eq('event_type','STUDIO_CAMPAIGN_PLAN_PROPOSED')
      .order('created_at',{ascending:false}).limit(15);
    if(result.error)return NextResponse.json({ok:false,error:'CAMPAIGN_HISTORY_READ_UNAVAILABLE'},{status:503});
    return NextResponse.json({
      ok:true,sessionId,
      plans:(result.data??[]).map(item=>({
        id:item.id,createdAt:item.created_at,
        plan:row(item.payload).plan??null,
        status:'PROPOSED_NOT_EXECUTED',
      })),
      truncated:(result.data??[]).length===15,
      authority:'READ_ONLY',
    },{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    if(error instanceof AccessDeniedError)return NextResponse.json({ok:false,error:error.code},{status:error.status});
    return NextResponse.json({ok:false,error:'CAMPAIGN_HISTORY_UNAVAILABLE'},{status:503});
  }
}
