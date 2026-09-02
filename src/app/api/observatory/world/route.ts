import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=120;

const HORIZON_DAYS=30;
const LIMIT=900;
type Row=Record<string,unknown>;
type HypothesisView=Row&{graphSnapshot:Row;aiInference:Row};
const rows=(v:unknown):Row[]=>Array.isArray(v)?v.filter((x):x is Row=>Boolean(x)&&typeof x==='object'&&!Array.isArray(x)):[];
const record=(v:unknown):Row=>v&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const nullableText=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():null;
const texts=(v:unknown)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'&&x.trim().length>0).map(x=>x.trim()):[];

function provenanceAttention(payload: Row){
  const reportRef=nullableText(payload.reportRef);
  const caseBinding=nullableText(payload.caseId)??nullableText(payload.caseRef);
  const subscriptionRef=nullableText(payload.subscriptionId)??nullableText(payload.subscriptionRef);
  const declaredReason=nullableText(payload.reasonForInclusion)??nullableText(payload.whyShown);
  const reason=declaredReason??(reportRef?'REPORT_BINDING':caseBinding?'ACTIVE_CASE_BINDING':subscriptionRef?'SUBSCRIPTION':'AUTOMATED_BACKGROUND_MONITOR');
  const visibility=(reportRef||caseBinding||subscriptionRef)?'VISIBLE_BY_DEFAULT':'COLLAPSED_BY_DEFAULT';
  return {reason,caseBinding,reportRef,subscriptionRef,visibility};
}

function unique(values:string[]){return [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b));}

