import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readOperationalCase, assertTenantAccess } from '@/lib/sfi/case-platform/repository';
import { validateMissionDispatchRequest } from './missionDispatch';
import { canonicalQueuedRequestDigest } from './queuedMissionWorker';
import { checkC07CaseQueueState } from './queuedMissionCaseGate';
import { readSfiMissionQuota } from '@/lib/operations/sfiCostMeter';
import { readPrimaryCognitiveExecutionReceipt } from '@/lib/persistence/dataPlaneRpc';

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
    .select('id,mission_id,agent_id,execution_id,status,attempts,max_attempts,receipt_event_id,receipt_hash,last_error_code,updated_at,return_observation')
    .eq('id',jobId).eq('actor_id',actorId).maybeSingle();
  if (status.error) return {status:503,body:{ok:false,error:'queue_status_unavailable'}};
  if (!status.data) return {status:404,body:{ok:false,error:'queue_job_not_found'}};
  const job = status.data;
  if (job.status !== 'COMPLETED' || !job.receipt_event_id || !job.receipt_hash) {
    return {status:200,body:{ok:true,job,
      outcome:{verification:'NO_COMPLETED_RECEIPT',scientificResult:'NOT_OBSERVED'},
      boundary:'A queued job is not a verified execution or observed external RETURN.'}};
  }
  // This call follows the exact actor-scoped queue read, never the broad queue.
  // Fail closed on a divergent receipt or unreadable PRIMARY ledger.
  let persisted:Row|null=null;
  try {
    persisted=await readPrimaryCognitiveExecutionReceipt(job.receipt_event_id);
  } catch {
    return {status:200,body:{ok:true,job,
      outcome:{verification:'PRIMARY_READ_UNAVAILABLE',scientificResult:'NOT_OBSERVED'},
      boundary:'Primary receipt unavailable does not mean zero execution; no outcome inferred.'}};
  }
  const item=persisted??{};
  const source=item.source&&typeof item.source==='object'&&!Array.isArray(item.source)?item.source as Row:{};
  const payload=item.payload&&typeof item.payload==='object'&&!Array.isArray(item.payload)?item.payload as Row:{};
  const metadata=payload.metadata&&typeof payload.metadata==='object'&&!Array.isArray(payload.metadata)?payload.metadata as Row:{};
  const refs=metadata.refs&&typeof metadata.refs==='object'&&!Array.isArray(metadata.refs)?metadata.refs as Row:{};
  const numeric=(value:unknown):number|null=>typeof value==='number'&&Number.isFinite(value)?value:null;
  const receiptMatches=item.event_id===job.receipt_event_id && item.event_name==='SFI_AGENT_EXECUTED'
    && item.hash_self===job.receipt_hash && source.sourceId===job.agent_id
    && payload.executionId===job.execution_id;
  if (!receiptMatches) {
    return {status:200,body:{ok:true,job,
      outcome:{verification:'RECEIPT_READBACK_MISMATCH',scientificResult:'NOT_OBSERVED'},
      boundary:'Job completion does not override a mismatched primary event.'}};
  }
  const sourceInventory=refs.caseSourceInventory&&typeof refs.caseSourceInventory==='object'
    &&!Array.isArray(refs.caseSourceInventory)?refs.caseSourceInventory as Row:{};
  const hunter=refs.evidenceHunterSummary&&typeof refs.evidenceHunterSummary==='object'
    &&!Array.isArray(refs.evidenceHunterSummary)?refs.evidenceHunterSummary as Row:{};
  return {status:200,body:{ok:true,job,
    outcome:{
      verification:'PRIMARY_RECEIPT_CONFIRMED',
      eventId:job.receipt_event_id,
      scientificResult:'INDEPENDENT_EVIDENCE_AND_RETURN_NOT_CONFIRMED',
      caseSourceInventory:{
        references:numeric(sourceInventory.sourcePointers),
        hypotheses:numeric(sourceInventory.hypothesesDeclared),
        unresolvedQuestions:numeric(sourceInventory.unresolvedQuestions),
        retrievedContents:numeric(sourceInventory.rawSourceContentsObserved),
        sourcesFetched:numeric(sourceInventory.sourceItemsFetched),
      },
      evidenceHunter:{
        missingDetected:numeric(hunter.missingEvidenceDetected),
        hypothesesChecked:numeric(hunter.hypothesesChecked),
        materialEvidenceResolved:numeric(hunter.materialEvidenceResolved),
      },
      modelExecution:typeof payload.llmAugmentationStatus==='string'?payload.llmAugmentationStatus:'NOT_OBSERVED',
      externalReturn:job.return_observation,
    },
    boundary:'Execution, source reference, admitted evidence, external RETURN and learning are separate assertions.'}};

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
  // Cost is not inferred from a successful job: reserve scarce daily/monthly
  // operation slots before the bounded queue claim. Unknown usage fails closed.
  const quota=await readSfiMissionQuota();
  if (!quota.ok) return {status:503,body:{ok:false,error:'cost_usage_unavailable',reason:quota.reason}};
  if (!quota.admissionAllowed) {
    return {status:429,body:{ok:false,error:'sfi_cost_quota_reached',
      admittedToday:quota.admittedToday,admittedMonth:quota.admittedMonth,limits:quota.limits,
      boundary:'Admission workload cap; no unobserved USD cost inferred.'}};
  }
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
