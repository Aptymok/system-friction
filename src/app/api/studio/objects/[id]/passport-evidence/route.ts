import { NextResponse } from 'next/server';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;

type Context={params:Promise<{id:string}>};
type Row=Record<string,unknown>;
const rec=(v:unknown):Row=>v && typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const string=(v:unknown)=>typeof v==='string'&&v.trim()?v:null;
function publicEvent(row:Row,type:string){
  const payload=rec(row.payload);
  // Only bounded textual and numeric fields. Never expose stored binaries,
  // raw private payloads, object paths, access tokens or unreviewed documents.
  return {
    id:string(row.id),type,at:string(row.created_at),
    label:string(row.label)??string(row.title)??string(row.statement)??string(row.status)??type,
    source:string(row.source)??string(row.origin)??type,
    status:string(row.status)??'RECORDED_NOT_VERIFIED',
    references:{
      hypothesisId:string(payload.hypothesisId)??string(rec(payload.related).hypothesisId),
      interventionId:string(payload.interventionId)??string(rec(payload.related).interventionId),
      evidenceId:string(payload.evidenceId),
    },
    sourceTable:type,
    contentBoundary:'SUMMARY_NOT_INDEPENDENTLY_VERIFIED',
  };
}
export async function GET(_request:Request,context:Context){
  const {id}=await context.params;
  try{
    const {user}=await requireObjectOwner(id);
    const db=createServiceSupabaseClient();
    const tables=[
      {name:'studio_evidence_traces',kind:'EVIDENCE'},
      {name:'studio_hypotheses',kind:'HYPOTHESIS'},
      {name:'studio_interventions',kind:'INTERVENTION'},
      {name:'studio_analysis_jobs',kind:'ANALYSIS_JOB'},
      {name:'studio_archive_events',kind:'ARCHIVE_EVENT'},
    ] as const;
    const results=await Promise.all(tables.map(async table=>{
      let query=db.from(table.name).select('*').eq('object_id',id)
        .order('created_at',{ascending:false}).limit(40);
      // Ownership is checked on studio_objects before every read;
      // this endpoint never queries unrelated objects or sessions.
      const result=await query;
      return {kind:table.kind,source:table.name,rows:result.data??[],error:result.error?.message??null};
    }));
    const failures=results.filter(result=>result.error).map(result=>({source:result.source,error:'SOURCE_READ_UNAVAILABLE'}));
    const events=results.flatMap(result=>
      (result.rows as unknown[]).filter((value):value is Row=>value!==null&&typeof value==='object'&&!Array.isArray(value))
        .map(row=>publicEvent(row,result.kind)))
      .sort((a,b)=>(b.at??'').localeCompare(a.at??'')).slice(0,150);
    return NextResponse.json({
      ok:failures.length===0,
      objectId:id,
      ownerScoped:true,
      observedAt:new Date().toISOString(),
      evidence:events,
      sourceStatus:failures.length?'PARTIAL':'READ',
      sourceFailures:failures,
      provenance:'PERSISTED_STUDIO_ROWS_SUMMARY',
      limits:['MAX_40_PER_SOURCE','NO_BINARY_SOURCE_EXPOSURE','RETURN_NOT_CERTIFIED_FROM_ROW_EXISTENCE',
        'NO_CROSS_PROVIDER_PARITY_CERTIFICATION'],
      rootAuthority:'NOT_GRANTED',
      canonicalPassportCertification:'NOT_PERFORMED',
    },{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    if(error instanceof AccessDeniedError){
      return NextResponse.json({ok:false,error:error.code},{status:error.status});
    }
    return NextResponse.json({ok:false,error:'PASSPORT_EVIDENCE_READ_UNAVAILABLE'},{status:503});
  }
}
