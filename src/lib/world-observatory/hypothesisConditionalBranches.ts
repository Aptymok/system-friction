import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  parseHypothesisTestContract,
  type HypothesisCriterion,
} from './hypothesisTestContract';

/**
 * Read-only, as-of hypothesis sensitivity projection.
 * This is an interpretation of FROZEN preregistered tests, not a forecast,
 * new observation, confidence update, simulation result or official RETURN.
 */
export const SFI_HYPOTHESIS_CONDITIONAL_BRANCH_CONTRACT = 'SFI-HYPOTHESIS-CONDITIONAL-BRANCH-1.0' as const;

type Row = Record<string, unknown>;
const asRow=(x:unknown):Row=>x&&typeof x==='object'&&!Array.isArray(x)?x as Row:{};
const arr=(x:unknown):string[]=>Array.isArray(x)?x.filter((v):v is string=>typeof v==='string'&&v.trim().length>0):[];
const date=(x:unknown):string|null=>{
  if(typeof x!=='string'||!Number.isFinite(Date.parse(x)))return null;
  return new Date(x).toISOString();
};
const finite=(x:unknown):number|null=> x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;

export type HypothesisConditionalTick = {
  id:string;
  kind:'CUTOFF'|'TEST_START'|'TEST_END'|'RETURN';
  at:string;
  epistemicClass:'RECORDED'|'PREREGISTERED_TIME';
  meaning:string;
};

export type HypothesisConditionalBranch = {
  id:string;
  relation:'SUPPORT_IF'|'CONTRADICT_IF';
  criterionId:string;
  signal:string;
  metric:string|null;
  operator:HypothesisCriterion['operator'];
  threshold:number|null;
  unit:string|null;
  required:boolean;
  minimumObservations:number;
  sourceFamilies:string[];
  epistemicClass:'CONDITIONAL_NOT_OBSERVED';
  contextRule:string;
  verificationState:'NOT_EVALUATED_HERE';
};

export type HypothesisConditionalProjection = {
  id:string;
  statement:string;
  status:string;
  cutoffAt:string;
  startAt:string;
  endAt:string;
  evaluationAt:string|null;
  outcomeClassification:string|null;
  outcomeEvidenceIds:string[];
  baselineEvidenceCount:number;
  postCutoffEvidenceCount:number|null;
  distinctPostCutoffSourceFamilies:number|null;
  evidenceMinimum:number;
  sourceFamilyMinimum:number;
  observationalGap:{evidence:number|null;sourceFamilies:number|null};
  contractHorizonHours:number;
  horizonBasis:string;
  invariantConditions:string[];
  variables:string[];
  branches:HypothesisConditionalBranch[];
  ticks:HypothesisConditionalTick[];
  methodState:'PREREGISTERED_TEST'|'HISTORICAL_TEST_CLOSED';
  nextStep:'OBSERVE_WITHIN_REGISTERED_HORIZON'|'NEW_PROSPECTIVE_PREREGISTRATION_REQUIRED';
  epistemicBoundary:string;
};

export type HypothesisConditionalReadModel = {
  contract:typeof SFI_HYPOTHESIS_CONDITIONAL_BRANCH_CONTRACT;
  generatedAt:string;
  scanned:number;
  total:number|null;
  eligible:number;
  legacyWithoutContract:number;
  projections:HypothesisConditionalProjection[];
  warnings:string[];
  boundary:string;
};

function criterionBranch(hypothesisId:string, criterion:HypothesisCriterion, relation:'SUPPORT_IF'|'CONTRADICT_IF'):HypothesisConditionalBranch{
  return {
    id:hypothesisId+':'+relation+':'+criterion.id,
    relation,criterionId:criterion.id,signal:criterion.signal,metric:criterion.metric,
    operator:criterion.operator,threshold:criterion.threshold,unit:criterion.unit,
    required:criterion.required,minimumObservations:criterion.minimumObservations,
    sourceFamilies:criterion.sourceFamilies,
    epistemicClass:'CONDITIONAL_NOT_OBSERVED',
    contextRule:'Criterion applies only to qualifying source observations within its preregistered validation window, after its minimum sampling and provenance conditions have been satisfied.',
    verificationState:'NOT_EVALUATED_HERE',
  };
}

