import { NextResponse } from 'next/server';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { extractStudioGovernedReferences } from '@/lib/studio/passport/governedReferenceProjection';
import { readOperationalRealityChain } from '@/lib/sfi/case-platform/repository';
import { readAgentPassports } from '@/lib/sfi/cognitive-runtime/agentPassports';
import { requireRootViewer } from '@/lib/root/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;

type Context={params:Promise<{id:string}>};
type Row=Record<string,unknown>;
const rec=(v:unknown):Row=>v && typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const string=(v:unknown)=>typeof v==='string'&&v.trim()?v:null;
function bounded(value:unknown,max=1200):string|null{
  const result=string(value);
  return result?result.slice(0,max):null;
}
function publicEvent(row:Row,type:string){
  const payload=rec(row.payload);
  const details=type==='HYPOTHESIS'
    ?bounded(row.statement,1600)
    :type==='INTERVENTION'
      ?bounded(payload.operatorNote,1200)??bounded(row.scope,180)
      :type==='EVIDENCE'
        ?bounded(payload.text,1600)??bounded(payload.url,900)
        :type==='ANALYSIS_JOB'
          ?bounded(row.reason,800)??bounded(payload.engine,120)
          :bounded(row.label,800);
  const measurement=rec(payload.measurement);
  const observedValue=measurement.value;
  const numeric=typeof observedValue==='number'&&Number.isFinite(observedValue);
  return {
    id:string(row.id),type,at:string(row.created_at),
    label:string(row.label)??string(row.title)??string(row.statement)??string(row.status)??type,
    source:string(row.source)??string(row.origin)??type,
    status:string(row.state)??string(row.status)??'RECORDED_NOT_VERIFIED',
    details,
    measurement:type==='EVIDENCE'&&
      (numeric||(typeof observedValue==='string'&&observedValue.length<200))
        ?{variable:bounded(measurement.variable,100),value:observedValue,unit:bounded(measurement.unit,40)}
        :null,
    references:{
      hypothesisId:string(row.hypothesis_id)??string(payload.hypothesisId)??string(rec(payload.related).hypothesisId),
      interventionId:string(payload.interventionId)??string(rec(payload.related).interventionId),
      evidenceId:string(payload.evidenceId),
    },
    sourceTable:type,
    contentBoundary:'ROW_CONTENT_NOT_INDEPENDENTLY_VERIFIED',
  };
}
export async function GET(_request:Request,context:Context){
  const {id}=await context.params;
  try{
    const {user}=await requireObjectOwner(id);
    const db=createServiceSupabaseClient();
    const objectRead=await db.from('studio_objects').select('id,metadata').eq('id',id)
      .eq('owner_id',user.id).maybeSingle();
    if(objectRead.error)return NextResponse.json({ok:false,error:'STUDIO_OBJECT_REFERENCE_READ_FAILED'},{status:503});
    if(!objectRead.data)return NextResponse.json({ok:false,error:'STUDIO_OBJECT_NOT_FOUND'},{status:404});
    const declaredRefs=extractStudioGovernedReferences(objectRead.data.metadata);
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
    // Case reads are delegated to the existing tenant-scoped Case Platform
    // authority. A Studio object owner is NOT automatically a Case tenant member.
    const cases=await Promise.all(declaredRefs.caseIds.slice(0,2).map(async caseId=>{
      try{
        const read=await readOperationalRealityChain(caseId,user.id);
        const chain=read.realityChain;
        return {
          caseId,readStatus:'AUTHORIZED_CASE_READ' as const,
          inputHash:chain.inputHash,
          gaps:Array.isArray(chain.gaps)?chain.gaps.slice(0,40):[],
          nextObservation:chain.nextObservation??null,
          temporal:chain.temporal??null,
          closureCertified:false,
          boundary:'CASE_PROJECTION_NOT_CROSS_PROVIDER_CERTIFIED',
          provenance:'CASE_PLATFORM_TENANT_SCOPED_RECONSTRUCTION',
        };
      }catch{
        return {
          caseId,readStatus:'NOT_AUTHORIZED_OR_UNAVAILABLE' as const,
          inputHash:null,gaps:[],nextObservation:null,temporal:null,
          closureCertified:false,
          boundary:'NO_CASE_INFORMATION_EXPOSED_UNLESS_AUTHORIZED',
          provenance:'CASE_READ_NOT_COMPLETED',
        };
      }
    }));
    // An agent registry entry proves identity/capability, not execution of
    // this particular Studio object. Only explicit persisted IDs are joined.
    let agents:Array<Record<string,unknown>>=[];
    let agentReadStatus='NO_EXPLICIT_AGENT_REF';
    if(declaredRefs.agentIds.length){
      try{
        const registry=await readAgentPassports();
        agents=declaredRefs.agentIds.flatMap(agentId=>{
          const entry=registry.passports.find(agent=>agent.id===agentId);
          return entry?[{
            id:entry.id,name:entry.name,lifecycle:entry.lifecycle,
            executorBound:entry.executorBound,latestExecutionAt:entry.latestExecutionAt,
            executionEvidenceRefs:entry.executionEvidence.slice(0,20),
            observedForThisStudioObject:false,
            epistemicBoundary:'AGENT_REGISTRY_NOT_OBJECT_EXECUTION_PROOF',
          }]:[];
        });
        agentReadStatus='REGISTRY_READ_NOT_OBJECT_ATTRIBUTION';
      }catch{agentReadStatus='AGENT_REGISTRY_UNAVAILABLE';}
    }
    const rootAuditRefs=declaredRefs.rootReceiptRefs.filter(ref=>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref));
    let rootReadStatus='NO_EXPLICIT_ROOT_REF';
    let rootAuditRecords:Array<{id:string;at:string|null;action:string|null;target:string|null}>=[];
    if(declaredRefs.rootReceiptRefs.length>0){
      // The ROOT authorization gate has its own independently verified identity.
      // Reject mixed auth contexts to prevent confused-deputy disclosure.
      const rootGate=await requireRootViewer('studio.passport.root.read');
      if(!rootGate.ok || rootGate.ctx.user?.id!==user.id){
        rootReadStatus='BLOCKED_ROOT_AUTHORITY_NOT_GRANTED';
      } else if(!rootAuditRefs.length){
        rootReadStatus='DECLARED_REFS_NOT_ROOT_AUDIT_UUIDS';
      } else {
        try{
          const rootRows=await db.from('root_audit_events')
            .select('id,action,target,created_at')
            .in('id',rootAuditRefs).limit(12);
          if(rootRows.error)rootReadStatus='ROOT_AUDIT_READ_UNAVAILABLE';
          else {
            rootAuditRecords=(rootRows.data??[]).map(row=>({
              id:String(row.id),at:string(row.created_at),
              action:string(row.action),target:string(row.target),
            }));
            rootReadStatus='ROOT_AUDIT_RECORDS_READ_NOT_EXECUTION_CERTIFICATION';
          }
        }catch{rootReadStatus='ROOT_AUDIT_READ_UNAVAILABLE';}
      }
    }
    return NextResponse.json({
      ok:failures.length===0,
      governedLinks:{
        declaredReferences:declaredRefs,
        cases,agents,agentReadStatus,
        root:{
          declaredReceiptRefs:declaredRefs.rootReceiptRefs,
          observedAuditRecords:rootAuditRecords,
          validatedReceipts:[],
          readStatus:rootReadStatus,
          warning:'ROOT audit rows are persisted records, not execution, approval or RETURN certificates. A separate ROOT permission is mandatory.',
        },
        certifiedCrossSurfaceClosure:false,
      },
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
