import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readOperationalCase, assertTenantAccess } from '@/lib/sfi/case-platform/repository';
import { validateMissionDispatchRequest } from './missionDispatch';
import { canonicalQueuedRequestDigest } from './queuedMissionWorker';
import { checkC07CaseQueueState } from './queuedMissionCaseGate';

type Row = Record<string, unknown>;
function text(v:unknown,max=160) {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0,max) : null;
}
export type QueuedMissionIntakeResponse = {status:number;body:Row};

/**
 * C09 read-only operator projection. The actor filter is mandatory; no
 * service-role result from another owner or tenant is ever returned.
 * A count of jobs must never be mistaken for execution or external RETURN.
 */
export async function readOwnedC07MissionSummary(actorId:string) {
  if (process.env.SFI_C07_MISSION_QUEUE_ENABLED !== 'true') {
    return { available:false, state:'QUEUE_DISABLED', jobs:[], counts:{}, boundary:'NO_QUEUE_EXECUTION_OR_RETURN_ASSERTED' };
  }
  const result=await createServiceSupabaseClient().from('sfi_c07_mission_jobs')
    .select('id,mission_id,execution_id,status,attempts,max_attempts,receipt_event_id,updated_at,return_observation')
    .eq('actor_id',actorId).order('updated_at',{ascending:false}).limit(20);
  if (result.error) {
    return {available:false,state:'READ_UNAVAILABLE',jobs:[],counts:{},
      boundary:'NO_QUEUE_EXECUTION_OR_RETURN_ASSERTED'};
  }
  const jobs=result.data??[];
  const counts=jobs.reduce<Record<string,number>>((acc,item)=>{
    const status=typeof item.status==='string'?item.status:'UNKNOWN';
    acc[status]=(acc[status]??0)+1;
    return acc;
  },{});
  return {available:true,state:'OBSERVED_OWNER_JOBS_LIMIT_20',jobs,counts,
    truncated:jobs.length===20,
    boundary:'OWNER_SCOPED_SNAPSHOT_NOT_COMPLETE_QUEUE_OR_EXTERNAL_RETURN'};
}

export async function readOwnedC07Mission(jobId:string,actorId:string):Promise<QueuedMissionIntakeResponse> {
  if (process.env.SFI_C07_MISSION_QUEUE_ENABLED !== 'true') {
    return {status:409,body:{ok:false,error:'queue_not_released'}};
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId)) {
    return {status:400,body:{ok:false,error:'job_id_invalid'}};
  }
  const status=await createServiceSupabaseClient().from('sfi_c07_mission_jobs')
    .select('id,mission_id,execution_id,status,attempts,max_attempts,receipt_event_id,last_error_code,updated_at,return_observation')
    .eq('id',jobId).eq('actor_id',actorId).maybeSingle();
  if (status.error) return {status:503,body:{ok:false,error:'queue_status_unavailable'}};
  if (!status.data) return {status:404,body:{ok:false,error:'queue_job_not_found'}};
  return {status:200,body:{ok:true,job:status.data,boundary:'A queued job is not a verified execution or observed external RETURN.'}};
}

export async function enqueueAuthorizedC07Mission(value:Row,actorId:string):Promise<QueuedMissionIntakeResponse> {
  if (process.env.SFI_C07_MISSION_QUEUE_ENABLED !== 'true') {
    return {status:409,body:{ok:false,error:'queue_not_released',instruction:'No production migration or release was authorized.'}};
  }
  const mission=validateMissionDispatchRequest(value);
  if (!mission.ok) return {status:mission.status,body:{ok:false,error:mission.error}};
  if (mission.mission.humanApprovalRequired) return {status:403,body:{ok:false,error:'reserved_human_approval_required'}};
  const targets=Array.isArray(value.targets)?value.targets as Row[]:[];
  const anchors=Array.isArray(value.anchors)?value.anchors as Row[]:[];
  const key=text(value.idempotencyKey,160);
  if (!key || key.length<8 || targets.length!==1 || targets[0].kind!=='CASE'
    || !text(targets[0].id) || !anchors.length
    || anchors.some(a=>a.kind!=='CASE'||a.id!==targets[0].id)
    || (Array.isArray(value.sourceUrls)&&value.sourceUrls.length)
    || (Array.isArray(value.evidenceIds)&&value.evidenceIds.length)) {
    return {status:400,body:{ok:false,error:'queue_requires_single_case_read_only_request'}};
  }
  // Canary releases fail closed outside the one authorized case.
  const canaryCase = process.env.SFI_C07_CANARY_CASE_ID;
  if (!canaryCase || String(targets[0].id) !== canaryCase) {
    return {status:403,body:{ok:false,error:'case_outside_authorized_canary'}};
  }
  const caseRecord=await readOperationalCase(String(targets[0].id),actorId).catch(()=>null);
  if (!caseRecord) {
    return {status:403,body:{ok:false,error:'case_not_authorized'}};
  }
  // Case Platform READ permission is insufficient to order autonomous work.
  const writeRole=await assertTenantAccess(caseRecord.caseRecord.tenantId,actorId,'WRITE').catch(()=>null);
  if (!writeRole) return {status:403,body:{ok:false,error:'case_write_authority_required'}};
  const eligible = checkC07CaseQueueState({
    status:caseRecord.caseRecord.status,
    updatedAt:caseRecord.caseRecord.updatedAt,
    deletedAt:null,
  });
  if (!eligible.ok) {
    return {status:409,body:{ok:false,error:eligible.reason}};
  }
  const permittedKeys=['agentId','missionId','purpose','anchors','targets','timeRange','direction','parameters','requestedOutputs','governanceContext'];
  const payload={ ...Object.fromEntries(permittedKeys.filter(k=>value[k]!==undefined).map(k=>[k,value[k]])),
    caseRevision:eligible.revision };
  const receipt=await createServiceSupabaseClient().rpc('sfi_c07_enqueue_mission_v1',{
    p_tenant_id:caseRecord.caseRecord.tenantId,
    p_actor_id:actorId,p_mission_id:mission.mission.missionId,
    p_agent_id:mission.mission.agentId,p_idempotency_key:key,
    p_request_digest:canonicalQueuedRequestDigest(payload),
    p_request_payload:payload,p_max_attempts:2,
  });
  if (receipt.error || !receipt.data) {
    return {status:503,body:{ok:false,error:'queue_write_not_confirmed',code:receipt.error?.code??null}};
  }
  const queued=Array.isArray(receipt.data)?receipt.data[0]:receipt.data;
  return {status:202,body:{ok:true,operation:'queue_mission',state:queued.status,
    jobId:queued.id,executionId:queued.execution_id,missionId:queued.mission_id,
    boundary:'Queued is not executed; each worker rechecks authorization, lease and receipt. External RETURN remains NOT_OBSERVED.'}};
}
