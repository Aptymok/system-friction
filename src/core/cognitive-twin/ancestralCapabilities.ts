import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readInstitutionalReadiness } from '@/lib/root/closure/readInstitutionalReadiness';
import { readCanonicalCognitiveTwinMemory } from './canonicalMemoryView';
import { readCognitiveTwinLineageHealth } from './reentry/runtime';
import { readCognitiveTwinMutationState } from './reentry/mutationState';
import { recordCognitiveTwinExperience } from './experience';

export const COGNITIVE_TWIN_ANCESTRAL_CAPABILITIES_VERSION='SFI-CT-ANCESTRAL-CAPABILITIES-2.0';

export const COGNITIVE_TWIN_POLICY={
  contract:'SFI-CTC', version:'1.2.0',
  autonomous:['observe','extract','calculate','draft','simulate','propose','persist_memory','propose_subject_mutation'] as const,
  founderReserved:['apply_subject_mutation','publish','mutate_canon','change_formula','grant_root_access','transfer_ip','execute_irreversible'] as const,
  invariants:['EVIDENCE_BEFORE_INFERENCE','SIMULATION_IS_NOT_OBSERVATION','MEMORY_IS_NOT_AUTHORITY','LEARNING_DOES_NOT_EXPAND_AUTHORITY','MISSING_REMAINS_MISSING','LINEAGE_IS_PROVENANCE_NOT_INDIVIDUATION'] as const,
};

export type CognitiveTwinAncestralCapabilityId='episodic_memory_engine'|'timeline_builder'|'meta_observer'|'policy_engine'|'observer_feedback_loop'|'identity_state_engine'|'operating_mode_distribution'|'causal_trace'|'governed_mutation'|'external_observation_field';
export type CognitiveTwinAncestralCapabilityStatus='MIGRATED'|'ABSORBED'|'REPLACED_EQUIVALENT'|'MISSING';

export const COGNITIVE_TWIN_ANCESTRAL_CAPABILITY_MANIFEST:Array<{id:CognitiveTwinAncestralCapabilityId;status:CognitiveTwinAncestralCapabilityStatus;currentImplementation:string[];boundary:string}>=[
  {id:'episodic_memory_engine',status:'MIGRATED',currentImplementation:['sfi_amv_memory(module=institutionalEventPipeline)','recordCognitiveTwinExperience()','readCanonicalCognitiveTwinMemory()'],boundary:'Episodes are evidence-bound institutional records. Candidate memory is persisted but cannot feed canonical context until verified/canonical.'},
  {id:'timeline_builder',status:'MIGRATED',currentImplementation:['readCanonicalCognitiveTwinMemory()','sfi_cognitive_twin_runs','sfi_cognitive_twin_decisions','buildCognitiveTwinTimeline()'],boundary:'Timeline ordering uses persisted timestamps and source identifiers; missing events are not interpolated.'},
  {id:'meta_observer',status:'MIGRATED',currentImplementation:['readInstitutionalReadiness()','buildCognitiveTwinMetaObservation()','integrated institutional cycle'],boundary:'Meta-observation reports organ state and discrepancy; it cannot promote the state it observes.'},
  {id:'policy_engine',status:'REPLACED_EQUIVALENT',currentImplementation:['SFI-CTC 1.2.0','ROOT/ACP proposal lifecycle','COGNITIVE_TWIN_POLICY'],boundary:'The policy engine may classify permission but cannot grant itself permission.'},
  {id:'observer_feedback_loop',status:'MIGRATED',currentImplementation:['Field observed return → recordCognitiveTwinExperience()','sfi_operating_cycles','recordCognitiveTwinFeedback()'],boundary:'A return is remembered only with real persisted references; a simulation cannot be promoted to observed return.'},
  {id:'identity_state_engine',status:'MIGRATED',currentImplementation:['CT-A01 lineage','readCognitiveTwinLineageHealth()','journal/snapshots/forks'],boundary:'Identity state means longitudinal provenance state. It does not assert consciousness, personhood or individuation.'},
  {id:'operating_mode_distribution',status:'MIGRATED',currentImplementation:['deriveOperatingModeDistribution()','sfi_cognitive_twin_runs'],boundary:'Operating mode is a distribution over auditable institutional run roles/statuses, not first-person psychological self-report.'},
  {id:'causal_trace',status:'MIGRATED',currentImplementation:['sfi_operating_cycles','sfi_inference_traces','buildCognitiveTwinCausalTrace()'],boundary:'The trace preserves sequence, hypotheses and linked outcomes; sequence alone never proves causality.'},
  {id:'governed_mutation',status:'MIGRATED',currentImplementation:['readCognitiveTwinMutationState()','CT-A01 mutation proposals','ROOT/ACP reserved apply_subject_mutation'],boundary:'Mutation is proposal/evaluation until founder-governed application; it cannot expand institutional authority.'},
  {id:'external_observation_field',status:'ABSORBED',currentImplementation:['WorldSpect','World Vector','Observatory','institutional experience bridge'],boundary:'External context preserves source/provenance and does not become friction, causality or canon automatically.'},
];