export async function GET(){
  const db=createServiceSupabaseClient();
  const since=new Date(Date.now()-HORIZON_DAYS*86400000).toISOString();
  const [observations,readings,hypotheses,outcomes,learning]=await Promise.all([
    db.from('world_source_observations').select('id,source_id,source_family,publisher,observation_kind,title,summary,observed_at,fetched_at,latitude,longitude,country_codes,affected_systems,actors,confidence,source_url,payload').gte('fetched_at',since).order('fetched_at',{ascending:false}).limit(LIMIT),
    db.from('world_friction_readings').select('observation_id,systemic_friction,interaction_density,friction_gradient,systemic_coherence,tension,pain_map,field_drivers,permissions,trajectory,minimum_viable_perturbation,created_at').gte('created_at',since).order('created_at',{ascending:false}).limit(LIMIT),
    db.from('world_hypotheses').select('id,phenomenon_key,graph_snapshot,cutoff_at,statement,predicted_trajectory,expected_signals,contradiction_signals,validation_starts_at,validation_ends_at,initial_confidence,current_confidence,evidence_ids,status,methodology_version,created_at').gte('cutoff_at',since).order('cutoff_at',{ascending:false}).limit(LIMIT),
    db.from('world_hypothesis_outcomes').select('id,hypothesis_id,classification,observed_outcome,directional_accuracy,temporal_accuracy,actor_accuracy,mechanism_accuracy,source_coverage,evidence_ids,evaluator_version,evaluated_at').gte('evaluated_at',since).order('evaluated_at',{ascending:false}).limit(LIMIT),
    db.from('world_learning_events').select('id,hypothesis_id,outcome_id,retained_assumptions,rejected_assumptions,missing_variables,graph_adjustments,confidence_before,confidence_after,created_at').gte('created_at',since).order('created_at',{ascending:false}).limit(LIMIT),
  ]);
  const errors=[observations.error&&`observations:${observations.error.message}`,readings.error&&`readings:${readings.error.message}`,hypotheses.error&&`hypotheses:${hypotheses.error.message}`,outcomes.error&&`outcomes:${outcomes.error.message}`,learning.error&&`learning:${learning.error.message}`].filter(Boolean);
  if(observations.error)return NextResponse.json({ok:false,error:'PUBLIC_WORLD_OBSERVATIONS_FAILED',details:observations.error.message,nodes:[],hypotheses:[],outcomes:[],learning:[],graph:{nodes:[],edges:[]}},{status:503});

  const byObservation=new Map(rows(readings.data).map(r=>[String(r.observation_id),r]));
  const nodes=rows(observations.data).map(r=>{
    const payload=record(r.payload);
    const attention=provenanceAttention(payload);
    const independentlyVerified=typeof payload.independentlyVerified==='boolean'?payload.independentlyVerified:null;
    return {
      id:String(r.id),
      kind:'observed',
      sourceId:String(r.source_id??'unknown'),
      sourceFamily:String(r.source_family??'unknown'),
      publisher:String(r.publisher??'unknown'),
      observationKind:String(r.observation_kind??'unknown'),
      title:String(r.title??'Untitled observation'),
      summary:typeof r.summary==='string'?r.summary:null,
      observedAt:String(r.observed_at??''),
      fetchedAt:String(r.fetched_at??''),
      lat:r.latitude==null?null:Number(r.latitude),
      lng:r.longitude==null?null:Number(r.longitude),
      countryCodes:texts(r.country_codes),
      affectedSystems:texts(r.affected_systems),
      actors:texts(r.actors),
      confidence:r.confidence==null?null:Number(r.confidence),
      reading:byObservation.get(String(r.id))??null,
      provenance:{
        sourceUrl:nullableText(r.source_url),
        reportRef:attention.reportRef,
        caseBinding:attention.caseBinding,
        subscriptionRef:attention.subscriptionRef,
        epistemicClass:nullableText(payload.epistemicClass)??'SOURCE_RECORD',
        sourceRole:nullableText(payload.sourceRole)??'UNCLASSIFIED_SOURCE',
        independentlyVerified,
        verificationState:independentlyVerified===true?'INDEPENDENTLY_VERIFIED':independentlyVerified===false?'NOT_INDEPENDENTLY_VERIFIED':'NOT_RECORDED',
        strategyOrigin:nullableText(payload.strategyOrigin),
        whyShown:attention.reason,
        visibility:attention.visibility,
        provider:nullableText(payload.provider),
        endpoint:nullableText(payload.endpoint),
        semanticBoundary:'SOURCE/PROVENANCE does not imply accepted EVIDENCE.',
      },
    };
  });

  const hypothesisRows:HypothesisView[]=rows(hypotheses.data).map((h):HypothesisView=>{
    const graphSnapshot=record(h.graph_snapshot);
    const aiInference=record(graphSnapshot.aiInference);
    return {
      ...h,
      graphSnapshot,
      aiInference:{
        provider:nullableText(aiInference.provider),
        model:nullableText(aiInference.model),
        relationClass:nullableText(aiInference.relationClass)??nullableText(record(h.predicted_trajectory).relationClass),
        mechanism:nullableText(aiInference.mechanism)??nullableText(record(h.predicted_trajectory).mechanism),
        affectedObservationIds:texts(aiInference.affectedObservationIds).length?texts(aiInference.affectedObservationIds):texts(record(h.predicted_trajectory).affectedObservationIds),
        affectedSystems:texts(aiInference.affectedSystems).length?texts(aiInference.affectedSystems):texts(record(h.predicted_trajectory).affectedSystems),
        consequenceChain:Array.isArray(aiInference.consequenceChain)?aiInference.consequenceChain:Array.isArray(record(h.predicted_trajectory).consequenceChain)?record(h.predicted_trajectory).consequenceChain:[],
        rivalHypotheses:texts(aiInference.rivalHypotheses).length?texts(aiInference.rivalHypotheses):texts(record(h.predicted_trajectory).rivalHypotheses),
        uncertainties:texts(aiInference.uncertainties).length?texts(aiInference.uncertainties):texts(record(h.predicted_trajectory).uncertainties),
        reason:nullableText(aiInference.reason),
        authority:'INFERENCE_ONLY',
      },
    };
  });
  const outcomeRows=rows(outcomes.data);
  const learningRows=rows(learning.data);
  const outcomeByHypothesis=new Map(outcomeRows.map(o=>[String(o.hypothesis_id),o]));
  const learningByHypothesis=new Map(learningRows.map(l=>[String(l.hypothesis_id),l]));

  const graphNodes:Row[]=[...nodes.map(node=>({id:node.id,kind:'OBSERVATION',label:node.title,epistemicClass:'SOURCE_RECORD',sourceFamily:node.sourceFamily,publisher:node.publisher,lat:node.lat,lng:node.lng,confidence:node.confidence}))];
  const systemSet=new Set<string>();
  for(const node of nodes)for(const system of node.affectedSystems)systemSet.add(system);
  for(const hypothesis of hypothesisRows)for(const system of texts(hypothesis.aiInference.affectedSystems))systemSet.add(system);
  for(const system of systemSet)graphNodes.push({id:`system:${system}`,kind:'SYSTEM',label:system,epistemicClass:'MODEL_TARGET'});
  for(const hypothesis of hypothesisRows)graphNodes.push({id:`hypothesis:${String(hypothesis.id)}`,kind:'HYPOTHESIS',label:String(hypothesis.statement??'Hypothesis'),epistemicClass:'INFERENCE',confidence:hypothesis.current_confidence,status:hypothesis.status,relationClass:hypothesis.aiInference.relationClass});

  const graphEdges:Row[]=[];
  for(const node of nodes){
    for(const system of node.affectedSystems)graphEdges.push({id:`obs:${node.id}->system:${system}`,from:node.id,to:`system:${system}`,relation:'COLLECTOR_EXPOSURE_ASSIGNMENT',epistemicClass:'DERIVED',basis:[node.id]});
  }
  for(const hypothesis of hypothesisRows){
    const hid=`hypothesis:${String(hypothesis.id)}`;
    for(const evidenceId of texts(hypothesis.evidence_ids))graphEdges.push({id:`evidence:${evidenceId}->${hid}`,from:evidenceId,to:hid,relation:'EVIDENCE_INPUT_TO_INFERENCE',epistemicClass:'LINEAGE',basis:[evidenceId]});
    for(const system of texts(hypothesis.aiInference.affectedSystems))graphEdges.push({id:`${hid}->system:${system}`,from:hid,to:`system:${system}`,relation:'INFERRED_IMPACT',epistemicClass:'INFERRED',basis:texts(hypothesis.evidence_ids)});
    const inferredRelations=Array.isArray(hypothesis.graphSnapshot.inferredRelations)?hypothesis.graphSnapshot.inferredRelations as unknown[]:[];
    inferredRelations.forEach((raw,index)=>{
      const edge=record(raw);
      const from=nullableText(edge.from);const to=nullableText(edge.to);if(!from||!to)return;
      graphEdges.push({id:`${hid}:inferred:${index}`,from,to,relation:nullableText(edge.relation)??'INFERRED_RELATION',epistemicClass:'INFERRED',basis:texts(edge.basisEvidenceIds)});
    });
  }

  const hypothesesWithReturn=(hypothesisRows.map(h=>({...h,outcome:outcomeByHypothesis.get(String(h.id))??null,learning:learningByHypothesis.get(String(h.id))??null}))) as Array<HypothesisView&{outcome:Row|null;learning:Row|null}>;
  const attentionSummary={visibleByDefault:nodes.filter(node=>node.provenance.visibility==='VISIBLE_BY_DEFAULT').length,collapsedBackground:nodes.filter(node=>node.provenance.visibility==='COLLAPSED_BY_DEFAULT').length};
  const sourceCounts=new Map<string,number>();
  nodes.forEach(node=>sourceCounts.set(node.sourceId,(sourceCounts.get(node.sourceId)??0)+1));
  const sourceSummary=[...sourceCounts.entries()].map(([sourceId,count])=>({sourceId,count})).sort((a,b)=>b.count-a.count);
  const filters={
    sourceIds:unique(nodes.map(node=>node.sourceId)),
    sourceFamilies:unique(nodes.map(node=>node.sourceFamily)),
    publishers:unique(nodes.map(node=>node.publisher)),
    systems:unique(nodes.flatMap(node=>node.affectedSystems).concat(hypothesesWithReturn.flatMap(h=>texts(h.aiInference.affectedSystems)))),
    hypothesisStatuses:unique(hypothesesWithReturn.map(h=>String(h.status??''))),
    relationClasses:unique(hypothesesWithReturn.map(h=>String(h.aiInference.relationClass??''))),
    outcomeClasses:unique(outcomeRows.map(o=>String(o.classification??''))),
  };

  return NextResponse.json({
    ok:errors.length===0,
    generatedAt:new Date().toISOString(),
    horizonDays:HORIZON_DAYS,
    nodes,
    attentionSummary,
    sourceSummary,
    filters,
    hypotheses:hypothesesWithReturn,
    outcomes:outcomeRows,
    learning:learningRows,
    graph:{nodes:graphNodes,edges:graphEdges,boundary:'Edges are explicitly typed as lineage, derived collector assignments or AI inference. No edge is rendered as observed causality unless a future evidence contract establishes it.'},
    warnings:errors,
  });
}
