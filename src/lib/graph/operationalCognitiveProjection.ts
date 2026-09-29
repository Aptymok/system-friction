import type { CanonicalGraphEdge, CanonicalGraphNode } from '../../../packages/graph/src';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row=Record<string,any>;
const iso=(v:unknown)=>typeof v==='string'&&v?v:new Date().toISOString();
const id=(p:string,v:unknown)=>`${p}:${String(v)}`;
const text=(v:unknown,f:string)=>typeof v==='string'&&v.trim()?v.trim():f;
const node=(nodeId:string,label:string,ontologyType:string,provenance:string,epistemicClass:string,attributes:Row,createdAt:string,updatedAt=createdAt):CanonicalGraphNode=>({
 nodeId,label,ontologyType,profile:'sfi',origin:'operational_projection',provenance,lineage:[],attributes:{...attributes,epistemicClass,projectionKind:'OPERATIONAL_COGNITIVE_READ_MODEL',readOnlyProjection:true},createdAt,updatedAt
});
const edge=(edgeId:string,sourceNodeId:string,targetNodeId:string,relation:string,provenance:string,attributes:Row,createdAt:string):CanonicalGraphEdge=>({
 edgeId,sourceNodeId,targetNodeId,relation,weight:1,profile:'sfi',origin:'operational_projection',provenance,lineage:[],attributes:{...attributes,epistemicClass:'DERIVED',projectionKind:'OPERATIONAL_COGNITIVE_READ_MODEL',readOnlyProjection:true},createdAt,updatedAt:createdAt
});
async function all(table:string,select:string,limit=1000){
 const db=createServiceSupabaseClient(); const r=await db.from(table).select(select).limit(limit);
 return r.error?[]:(r.data??[]) as Row[];
}
export async function buildOperationalCognitiveGraphProjection(){
 const [hypotheses,outcomes,learning,runs,cases,objects,evidence]=await Promise.all([
  all('world_hypotheses','id,phenomenon_key,statement,status,current_confidence,methodology_version,evidence_ids,validation_starts_at,validation_ends_at,created_at',500),
  all('world_hypothesis_outcomes','id,hypothesis_id,classification,observed_outcome,directional_accuracy,temporal_accuracy,actor_accuracy,mechanism_accuracy,source_coverage,evidence_ids,evaluator_version,evaluated_at',500),
  all('world_learning_events','id,hypothesis_id,outcome_id,retained_assumptions,rejected_assumptions,missing_variables,graph_adjustments,confidence_before,confidence_after,created_at',500),
  all('sfi_cognitive_twin_runs','id,task_id,provider,model,role,status,objective,evidence_refs,limitations,started_at,finished_at,created_at,case_id',250),
  all('sfi_cases','id,subject,scope,status,project_id,temporal_window,uncertainty,governance,created_at,updated_at,closed_at',250),
  all('sfi_case_objects','id,case_id,object_kind,epistemic_role,canonical_ref,source_refs,record_refs,evidence_refs,payload,observed_at,created_at',500),
  all('sfi_evidence_ledger','id,case_id,module,evidence_kind,source_name,source_url,evidence_hash,trust_level,trust_score,observed_at,created_at',500),
 ]);
 const nodes:CanonicalGraphNode[]=[]; const edges:CanonicalGraphEdge[]=[];
 for(const h of hypotheses){const nid=id('world-hypothesis',h.id);nodes.push(node(nid,text(h.statement,'World hypothesis'),'hypothesis','world_hypotheses','HYPOTHESIZED',{sourceId:h.id,phenomenonKey:h.phenomenon_key,status:h.status,confidence:h.current_confidence,methodologyVersion:h.methodology_version,evidenceIds:h.evidence_ids,validationStartsAt:h.validation_starts_at,validationEndsAt:h.validation_ends_at},iso(h.created_at)));}
 for(const o of outcomes){const nid=id('world-outcome',o.id);nodes.push(node(nid,text(o.classification,'World outcome'),'return','world_hypothesis_outcomes','DERIVED',{sourceId:o.id,hypothesisId:o.hypothesis_id,classification:o.classification,observedOutcome:o.observed_outcome,directionalAccuracy:o.directional_accuracy,temporalAccuracy:o.temporal_accuracy,actorAccuracy:o.actor_accuracy,mechanismAccuracy:o.mechanism_accuracy,sourceCoverage:o.source_coverage,evidenceIds:o.evidence_ids,evaluatorVersion:o.evaluator_version},iso(o.evaluated_at)));edges.push(edge(`hypothesis-outcome:${o.id}`,id('world-hypothesis',o.hypothesis_id),nid,'evaluated_as','world_hypothesis_outcomes',{classification:o.classification},iso(o.evaluated_at)));}
 for(const l of learning){const nid=id('world-learning',l.id);nodes.push(node(nid,'World learning event','learning','world_learning_events','DERIVED',{sourceId:l.id,hypothesisId:l.hypothesis_id,outcomeId:l.outcome_id,retainedAssumptions:l.retained_assumptions,rejectedAssumptions:l.rejected_assumptions,missingVariables:l.missing_variables,graphAdjustments:l.graph_adjustments,confidenceBefore:l.confidence_before,confidenceAfter:l.confidence_after},iso(l.created_at)));edges.push(edge(`outcome-learning:${l.id}`,id('world-outcome',l.outcome_id),nid,'produced_learning_event','world_learning_events',{},iso(l.created_at)));}
 for(const c of cases){const nid=id('case',c.id);nodes.push(node(nid,text(c.subject,'Institutional case'),'case','sfi_cases','DECLARED',{sourceId:c.id,status:c.status,scope:c.scope,projectId:c.project_id,temporalWindow:c.temporal_window,uncertainty:c.uncertainty,governance:c.governance,closedAt:c.closed_at},iso(c.created_at),iso(c.updated_at)));}
 for(const o of objects){const nid=id('case-object',o.id);const role=String(o.epistemic_role??'').toUpperCase();const epistemic=['OBSERVED','DERIVED','INFERRED','HYPOTHESIZED','SIMULATED','UNKNOWN','NOT_OBSERVED','DECLARED'].includes(role)?role:'DECLARED';nodes.push(node(nid,text(o.object_kind,'Case object'),text(o.object_kind,'case_object'),'sfi_case_objects',epistemic,{sourceId:o.id,caseId:o.case_id,epistemicRole:o.epistemic_role,canonicalRef:o.canonical_ref,sourceRefs:o.source_refs,recordRefs:o.record_refs,evidenceRefs:o.evidence_refs,payload:o.payload,observedAt:o.observed_at},iso(o.created_at)));edges.push(edge(`case-object:${o.id}`,id('case',o.case_id),nid,'contains','sfi_case_objects',{},iso(o.created_at)));}
 for(const r of runs){const nid=id('twin-run',r.id);nodes.push(node(nid,text(r.objective,text(r.task_id,'Cognitive Twin run')),'cognitive_twin_run','sfi_cognitive_twin_runs','DERIVED',{sourceId:r.id,taskId:r.task_id,provider:r.provider,model:r.model,role:r.role,status:r.status,objective:r.objective,evidenceRefs:r.evidence_refs,limitations:r.limitations,startedAt:r.started_at,finishedAt:r.finished_at,caseId:r.case_id},iso(r.created_at),iso(r.finished_at??r.created_at)));if(r.case_id)edges.push(edge(`case-twin:${r.id}`,id('case',r.case_id),nid,'has_cognitive_run','sfi_cognitive_twin_runs',{},iso(r.created_at)));}
 for(const e of evidence){const nid=id('evidence-ledger',e.id);nodes.push(node(nid,text(e.evidence_kind,text(e.source_name,'Evidence')),'evidence','sfi_evidence_ledger',e.observed_at?'OBSERVED':'DECLARED',{sourceId:e.id,caseId:e.case_id,module:e.module,evidenceKind:e.evidence_kind,sourceName:e.source_name,sourceUrl:e.source_url,evidenceHash:e.evidence_hash,trustLevel:e.trust_level,trustScore:e.trust_score,observedAt:e.observed_at},iso(e.created_at),iso(e.observed_at??e.created_at)));}
 return {nodes,edges};
}
