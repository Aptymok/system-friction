import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=120;

const HORIZON_DAYS=30;
const LIMIT=500;
type Row=Record<string,unknown>;
const rows=(v:unknown):Row[]=>Array.isArray(v)?v.filter((x):x is Row=>Boolean(x)&&typeof x==='object'&&!Array.isArray(x)):[];
const record=(v:unknown):Row=>v&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const nullableText=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():null;

function provenanceAttention(payload: Row){
  const reportRef=nullableText(payload.reportRef);
  const caseBinding=nullableText(payload.caseId)??nullableText(payload.caseRef);
  const subscriptionRef=nullableText(payload.subscriptionId)??nullableText(payload.subscriptionRef);
  const declaredReason=nullableText(payload.reasonForInclusion)??nullableText(payload.whyShown);
  const reason=declaredReason
    ??(reportRef?'REPORT_BINDING':caseBinding?'ACTIVE_CASE_BINDING':subscriptionRef?'SUBSCRIPTION':'AUTOMATED_BACKGROUND_MONITOR');
  const visibility=(reportRef||caseBinding||subscriptionRef)?'VISIBLE_BY_DEFAULT':'COLLAPSED_BY_DEFAULT';
  return {reason,caseBinding,reportRef,subscriptionRef,visibility};
}

export async function GET(){
  const db=createServiceSupabaseClient();
  const since=new Date(Date.now()-HORIZON_DAYS*86400000).toISOString();
  const [observations,readings,hypotheses,outcomes,learning]=await Promise.all([
    db.from('world_source_observations').select('id,source_family,publisher,title,summary,observed_at,latitude,longitude,affected_systems,actors,confidence,source_url,payload').gte('observed_at',since).order('observed_at',{ascending:false}).limit(LIMIT),
    db.from('world_friction_readings').select('observation_id,systemic_friction,interaction_density,friction_gradient,systemic_coherence,tension,trajectory,minimum_viable_perturbation,created_at').gte('created_at',since).order('created_at',{ascending:false}).limit(LIMIT),
    db.from('world_hypotheses').select('id,phenomenon_key,cutoff_at,statement,predicted_trajectory,expected_signals,contradiction_signals,validation_starts_at,validation_ends_at,initial_confidence,current_confidence,evidence_ids,status,created_at').gte('cutoff_at',since).order('cutoff_at',{ascending:false}).limit(LIMIT),
    db.from('world_hypothesis_outcomes').select('id,hypothesis_id,classification,observed_outcome,directional_accuracy,temporal_accuracy,actor_accuracy,mechanism_accuracy,evaluated_at').gte('evaluated_at',since).order('evaluated_at',{ascending:false}).limit(LIMIT),
    db.from('world_learning_events').select('id,hypothesis_id,outcome_id,retained_assumptions,rejected_assumptions,missing_variables,graph_adjustments,confidence_before,confidence_after,created_at').gte('created_at',since).order('created_at',{ascending:false}).limit(LIMIT),
  ]);
  const errors=[observations.error&&`observations:${observations.error.message}`,readings.error&&`readings:${readings.error.message}`,hypotheses.error&&`hypotheses:${hypotheses.error.message}`,outcomes.error&&`outcomes:${outcomes.error.message}`,learning.error&&`learning:${learning.error.message}`].filter(Boolean);
  if(observations.error)return NextResponse.json({ok:false,error:'PUBLIC_WORLD_OBSERVATIONS_FAILED',details:observations.error.message,nodes:[],hypotheses:[],outcomes:[],learning:[]},{status:503});
  const byObservation=new Map(rows(readings.data).map(r=>[String(r.observation_id),r]));
  const nodes=rows(observations.data).map(r=>{
    const payload=record(r.payload);
    const attention=provenanceAttention(payload);
    const independentlyVerified=typeof payload.independentlyVerified==='boolean'?payload.independentlyVerified:null;
    return {
      id:String(r.id),kind:'observed',sourceFamily:String(r.source_family??'unknown'),publisher:String(r.publisher??'unknown'),title:String(r.title??'Untitled observation'),summary:typeof r.summary==='string'?r.summary:null,observedAt:String(r.observed_at??''),lat:r.latitude==null?null:Number(r.latitude),lng:r.longitude==null?null:Number(r.longitude),affectedSystems:Array.isArray(r.affected_systems)?r.affected_systems:[],actors:Array.isArray(r.actors)?r.actors:[],confidence:r.confidence==null?null:Number(r.confidence),reading:byObservation.get(String(r.id))??null,
      provenance:{
        sourceUrl:nullableText(r.source_url),
        reportRef:attention.reportRef,
        caseBinding:attention.caseBinding,
        subscriptionRef:attention.subscriptionRef,
        epistemicClass:nullableText(payload.epistemicClass)??'SOURCE',
        sourceRole:nullableText(payload.sourceRole)??'UNCLASSIFIED_SOURCE',
        independentlyVerified,
        verificationState:independentlyVerified===true?'INDEPENDENTLY_VERIFIED':independentlyVerified===false?'NOT_INDEPENDENTLY_VERIFIED':'NOT_RECORDED',
        strategyOrigin:nullableText(payload.strategyOrigin),
        whyShown:attention.reason,
        visibility:attention.visibility,
        semanticBoundary:'SOURCE/PROVENANCE does not imply accepted EVIDENCE.',
      },
    };
  });
  const attentionSummary={
    visibleByDefault:nodes.filter(node=>node.provenance.visibility==='VISIBLE_BY_DEFAULT').length,
    collapsedBackground:nodes.filter(node=>node.provenance.visibility==='COLLAPSED_BY_DEFAULT').length,
  };
  return NextResponse.json({ok:errors.length===0,generatedAt:new Date().toISOString(),horizonDays:HORIZON_DAYS,nodes,attentionSummary,hypotheses:hypotheses.data??[],outcomes:outcomes.data??[],learning:learning.data??[],warnings:errors});
}
