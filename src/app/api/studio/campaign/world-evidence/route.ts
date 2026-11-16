import { NextResponse } from 'next/server';
import { requireSfiMember, AccessDeniedError } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { getWorldVectorToday } from '@/lib/world-vector/readModel';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;

/** Read-only public-context observation. An article publication date is never
 * treated as a future event date or evidence of audience behavior.
 */
export async function GET() {
  try {
    const {profile}=await requireSfiMember();
    const access=profile.module_access && typeof profile.module_access==='object'
      ?profile.module_access as Record<string,unknown>:{};
    if(access.studio!==true)return NextResponse.json({ok:false,error:'STUDIO_ACCESS_REQUIRED'},{status:403});
    const db=createServiceSupabaseClient();
    const [world,sourceRead]=await Promise.all([
      getWorldVectorToday().then(result=>({ok:true as const,result})).catch(()=>({ok:false as const,result:null})),
      db.from('world_source_observations')
        .select('id,title,source_url,source_id,observed_at,released_at')
        .order('observed_at',{ascending:false}).limit(50),
    ]);
    const observations=sourceRead.error?[]:(sourceRead.data??[])
      .filter(item=>typeof item.source_url==='string'&&/^https:\/\//.test(item.source_url))
      .map(item=>({
        id:item.id,title:item.title,sourceUrl:item.source_url,sourceId:item.source_id,
        observedAt:item.observed_at,publishedAt:item.released_at,
        epistemicClass:'OBSERVED_SOURCE_METADATA_NOT_CLAIM_VERIFICATION' as const,
      }));
    return NextResponse.json({
      ok:true,
      retrievedAt:new Date().toISOString(),
      worldVector:world.ok?{
        cycleDay:world.result?.cycle_day,
        observation:world.result?.observation,
        readProvenance:world.result?.read_provenance,
      }:null,
      observations,
      sourceStatus:sourceRead.error?'SOURCE_UNAVAILABLE':observations.length?'OBSERVED_METADATA':'EMPTY',
      sourceTruncated:observations.length===50,
      warnings:[
        ...(world.ok?[]:['WORLD_VECTOR_READ_UNAVAILABLE']),
        ...(sourceRead.error?['WORLD_SOURCES_READ_UNAVAILABLE']:[]),
        'WORLD_NEWS_METADATA_IS_NOT_ARTIST_AUDIENCE_METRIC',
        'FUTURE_EVENT_DATES_NOT_VERIFIED_BY_THIS_FEED',
        'RELEASE_OPTIMUM_NOT_CALIBRATED',
      ],
      originalMediaTransmitted:false,persistence:'NO_WRITES',
    },{headers:{'Cache-Control':'private, no-store'}});
  } catch(error) {
    if(error instanceof AccessDeniedError)return NextResponse.json({ok:false,error:error.code},{status:error.status});
    return NextResponse.json({ok:false,error:'WORLD_CONTEXT_UNAVAILABLE'},{status:503});
  }
}
