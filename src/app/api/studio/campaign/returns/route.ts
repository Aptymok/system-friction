import { NextResponse } from 'next/server';
import { AccessDeniedError, requireSfiMember } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  contrastCampaignObservations,type CampaignObserved,
} from '@/components/studio/localCampaignContrast';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
type Row=Record<string,unknown>;
const rec=(v:unknown):Row=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request:Request){
  try{
    const {user,profile}=await requireSfiMember();
    if(rec(profile.module_access).studio!==true){
      return NextResponse.json({ok:false,error:'STUDIO_ACCESS_REQUIRED'},{status:403});
    }
    const body=await request.json().catch(()=>null);
    const input=rec(body);
    const sessionId=input.sessionId,planId=input.planEventId;
    if(typeof sessionId!=='string'||!UUID.test(sessionId)||
      typeof planId!=='string'||!UUID.test(planId)||
      !Array.isArray(input.observations)||input.observations.length!==2){
      return NextResponse.json({ok:false,error:'INVALID_CONTRAST_INPUT'},{status:400});
    }
    if(JSON.stringify(body).length>12000)return NextResponse.json({ok:false,error:'INPUT_TOO_LARGE'},{status:413});
    const contrast=contrastCampaignObservations(input.observations as CampaignObserved[]);
    if(contrast.status!=='CONTRASTABLE')return NextResponse.json({
      ok:false,error:'CONTRAST_NOT_ADMISSIBLE',details:contrast.reason,
    },{status:400});
    const db=createServiceSupabaseClient();
    const source=await db.from('studio_archive_events').select('id,owner_id,session_id,payload')
      .eq('id',planId).eq('owner_id',user.id).eq('session_id',sessionId)
      .eq('event_type','STUDIO_CAMPAIGN_PLAN_PROPOSED').maybeSingle();
    if(source.error)return NextResponse.json({ok:false,error:'CAMPAIGN_ARCHIVE_READ_FAILED'},{status:503});
    if(!source.data)return NextResponse.json({ok:false,error:'CAMPAIGN_NOT_IN_OWNED_SESSION'},{status:403});
    const existingPlan=rec(rec(source.data.payload).plan);
    if(existingPlan.contract!=='SFI-STUDIO-CONTINUITY-CAMPAIGN-1.0'){
      return NextResponse.json({ok:false,error:'CAMPAIGN_PLAN_CONTRACT_INVALID'},{status:409});
    }
    const recorded=await db.from('studio_archive_events').insert({
      owner_id:user.id,session_id:sessionId,object_id:null,
      event_type:'STUDIO_CAMPAIGN_MANUAL_CONTRAST',
      label:'Contraste manual A/B · '+String(rec(existingPlan.anchor).title||'campaña').slice(0,90),
      source:'studio_campaign_contrast_readback_v1',
      payload:{
        planEventId:planId,
        phase:existingPlan.phase,
        t0:rec(existingPlan.timeWindow).start??null,
        t1:contrast.observations.map(o=>o.observedAt),
        comparator:'DESCRIPTIVE_SAVE_RATE_ONLY',
        contrast,
        provenance:'USER_ENTERED_PLATFORM_VALUES_AND_POST_URLS',
        platformMetricsIndependentlyVerified:false,
        causalEffectCertified:false,
        hypothesisWinnerCertified:false,
        learningIntegration:'PENDING_INDEPENDENT_REVIEW',
        publicationPerformedByThisAction:false,
      },
    }).select('id').maybeSingle();
    if(recorded.error||!recorded.data)return NextResponse.json({ok:false,error:'CONTRAST_WRITE_FAILED'},{status:503});
    const reread=await db.from('studio_archive_events').select('id,event_type')
      .eq('id',recorded.data.id).eq('owner_id',user.id).eq('session_id',sessionId).maybeSingle();
    const persisted=Boolean(!reread.error&&reread.data?.event_type==='STUDIO_CAMPAIGN_MANUAL_CONTRAST');
    return NextResponse.json({
      ok:persisted,eventId:recorded.data.id,persisted,contrast,
      claimBoundary:'MANUAL_VALUES_RECORDED_NOT_INDEPENDENTLY_AUTHENTICATED',
      hypothesisWinnerCertified:false,learningApplied:false,
    },{status:persisted?201:503,headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    if(error instanceof AccessDeniedError)return NextResponse.json({ok:false,error:error.code},{status:error.status});
    return NextResponse.json({ok:false,error:'CAMPAIGN_CONTRAST_UNAVAILABLE'},{status:503});
  }
}
