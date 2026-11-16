import { NextResponse } from 'next/server';
import { AccessDeniedError, requireSfiMember } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Row=Record<string,unknown>;
const rec=(x:unknown):Row=>x!==null&&typeof x==='object'&&!Array.isArray(x)?x as Row:{};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean=(v:unknown,max:number)=>typeof v==='string'&&v.trim()&&v.trim().length<=max?v.trim():null;

/** User-governed editorial learning after observed manual campaign contrast.
 * Recording a decision does not prove causal attribution or applied changes.
 */
export async function POST(request:Request){
  try{
    const {user,profile}=await requireSfiMember();
    if(rec(profile.module_access).studio!==true)return NextResponse.json({
      ok:false,error:'STUDIO_ACCESS_REQUIRED',
    },{status:403});
    const body=rec(await request.json().catch(()=>null));
    const sessionId=clean(body.sessionId,80),contrastEventId=clean(body.contrastEventId,80);
    const disposition=clean(body.disposition,20),rationale=clean(body.rationale,1800);
    const proposedChange=clean(body.proposedChange,1800);
    if(!sessionId||!UUID.test(sessionId)||!contrastEventId||!UUID.test(contrastEventId)||
      !['A_DESCRIPTIVELY_HIGHER','B_DESCRIPTIVELY_HIGHER','INCONCLUSIVE'].includes(disposition??'')||
      !rationale||rationale.length<30||!proposedChange||proposedChange.length<20){
      return NextResponse.json({ok:false,error:'LEARNING_DECISION_INPUT_INVALID'},{status:400});
    }
    const db=createServiceSupabaseClient();
    const contrast=await db.from('studio_archive_events')
      .select('id,object_id,session_id,owner_id,payload,created_at')
      .eq('id',contrastEventId).eq('owner_id',user.id).eq('session_id',sessionId)
      .eq('event_type','STUDIO_CAMPAIGN_MANUAL_CONTRAST').maybeSingle();
    if(contrast.error)return NextResponse.json({ok:false,error:'CONTRAST_READ_UNAVAILABLE'},{status:503});
    if(!contrast.data)return NextResponse.json({ok:false,error:'CONTRAST_NOT_IN_AUTHORIZED_SESSION'},{status:403});
    const observed=rec(rec(contrast.data.payload).contrast);
    if(observed.status!=='CONTRASTABLE')return NextResponse.json({
      ok:false,error:'CONTRAST_NOT_ADMISSIBLE',
    },{status:409});
    const observedDirection=String(observed.relativeOutcome??'');
    if((disposition==='A_DESCRIPTIVELY_HIGHER'&&observedDirection!=='A_HIGHER_OBSERVED')||
      (disposition==='B_DESCRIPTIVELY_HIGHER'&&observedDirection!=='B_HIGHER_OBSERVED')){
      return NextResponse.json({ok:false,error:'EDITORIAL_DISPOSITION_CONTRADICTS_OBSERVED_RATES'},{status:409});
    }
    const previous=await db.from('studio_archive_events')
      .select('id').eq('owner_id',user.id).eq('session_id',sessionId)
      .eq('event_type','STUDIO_CAMPAIGN_LEARNING_DECLARED')
      .eq('payload->>contrastEventId',contrastEventId).limit(1);
    if(previous.error)return NextResponse.json({ok:false,error:'LEARNING_HISTORY_READ_UNAVAILABLE'},{status:503});
    if((previous.data??[]).length>0)return NextResponse.json({
      ok:false,error:'LEARNING_DECISION_ALREADY_RECORDED',
      reason:'Historical decisions are append-only. Review the prior decision instead of overwriting it.',
    },{status:409});
    const inserted=await db.from('studio_archive_events').insert({
      owner_id:user.id,session_id:sessionId,object_id:contrast.data.object_id??null,
      event_type:'STUDIO_CAMPAIGN_LEARNING_DECLARED',
      label:'Decisión editorial tras contraste A/B',
      source:'studio_campaign_learning_v1',
      payload:{
        contrastEventId,planEventId:rec(contrast.data.payload).planEventId??null,
        fieldAnchorId:rec(contrast.data.payload).fieldAnchorId??null,
        disposition,rationale,proposedChange,
        actorId:user.id,decidedAt:new Date().toISOString(),
        status:'OPERATOR_DECISION_DECLARED',
        causalEvidence:'NOT_ESTABLISHED',
        hypothesisWinnerCertified:false,
        modificationActuallyApplied:false,
        nextAction:'PROPOSE_REVISED_CAMPAIGN_REFERENCING_THIS_DECISION',
        sourceRates:observed.rates??[],
      },
    }).select('id').maybeSingle();
    if(inserted.error||!inserted.data)return NextResponse.json({
      ok:false,error:'LEARNING_EVENT_WRITE_FAILED',
    },{status:503});
    const reread=await db.from('studio_archive_events').select('id,event_type,owner_id,session_id')
      .eq('id',inserted.data.id).eq('owner_id',user.id).eq('session_id',sessionId).maybeSingle();
    const persisted=Boolean(!reread.error&&reread.data?.event_type==='STUDIO_CAMPAIGN_LEARNING_DECLARED');
    return NextResponse.json({
      ok:persisted,persisted,learningEventId:inserted.data.id,
      editorialDecision:true,
      scientificWinnerCertified:false,
      operationalChangeApplied:false,
    },{status:persisted?201:503,headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    if(error instanceof AccessDeniedError)return NextResponse.json({ok:false,error:error.code},{status:error.status});
    return NextResponse.json({ok:false,error:'LEARNING_DECISION_UNAVAILABLE'},{status:503});
  }
}
