import { NextResponse } from 'next/server';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { extractStudioGovernedReferences } from '@/lib/studio/passport/governedReferenceProjection';
import { readOperationalRealityChain } from '@/lib/sfi/case-platform/repository';
import { readAgentPassports } from '@/lib/sfi/cognitive-runtime/agentPassports';
import { requireRootViewer } from '@/lib/root/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=45;
type Context={params:Promise<{id:string}>};
type Row=Record<string,unknown>;
const rec=(value:unknown):Row=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Row:{};
const text=(value:unknown)=>typeof value==='string'&&value.trim()?value.trim():null;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AGENT=/^[a-zA-Z0-9][a-zA-Z0-9:_./-]{0,119}$/;

export async function POST(request:Request,ctx:Context){
  const {id}=await ctx.params;
  try{
    const {user}=await requireObjectOwner(id);
    const body=await request.json().catch(()=>null) as Row|null;
    if(!body||typeof body!=='object'||Array.isArray(body)){
      return NextResponse.json({ok:false,error:'INVALID_REQUEST'},{status:400});
    }
    const caseId=text(body.caseId);
    const agentId=text(body.agentId);
    const rootAuditId=text(body.rootAuditId);
    if(!caseId&&!agentId&&!rootAuditId){
      return NextResponse.json({ok:false,error:'REFERENCE_REQUIRED'},{status:400});
    }
    if((caseId&&!UUID.test(caseId))||(agentId&&!AGENT.test(agentId))||
      (rootAuditId&&!UUID.test(rootAuditId))){
      return NextResponse.json({ok:false,error:'REFERENCE_FORMAT_INVALID'},{status:400});
    }
    const db=createServiceSupabaseClient();
    const existing=await db.from('studio_objects').select('id,owner_id,updated_at,metadata')
      .eq('id',id).eq('owner_id',user.id).maybeSingle();
    if(existing.error)return NextResponse.json({ok:false,error:'STUDIO_OBJECT_READ_FAILED'},{status:503});
    if(!existing.data)return NextResponse.json({ok:false,error:'OWNER_REQUIRED'},{status:403});

    // A valid identifier is not authorization. Verify each governed source
    // through its own established access contract before writing its reference.
    if(caseId){
      try{await readOperationalRealityChain(caseId,user.id);}
      catch{return NextResponse.json({ok:false,error:'CASE_NOT_AUTHORIZED_OR_UNAVAILABLE'},{status:403});}
    }
    if(agentId){
      try{
        const agents=await readAgentPassports();
        if(!agents.passports.some(agent=>agent.id===agentId)){
          return NextResponse.json({ok:false,error:'AGENT_NOT_FOUND_IN_REGISTRY'},{status:404});
        }
      }catch{return NextResponse.json({ok:false,error:'AGENT_REGISTRY_UNAVAILABLE'},{status:503});}
    }
    if(rootAuditId){
      const gate=await requireRootViewer('studio.passport.root.read');
      if(!gate.ok||gate.ctx.user.id!==user.id){
        return NextResponse.json({ok:false,error:'ROOT_OBSERVER_AUTHORITY_REQUIRED'},{status:403});
      }
      const receipt=await db.from('root_audit_events').select('id').eq('id',rootAuditId).maybeSingle();
      if(receipt.error)return NextResponse.json({ok:false,error:'ROOT_AUDIT_READ_FAILED'},{status:503});
      if(!receipt.data)return NextResponse.json({ok:false,error:'ROOT_AUDIT_NOT_FOUND'},{status:404});
    }

    const metadata=rec(existing.data.metadata);
    const previous=extractStudioGovernedReferences(metadata);
    const revised={
      ...rec(metadata.governedRefs),
      caseIds:[...new Set([...previous.caseIds,...(caseId?[caseId]:[])])].slice(0,6),
      agentIds:[...new Set([...previous.agentIds,...(agentId?[agentId]:[])])].slice(0,12),
      rootReceiptRefs:[...new Set([...previous.rootReceiptRefs,...(rootAuditId?[rootAuditId]:[])])].slice(0,12),
    };
    const nextMetadata={...metadata,governedRefs:revised};
    let update=db.from('studio_objects').update({metadata:nextMetadata})
      .eq('id',id).eq('owner_id',user.id);
    if(existing.data.updated_at)update=update.eq('updated_at',existing.data.updated_at);
    const changed=await update.select('id,owner_id,metadata').maybeSingle();
    if(changed.error)return NextResponse.json({ok:false,error:'GOVERNED_REF_WRITE_FAILED'},{status:503});
    if(!changed.data)return NextResponse.json({ok:false,error:'OBJECT_CHANGED_DURING_REFERENCE_WRITE'},{status:409});
    const verified=extractStudioGovernedReferences(changed.data.metadata);
    const persisted=(!caseId||verified.caseIds.includes(caseId))&&
      (!agentId||verified.agentIds.includes(agentId))&&
      (!rootAuditId||verified.rootReceiptRefs.includes(rootAuditId));
    if(!persisted)return NextResponse.json({ok:false,error:'REFERENCE_PERSISTENCE_UNVERIFIED'},{status:503});
    return NextResponse.json({
      ok:true,objectId:id,links:verified,
      persisted:true,
      operation:'EXPLICIT_REFERENCE_ASSOCIATION_ONLY',
      authorityGranted:false,caseClosed:false,returnRecorded:false,
      certifiedCrossSurfaceClosure:false,
    },{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    if(error instanceof AccessDeniedError){
      return NextResponse.json({ok:false,error:error.code},{status:error.status});
    }
    return NextResponse.json({ok:false,error:'GOVERNED_REF_OPERATION_UNAVAILABLE'},{status:503});
  }
}