type Row=Record<string,unknown>;
function row(value:unknown):Row{return value&&typeof value==='object'&&!Array.isArray(value)?value as Row:{}}
function text(value:unknown){return typeof value==='string'&&value.trim()?value.trim():null}
function timestamp(value:unknown){const raw=text(value);if(!raw)return null;const d=new Date(raw);return Number.isFinite(d.getTime())?d.toISOString():null}
function limitedRows(value:unknown,limit=80):Row[]{return Array.isArray(value)?value.filter((item):item is Row=>Boolean(item)&&typeof item==='object'&&!Array.isArray(item)).slice(0,limit):[]}

export type CognitiveTwinTimelineEvent={id:string;at:string;kind:'MEMORY'|'RUN'|'DECISION';source:string;status:string|null;summary:string|null;evidenceRefs:string[]};

export async function buildCognitiveTwinTimeline(limit=120):Promise<{events:CognitiveTwinTimelineEvent[];warnings:string[]}>{
  const db=createServiceSupabaseClient();
  const each=Math.max(10,Math.ceil(limit/3));
  const [memory,runs,decisions]=await Promise.all([
    readCanonicalCognitiveTwinMemory(each),
    db.from('sfi_cognitive_twin_runs').select('id,task_id,role,status,objective,evidence_refs,started_at,finished_at,created_at').order('created_at',{ascending:false}).limit(each),
    db.from('sfi_cognitive_twin_decisions').select('id,decision_key,decision_kind,status,statement,evidence_refs,created_at,updated_at').order('created_at',{ascending:false}).limit(each),
  ]);
  const warnings=[memory.error,runs.error?.message,decisions.error?.message].filter((value):value is string=>Boolean(value));
  const events:CognitiveTwinTimelineEvent[]=[];
  for(const item of memory.rows){
    const at=timestamp(item.created_at);if(!at)continue;const content=row(item.content);
    events.push({id:item.id,at,kind:'MEMORY',source:item.source_kind??'canonical_memory',status:item.status,summary:text(content.summary)??text(content.title)??item.memory_key,evidenceRefs:item.evidence_refs});
  }
  for(const item of limitedRows(runs.data,each)){
    const at=timestamp(item.finished_at)??timestamp(item.started_at)??timestamp(item.created_at);if(!at)continue;
    events.push({id:String(item.id),at,kind:'RUN',source:text(item.role)??'run',status:text(item.status),summary:text(item.objective),evidenceRefs:Array.isArray(item.evidence_refs)?item.evidence_refs.map(String):[]});
  }
  for(const item of limitedRows(decisions.data,each)){
    const at=timestamp(item.created_at);if(!at)continue;
    events.push({id:String(item.id),at,kind:'DECISION',source:text(item.decision_kind)??'decision',status:text(item.status),summary:text(item.statement)??text(item.decision_key),evidenceRefs:Array.isArray(item.evidence_refs)?item.evidence_refs.map(String):[]});
  }
  events.sort((a,b)=>a.at.localeCompare(b.at));
  return {events:events.slice(-limit),warnings};
}

export async function deriveOperatingModeDistribution(limit=200){
  const db=createServiceSupabaseClient();
  const result=await db.from('sfi_cognitive_twin_runs').select('role,status,created_at').order('created_at',{ascending:false}).limit(limit);
  if(result.error)return {total:0,byRole:{},byStatus:{},sourceState:'DEGRADED' as const,warnings:[result.error.message]};
  const runs=limitedRows(result.data,limit);const byRole:Record<string,number>={};const byStatus:Record<string,number>={};
  for(const item of runs){const role=text(item.role)??'unknown';const status=text(item.status)??'unknown';byRole[role]=(byRole[role]??0)+1;byStatus[status]=(byStatus[status]??0)+1;}
  return {total:runs.length,byRole,byStatus,sourceState:runs.length?'OBSERVED' as const:'READY_EMPTY' as const,warnings:[] as string[]};
}