export async function readHypothesisConditionalBranches():Promise<HypothesisConditionalReadModel>{
  const db=createServiceSupabaseClient();
  const generatedAt=new Date().toISOString();
  // Bounded inspection, no full-table scans, writes or model calls.
  const {data:rawHypotheses,count,error}=await db.from('world_hypotheses')
    .select('id,statement,status,cutoff_at,validation_starts_at,validation_ends_at,predicted_trajectory,evidence_ids', {count:'exact'})
    .order('cutoff_at',{ascending:false}).limit(80);
  if(error)throw new Error('hypothesis_conditional_read_failed:'+error.message);
  const hypotheses=rawHypotheses??[];
  const eligible=hypotheses.flatMap(h=>{
    const contract=parseHypothesisTestContract(asRow(h.predicted_trajectory).testContract);
    return contract?[{h,contract}]:[];
  }).slice(0,16);
  const ids=eligible.map(x=>x.h.id);
  const outcomes=ids.length?await db.from('world_hypothesis_outcomes')
    .select('id,hypothesis_id,classification,evidence_ids,evaluated_at')
    .in('hypothesis_id',ids).order('evaluated_at',{ascending:false}).limit(40):{data:[],error:null};
  if(outcomes.error)throw new Error('hypothesis_conditional_outcomes_failed:'+outcomes.error.message);
  const byId=new Map<string,Row>();
  for(const outcome of outcomes.data??[]){
    const key=String(outcome.hypothesis_id);
    if(!byId.has(key))byId.set(key,outcome);
  }
  const allReturnEvidence=[...new Set([...byId.values()].flatMap(o=>arr(o.evidence_ids)))].slice(0,80);
  const sourceRead=allReturnEvidence.length?await db.from('world_source_observations')
    .select('id,source_family,fetched_at').in('id',allReturnEvidence):{data:[],error:null};
  const warnings:string[]=[];
  if(sourceRead.error)warnings.push('return_evidence_provenance_unavailable:'+sourceRead.error.code);
  const sourcesById=new Map((sourceRead.data??[]).map(x=>[String(x.id),x]));
  const projections:HypothesisConditionalProjection[]=eligible.flatMap(({h,contract})=>{
    const id=String(h.id),cutoffAt=date(h.cutoff_at),startAt=date(h.validation_starts_at),endAt=date(h.validation_ends_at);
    if(!cutoffAt||!startAt||!endAt){warnings.push('missing_frozen_clock:'+id);return [];}
    if(Date.parse(startAt)<Date.parse(cutoffAt)||Date.parse(endAt)<=Date.parse(startAt)){
      warnings.push('invalid_frozen_window:'+id);return [];
    }
    const originalEvidence=arr(h.evidence_ids);
    const outcome=byId.get(id);
    const returnedEvidence=arr(outcome?.evidence_ids);
    // Source lineage must be dated inside the ORIGINAL validation window.
    const eligibleSources=returnedEvidence.map(ref=>sourcesById.get(ref))
      .filter((source):source is NonNullable<typeof source>=>Boolean(source&&date(source.fetched_at)
        && Date.parse(date(source.fetched_at)!)>Date.parse(cutoffAt)
        && Date.parse(date(source.fetched_at)!)>=Date.parse(startAt)
        && Date.parse(date(source.fetched_at)!)<=Date.parse(endAt)));
    const families=sourceRead.error?null:new Set(eligibleSources.map(s=>String(s.source_family)).filter(Boolean)).size;
    const evidenceCount=sourceRead.error?null:eligibleSources.length;
    const closed=Date.parse(endAt)<=Date.parse(generatedAt)||!['OPEN','AWAITING_OUTCOME'].includes(String(h.status));
    const ticks:HypothesisConditionalTick[]=[
      {id:id+':cutoff',kind:'CUTOFF',at:cutoffAt,epistemicClass:'RECORDED',meaning:'Frozen hypothesis cutoff / T0; not outcome.'},
      {id:id+':start',kind:'TEST_START',at:startAt,epistemicClass:'PREREGISTERED_TIME',meaning:'Registered start of admissible observation window; not proof that an observation occurred.'},
      {id:id+':end',kind:'TEST_END',at:endAt,epistemicClass:'PREREGISTERED_TIME',meaning:'Registered end of validation horizon; not a predicted event.'},
    ];
    const evaluationAt=date(outcome?.evaluated_at);
    if(evaluationAt)ticks.push({id:id+':return',kind:'RETURN',at:evaluationAt,epistemicClass:'RECORDED',meaning:'Recorded evaluation; classification remains in canonical WORLD outcome.'});
    const branches=[
      ...contract.expectedCriteria.map(c=>criterionBranch(id,c,'SUPPORT_IF')),
      ...contract.contradictionCriteria.map(c=>criterionBranch(id,c,'CONTRADICT_IF')),
    ];
    return [{
      id,statement:String(h.statement??''),status:String(h.status??'UNKNOWN'),
      cutoffAt,startAt,endAt,evaluationAt,outcomeClassification:outcome?String(outcome.classification??'UNKNOWN'):null,
      outcomeEvidenceIds:returnedEvidence,baselineEvidenceCount:originalEvidence.length,
      postCutoffEvidenceCount:evidenceCount,distinctPostCutoffSourceFamilies:families,
      evidenceMinimum:contract.minimumEvidenceCount,sourceFamilyMinimum:contract.minimumSourceFamilies,
      observationalGap:{evidence:evidenceCount===null?null:Math.max(0,contract.minimumEvidenceCount-evidenceCount),sourceFamilies:families===null?null:Math.max(0,contract.minimumSourceFamilies-families)},
      contractHorizonHours:contract.horizonHours,horizonBasis:contract.horizonBasis,
      invariantConditions:[
        'Frozen T0: '+cutoffAt,
        'Registered validation interval: '+startAt+' → '+endAt,
        'Minimum admissible evidence: '+contract.minimumEvidenceCount,
        'Minimum independent source families: '+contract.minimumSourceFamilies,
        'Hypothesis text, criteria, thresholds and rival/contradiction discriminators may not be edited after T0.',
      ],
      variables:[...new Set(branches.map(b=>b.metric??b.signal))],
      branches,ticks,
      methodState:closed?'HISTORICAL_TEST_CLOSED':'PREREGISTERED_TEST',
      nextStep:closed?'NEW_PROSPECTIVE_PREREGISTRATION_REQUIRED':'OBSERVE_WITHIN_REGISTERED_HORIZON',
      epistemicBoundary:'Counterfactual conditions, not numerical confidence gains. Baseline source records do not count as future RETURN. A closed historical test cannot be reopened by this reader. No canonical promotion, causal certainty, observation, simulation run or action is claimed.',
    } satisfies HypothesisConditionalProjection];
  });
  return {
    contract:SFI_HYPOTHESIS_CONDITIONAL_BRANCH_CONTRACT,generatedAt,
    scanned:hypotheses.length,total:count??null,
    eligible:projections.length,legacyWithoutContract:hypotheses.length-eligible.length,
    projections,warnings,
    boundary:'Read-only, evidence-bounded sensitivity of already frozen hypothesis test contracts. Conditional branches are not outcomes. Only a newly preregistered prospective hypothesis can establish a new future validation window.',
  };
}
