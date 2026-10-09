import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { readOperationalCase, recordOperationalCaseObject } from '@/lib/sfi/case-platform/repository';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';

export const dynamic='force-dynamic';
export const runtime='nodejs';

const CONTRACT='SFI-CROSS-CASE-SOURCE-REFERENCE-1.0';
const requestSchema=z.object({referencedCaseId:z.string().uuid()}).strict();
type Context={params:Promise<{caseId:string}>};

export async function GET(_:Request,context:Context){
  try{
    const {user}=await requireAuthenticatedUser();
    const {caseId}=await context.params;
    const envelope=await readOperationalCase(caseId,user.id);
    const references=envelope.objects.filter(object=>object.kind==='RECORD'&&object.payload.contract===CONTRACT);
    return NextResponse.json({
      ok:true,contract:CONTRACT,caseId,references,
      boundary:'Cross-case references are SOURCE/RECORD lineage proposals, not admitted EVIDENCE or automatic institutional authority.',
    });
  }catch(error){return sfiCaseApiFailure(error);}
}

export async function POST(request:Request,context:Context){
  try{
    const {user}=await requireAuthenticatedUser();
    const {caseId}=await context.params;
    const {referencedCaseId}=requestSchema.parse(await request.json());
    if(caseId===referencedCaseId)return NextResponse.json({ok:false,error:'CASE_CANNOT_REFERENCE_ITSELF'},{status:400});

    // Both cases must be readable to the same authenticated identity.
    // Never allow the client to attach arbitrary outside-tenant case identities.
    const [target,source]=await Promise.all([
      readOperationalCase(caseId,user.id),
      readOperationalCase(referencedCaseId,user.id),
    ]);
    if(target.caseRecord.tenantId!==source.caseRecord.tenantId){
      return NextResponse.json({ok:false,error:'CROSS_TENANT_CASE_REFERENCE_FORBIDDEN'},{status:403});
    }

    if(target.objects.some(object=>object.kind==='RECORD'&&object.payload.contract===CONTRACT&&object.payload.referencedCaseId===referencedCaseId)){
      const recorded=target.objects.find(object=>object.kind==='RECORD'&&object.payload.contract===CONTRACT&&object.payload.referencedCaseId===referencedCaseId);
      return NextResponse.json({ok:true,reference:recorded,idempotent:true,contract:CONTRACT});
    }

    // The existing source graph is reused, bounded, and read-only for cycle checks.
    // A can contain B as a source, but B must not already depend on A.
    const service=createServiceSupabaseClient();
    const prior=await service.from('sfi_case_objects')
      .select('case_id,payload')
      .eq('tenant_id',target.caseRecord.tenantId)
      .eq('object_kind','RECORD')
      .contains('payload',{contract:CONTRACT})
      .limit(501);
    if(prior.error)throw new Error('CROSS_CASE_GRAPH_READ_FAILED:'+prior.error.message);
    const existing=prior.data??[];
    if(existing.length>=501)return NextResponse.json({ok:false,error:'CROSS_CASE_CYCLE_CHECK_UNBOUNDED'},{status:409});
    const adjacency=new Map<string,string[]>();
    for(const item of existing){
      const child=typeof item.payload?.referencedCaseId==='string'?item.payload.referencedCaseId:'';
      if(!child)continue;
      const id=String(item.case_id);
      adjacency.set(id,[...(adjacency.get(id)??[]),child]);
    }
    const queue=[referencedCaseId],visited=new Set<string>();
    while(queue.length){
      const current=queue.shift()!;
      if(current===caseId)return NextResponse.json({ok:false,error:'CROSS_CASE_REFERENCE_CYCLE_FORBIDDEN'},{status:409});
      if(visited.has(current))continue;
      visited.add(current);
      if(visited.size>500)return NextResponse.json({ok:false,error:'CROSS_CASE_CYCLE_CHECK_UNBOUNDED'},{status:409});
      queue.push(...(adjacency.get(current)??[]));
    }

    const reference=await recordOperationalCaseObject({
      caseId,userId:user.id,kind:'RECORD',epistemicRole:'RECORD',
      canonicalRef:{id:'case-reference:'+referencedCaseId,version:null,hash:null},
      sourceRefs:[],recordRefs:[],evidenceRefs:[],
      payload:{
        contract:CONTRACT,
        referencedCaseId,
        relation:'REFERENCES_CASE_AS_SOURCE',
        referencedCaseSubject:source.caseRecord.subject,
        referenceKind:'CASE_CHAIN',
        evidenceQualification:'NOT_ESTABLISHED',
        authorizationScope:'SAME_TENANT_BOTH_CASES_READABLE',
        epistemicBoundary:'CASE_REFERENCE_IS_NOT_EVIDENCE',
      },
    });

    // Read-after-write is required; a response to the writer alone is not sufficient.
    const readback=await readOperationalCase(caseId,user.id);
    if(!readback.objects.some(item=>item.id===reference.id)){
      return NextResponse.json({ok:false,error:'CROSS_CASE_REFERENCE_READBACK_UNCONFIRMED'},{status:503});
    }

    return NextResponse.json({
      ok:true,contract:CONTRACT,caseId,reference,readbackVerified:true,
      next:'Qualify specific supported claims, source independence, captured-at and known-at times through existing evidence governance before admitting EVIDENCE.',
      authority:'CASE_WRITE_SCOPE_ONLY; NO_CANONICAL_PROMOTION',
    },{status:201});
  }catch(error){return sfiCaseApiFailure(error);}
}