export async function buildCognitiveTwinMetaObservation(){
  const readiness=await readInstitutionalReadiness();
  return {generatedAt:readiness.generatedAt,runtimeOperational:readiness.runtimeOperational,organs:readiness.modules.map(item=>({id:item.id,state:item.state,observed:item.observed,blockers:item.blockers,evidence:item.evidence})),discrepancies:readiness.modules.filter(item=>item.blockers.length||(!item.observed&&item.state!=='READY')).map(item=>({id:item.id,state:item.state,blockers:item.blockers})),boundary:'This is a read-only meta-observation of persisted institutional state. It does not promote, approve or repair what it observes.'};
}

export async function buildCognitiveTwinCausalTrace(operatingCycleId:string){
  const db=createServiceSupabaseClient();
  const [cycle,inferences,trajectory]=await Promise.all([
    db.from('sfi_operating_cycles').select('*').eq('id',operatingCycleId).maybeSingle(),
    db.from('sfi_inference_traces').select('*').eq('operating_cycle_id',operatingCycleId).order('created_at',{ascending:true}),
    db.from('sfi_artifact_trajectory_events').select('*').eq('operating_cycle_id',operatingCycleId).order('observed_at',{ascending:true}),
  ]);
  const warnings=[cycle.error?.message,inferences.error?.message,trajectory.error?.message].filter((value):value is string=>Boolean(value));
  return {cycle:cycle.data??null,inferences:inferences.data??[],trajectory:trajectory.data??[],warnings,boundary:'Chronology + linked evidence + hypotheses form a causal trace candidate. Causal attribution still requires discriminating evidence or experiment.'};
}

export async function recordCognitiveTwinFeedback(input:{operatingCycleId:string;fieldCaseId:string;fieldOutcomeId:string;returnId:string;evidenceRefs:string[];createdBy:string;expected:unknown;observed:unknown;contrast:unknown}){
  if(!input.operatingCycleId||!input.fieldCaseId||!input.fieldOutcomeId||!input.returnId)throw new Error('COGNITIVE_TWIN_FEEDBACK_REQUIRES_REAL_PERSISTED_REFS');
  return recordCognitiveTwinExperience({
    memoryKey:`FIELD_RETURN:${input.fieldCaseId}:${input.fieldOutcomeId}`,memoryType:'STATE',sourceKind:'field_outcomes',sourceRef:input.fieldOutcomeId,createdBy:input.createdBy,evidenceRefs:input.evidenceRefs,
    content:{epistemicClass:'OBSERVED_RETURN',operatingCycleId:input.operatingCycleId,fieldCaseId:input.fieldCaseId,fieldOutcomeId:input.fieldOutcomeId,returnId:input.returnId,expected:input.expected,observed:input.observed,contrast:input.contrast,rule:'Observed return is candidate institutional experience. It is not verification, authority or canon by storage alone.'},
  });
}

export async function readCognitiveTwinAncestralState(limit=120){
  const [timeline,operatingMode,metaObservation,lineage,mutations]=await Promise.all([buildCognitiveTwinTimeline(limit),deriveOperatingModeDistribution(),buildCognitiveTwinMetaObservation(),readCognitiveTwinLineageHealth(),readCognitiveTwinMutationState()]);
  const missing=COGNITIVE_TWIN_ANCESTRAL_CAPABILITY_MANIFEST.filter(item=>item.status==='MISSING').map(item=>item.id);
  return {capabilityVersion:COGNITIVE_TWIN_ANCESTRAL_CAPABILITIES_VERSION,policy:COGNITIVE_TWIN_POLICY,capabilities:COGNITIVE_TWIN_ANCESTRAL_CAPABILITY_MANIFEST,missingCapabilities:missing,timeline,operatingMode,metaObservation,lineage,mutations,softwareComplete:missing.length===0,boundary:'Software-complete ancestral capability integration means every retained ancestral function has a present institutional implementation or explicit governed absorption/equivalent. It does not demonstrate individuation, autonomy or scientific validity.'};
}
