import 'server-only';

import { createHash } from 'node:crypto';
import type { CanonicalGraphEdge, CanonicalGraphNode } from '../../../packages/graph/src';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { FieldScientificReading, ScientificMethodCandidate } from './fieldScientificReading';

export const SFI_SCIENTIFIC_METHOD_RUNTIME_CONTRACT = 'SFI-SCIENTIFIC-METHOD-RUNTIME-1.0' as const;

type Row = Record<string, unknown>;
type EpochRecord = {
  eventId: string;
  occurredAt: string;
  lineage: string[];
  snapshot: Row;
};

export type ScientificMethodExecution = {
  family: ScientificMethodCandidate['family'];
  status: 'EXECUTED'|'ABSTAINED';
  executionLevel: 'DESCRIPTIVE_EMPIRICAL'|'BOUNDED_SCREENING'|'MODEL_REQUIRED'|'INSUFFICIENT';
  result: Record<string, unknown> | null;
  missing: string[];
  limitations: string[];
  evidenceRefs: string[];
  historyEventIds: string[];
  boundary: string;
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}
function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim()) : [];
}
function num(value: unknown) {
  const parsed=Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function sha256(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function mean(values:number[]) {
  return values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : null;
}
function sd(values:number[]) {
  if(values.length<2)return null;
  const m=mean(values) as number;
  return Math.sqrt(values.reduce((sum,value)=>sum+((value-m)**2),0)/(values.length-1));
}
function median(values:number[]) {
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  const mid=Math.floor(sorted.length/2);
  return sorted.length%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
}
function unique<T>(values:T[]) { return [...new Set(values)]; }

export async function readFieldEpochHistories(subjectRefs:string[]) {
  const refs=unique(subjectRefs.filter(Boolean)).slice(0,40);
  const map=new Map<string,EpochRecord[]>();
  for(const ref of refs)map.set(ref,[]);
  if(!refs.length)return map;

  const logbooks=refs.map((ref)=>`FIELD_EPOCH:${ref}`);
  const db=createServiceSupabaseClient();
  const result=await db.from('epistemic_events')
    .select('event_id,logbook_id,occurred_at,payload,lineage')
    .eq('event_name','SFI_FIELD_TEMPORAL_EPOCH_RECORDED')
    .in('logbook_id',logbooks)
    .order('occurred_at',{ascending:true})
    .limit(1000);
  if(result.error)throw new Error(`FIELD_EPOCH_HISTORY_READ_FAILED:${result.error.message}`);

  for(const item of (result.data??[]) as Row[]){
    const logbook=String(item.logbook_id??'');
    const ref=logbook.startsWith('FIELD_EPOCH:')?logbook.slice('FIELD_EPOCH:'.length):'';
    if(!map.has(ref))continue;
    const payload=row(item.payload);
    const snapshot=row(payload.snapshot);
    map.get(ref)!.push({
      eventId:String(item.event_id??''),
      occurredAt:String(item.occurred_at??''),
      lineage:strings(item.lineage),
      snapshot,
    });
  }
  return map;
}

function evidenceRefs(history:EpochRecord[]) {
  return unique(history.flatMap((item)=>[
    ...item.lineage,
    ...strings(item.snapshot.sourceObservationRefs),
    ...strings(item.snapshot.evidenceRefs),
  ]));
}

function relationRows(history:EpochRecord[]) {
  return history.flatMap((epoch)=>rows(epoch.snapshot.relationTransitions).map((relation)=>({
    epoch,
    relation,
    edgeId:String(relation.edgeId??''),
    currentWeight:num(relation.currentWeight),
    previousWeight:num(relation.previousWeight),
    currentState:typeof relation.currentState==='string'?relation.currentState:null,
    previousState:typeof relation.previousState==='string'?relation.previousState:null,
  })));
}

function executeChangePoint(history:EpochRecord[]): ScientificMethodExecution {
  const byEdge=new Map<string,Array<{eventId:string;at:string;weight:number}>>();
  for(const item of relationRows(history)){
    if(!item.edgeId||item.currentWeight===null)continue;
    const list=byEdge.get(item.edgeId)??[];
    list.push({eventId:item.epoch.eventId,at:item.epoch.occurredAt,weight:item.currentWeight});
    byEdge.set(item.edgeId,list);
  }
  const best=[...byEdge.entries()].sort((a,b)=>b[1].length-a[1].length)[0];
  if(!best||best[1].length<4){
    return {family:'CHANGE_POINT',status:'ABSTAINED',executionLevel:'INSUFFICIENT',result:null,missing:['at least four comparable persisted relation-weight epochs for one edge'],limitations:[],evidenceRefs:evidenceRefs(history),historyEventIds:history.map(x=>x.eventId),boundary:'No change-point claim is made from sparse or incomparable history.'};
  }
  const [edgeId,series]=best;
  const values=series.map(x=>x.weight);
  const m=mean(values) as number;
  const sigma=sd(values);
  if(sigma===null||sigma===0){
    return {family:'CHANGE_POINT',status:'EXECUTED',executionLevel:'BOUNDED_SCREENING',result:{edgeId,n:values.length,mean:m,standardDeviation:sigma,maxStandardizedCusum:0,boundaryIndex:null,boundaryAt:null},missing:[],limitations:['CUSUM screening reports a statistic only; constant history provides no variance for significance inference.'],evidenceRefs:evidenceRefs(history),historyEventIds:history.map(x=>x.eventId),boundary:'Descriptive CUSUM screening is not a validated significance test and does not establish a regime change.'};
  }
  let cumulative=0; let maxAbs=0; let maxIndex=0;
  values.forEach((value,index)=>{cumulative+=value-m;const absolute=Math.abs(cumulative);if(absolute>maxAbs){maxAbs=absolute;maxIndex=index;}});
  const standardized=maxAbs/(sigma*Math.sqrt(values.length));
  return {family:'CHANGE_POINT',status:'EXECUTED',executionLevel:'BOUNDED_SCREENING',result:{edgeId,n:values.length,mean:m,standardDeviation:sigma,maxStandardizedCusum:standardized,boundaryIndex:maxIndex,boundaryAt:series[maxIndex]?.at??null,series},missing:[],limitations:['No p-value or causal interpretation is produced. A formal change-point estimator may still be required.'],evidenceRefs:evidenceRefs(history),historyEventIds:history.map(x=>x.eventId),boundary:'This is a bounded screening statistic over persisted comparable epochs; it may nominate a change boundary but cannot establish regime change by itself.'};
}

function executeSojourn(history:EpochRecord[]): ScientificMethodExecution {
  const observations=history.flatMap((epoch)=>rows(epoch.snapshot.temporalCoordinates)
    .filter((coordinate)=>coordinate.basis==='STATE_OCCUPANCY')
    .map((coordinate)=>({duration:num(coordinate.value),censoring:String(epoch.snapshot.censoring??'UNKNOWN'),eventId:epoch.eventId})))
    .filter((item):item is {duration:number;censoring:string;eventId:string}=>item.duration!==null&&item.duration>=0);
  if(observations.length<2){
    return {family:'SURVIVAL_SOJOURN',status:'ABSTAINED',executionLevel:'INSUFFICIENT',result:null,missing:['at least two persisted state-occupancy observations with censoring state'],limitations:[],evidenceRefs:evidenceRefs(history),historyEventIds:history.map(x=>x.eventId),boundary:'Sparse occupancy history cannot support a persistence estimate.'};
  }
  const ordered=[...observations].sort((a,b)=>a.duration-b.duration);
  let atRisk=ordered.length; let survival=1;
  const curve:Array<{duration:number;atRisk:number;events:number;censored:number;survival:number}>=[];
  for(const duration of unique(ordered.map(x=>x.duration))){
    const atTime=ordered.filter(x=>x.duration===duration);
    const events=atTime.filter(x=>x.censoring==='CLOSED').length;
    const censored=atTime.length-events;
    const before=atRisk;
    if(before>0&&events>0)survival*=1-(events/before);
    curve.push({duration,atRisk:before,events,censored,survival});
    atRisk-=atTime.length;
  }
  const durations=observations.map(x=>x.duration);
  return {family:'SURVIVAL_SOJOURN',status:'EXECUTED',executionLevel:'DESCRIPTIVE_EMPIRICAL',result:{n:observations.length,meanDuration:mean(durations),medianDuration:median(durations),closed:observations.filter(x=>x.censoring==='CLOSED').length,censored:observations.filter(x=>x.censoring!=='CLOSED').length,empiricalSurvival:curve},missing:[],limitations:['Occupancy units are inherited from the persisted field coordinate and must be comparable. Informative censoring is not resolved automatically.'],evidenceRefs:evidenceRefs(history),historyEventIds:history.map(x=>x.eventId),boundary:'Empirical sojourn/survival description only; it does not establish a stationary duration law.'};
}

function executeMarkov(history:EpochRecord[]): ScientificMethodExecution {
  const transitions=relationRows(history).filter(x=>x.previousState&&x.currentState&&x.previousState!==x.currentState);
  if(transitions.length<3){
    return {family:'MARKOV_SEMI_MARKOV',status:'ABSTAINED',executionLevel:'INSUFFICIENT',result:null,missing:['at least three persisted comparable state transitions'],limitations:[],evidenceRefs:evidenceRefs(history),historyEventIds:history.map(x=>x.eventId),boundary:'A transition model is not fit from insufficient recurrence.'};
  }
  const counts:Record<string,Record<string,number>>={};
  for(const item of transitions){
    const from=item.previousState as string,to=item.currentState as string;
    counts[from]??={}; counts[from][to]=(counts[from][to]??0)+1;
  }
  const probabilities=Object.fromEntries(Object.entries(counts).map(([from,toCounts])=>{
    const total=Object.values(toCounts).reduce((sum,value)=>sum+value,0);
    return [from,Object.fromEntries(Object.entries(toCounts).map(([to,count])=>[to,count/total]))];
  }));
  return {family:'MARKOV_SEMI_MARKOV',status:'EXECUTED',executionLevel:'DESCRIPTIVE_EMPIRICAL',result:{transitionCount:transitions.length,counts,empiricalTransitionProbabilities:probabilities},missing:[],limitations:['Transition probabilities are empirical frequencies; stationarity, hidden states and Markov assumptions are not established.'],evidenceRefs:evidenceRefs(history),historyEventIds:history.map(x=>x.eventId),boundary:'Observed transition structure is summarized without claiming a validated Markov or semi-Markov generative model.'};
}

function executeStateSpace(node:CanonicalGraphNode,history:EpochRecord[]): ScientificMethodExecution {
  const stateEquation=typeof node.attributes.stateEquation==='string'?node.attributes.stateEquation:null;
  const observationEquation=typeof node.attributes.observationEquation==='string'?node.attributes.observationEquation:null;
  if(!stateEquation||!observationEquation){
    return {family:'STATE_SPACE',status:'ABSTAINED',executionLevel:'MODEL_REQUIRED',result:null,missing:['declared state equation','declared observation equation'],limitations:['SFI will not invent latent-state equations from graph geometry.'],evidenceRefs:evidenceRefs(history),historyEventIds:history.map(x=>x.eventId),boundary:'State-space execution remains blocked until model equations and measurement semantics are explicitly declared or selected by a validated method owner.'};
  }
  return {family:'STATE_SPACE',status:'ABSTAINED',executionLevel:'MODEL_REQUIRED',result:{stateEquation,observationEquation},missing:['validated state-space executor for the declared equations'],limitations:['Equations are present but no canonical solver is registered in this runtime.'],evidenceRefs:evidenceRefs(history),historyEventIds:history.map(x=>x.eventId),boundary:'Declared equations do not imply execution; Method Lab or another registered solver must own estimation.'};
}

function executePointProcess(history:EpochRecord[]): ScientificMethodExecution {
  const times=unique(history.map(x=>Date.parse(x.occurredAt)).filter(Number.isFinite)).sort((a,b)=>a-b);
  if(times.length<4){
    return {family:'POINT_PROCESS',status:'ABSTAINED',executionLevel:'INSUFFICIENT',result:null,missing:['at least four persisted observed epoch times'],limitations:[],evidenceRefs:evidenceRefs(history),historyEventIds:history.map(x=>x.eventId),boundary:'Sparse timing cannot support recurrence analysis.'};
  }
  const intervals=times.slice(1).map((time,index)=>(time-times[index])/1000);
  const m=mean(intervals) as number;
  const sigma=sd(intervals);
  return {family:'POINT_PROCESS',status:'EXECUTED',executionLevel:'DESCRIPTIVE_EMPIRICAL',result:{eventCount:times.length,firstObservedAt:new Date(times[0]).toISOString(),lastObservedAt:new Date(times.at(-1) as number).toISOString(),intervalSeconds:intervals,meanIntervalSeconds:m,intervalCoefficientOfVariation:sigma===null||m===0?null:sigma/m},missing:[],limitations:['This describes event timing only. Unknown detection exposure or sampling cadence prevents treating it as a fitted intensity process.'],evidenceRefs:evidenceRefs(history),historyEventIds:history.map(x=>x.eventId),boundary:'Timing structure is observed; point-process intensity, causality and periodicity remain unestablished without an explicit observation-exposure model.'};
}

function executeDynamical(history:EpochRecord[]): ScientificMethodExecution {
  const capacities=history.map(x=>row(x.snapshot.capacity)).filter(x=>Object.keys(x).length>0);
  const usable=capacities.filter(x=>num(x.perturbationMagnitude)!==null&&typeof x.response==='string'&&strings(x.evidenceRefs).length>0);
  if(usable.length<2){
    return {family:'DYNAMICAL_SYSTEMS',status:'ABSTAINED',executionLevel:'INSUFFICIENT',result:null,missing:['at least two evidence-linked perturbation/RETURN epochs with measured magnitude'],limitations:[],evidenceRefs:evidenceRefs(history),historyEventIds:history.map(x=>x.eventId),boundary:'A single perturbation or unlabeled response cannot establish response dynamics.'};
  }
  const responses:Record<string,number>={};
  for(const item of usable){const response=String(item.response);responses[response]=(responses[response]??0)+1;}
  const magnitudes=usable.map(x=>num(x.perturbationMagnitude) as number);
  return {family:'DYNAMICAL_SYSTEMS',status:'EXECUTED',executionLevel:'DESCRIPTIVE_EMPIRICAL',result:{n:usable.length,minPerturbation:Math.min(...magnitudes),maxPerturbation:Math.max(...magnitudes),responses},missing:[],limitations:['Observed perturbation/response pairs do not establish stability, basin geometry or safe operating limits.'],evidenceRefs:evidenceRefs(history),historyEventIds:history.map(x=>x.eventId),boundary:'This is an empirical response map only. A dynamical-system model requires repeated comparable state trajectories and explicit state variables.'};
}

function executeNetwork(node:CanonicalGraphNode,edges:CanonicalGraphEdge[],history:EpochRecord[]): ScientificMethodExecution {
  const adjacent=edges.filter(e=>e.sourceNodeId===node.nodeId||e.targetNodeId===node.nodeId);
  const neighbors=unique(adjacent.map(e=>e.sourceNodeId===node.nodeId?e.targetNodeId:e.sourceNodeId));
  if(adjacent.length<2){
    return {family:'NETWORK_SCIENCE',status:'ABSTAINED',executionLevel:'INSUFFICIENT',result:null,missing:['at least two comparable adjacent relations'],limitations:[],evidenceRefs:evidenceRefs(history),historyEventIds:history.map(x=>x.eventId),boundary:'Single-edge local structure cannot support a relational configuration measure.'};
  }
  const neighborSet=new Set(neighbors);
  const internal=edges.filter(e=>neighborSet.has(e.sourceNodeId)&&neighborSet.has(e.targetNodeId));
  const possible=neighbors.length>1?(neighbors.length*(neighbors.length-1))/2:0;
  const density=possible>0?Math.min(1,internal.length/possible):0;
  return {family:'NETWORK_SCIENCE',status:'EXECUTED',executionLevel:'DESCRIPTIVE_EMPIRICAL',result:{degree:neighbors.length,weightedDegree:adjacent.reduce((sum,e)=>sum+e.weight,0),neighborInternalEdges:internal.length,localNeighborDensity:density},missing:[],limitations:['Metrics depend on the declared graph boundary, relation semantics and missing-edge process.'],evidenceRefs:unique([...evidenceRefs(history),...adjacent.flatMap(e=>e.lineage)]),historyEventIds:history.map(x=>x.eventId),boundary:'Graph structure is measured within the current canonical boundary; topology alone does not establish causal coupling or emergence.'};
}

function executeActiveLearning(reading:FieldScientificReading,history:EpochRecord[]): ScientificMethodExecution {
  const next=reading.methodCompetition.nextObservation;
  if(!next){
    return {family:'ACTIVE_LEARNING',status:'ABSTAINED',executionLevel:'INSUFFICIENT',result:null,missing:['a discriminating next observation derived from explicit rival method/hypothesis structure'],limitations:[],evidenceRefs:evidenceRefs(history),historyEventIds:history.map(x=>x.eventId),boundary:'No observation is selected when discrimination value is not established.'};
  }
  return {family:'ACTIVE_LEARNING',status:'EXECUTED',executionLevel:'DESCRIPTIVE_EMPIRICAL',result:{nextObservation:next,selectionBasis:reading.methodCompetition.candidates.map(x=>({family:x.family,assumptionCheck:x.assumptionCheck,missing:x.missing}))},missing:[],limitations:['This is a bounded discriminating-observation proposal, not a guarantee of maximal information gain.'],evidenceRefs:evidenceRefs(history),historyEventIds:history.map(x=>x.eventId),boundary:'Active observation may propose what to observe next; acquisition and any material perturbation remain separate governed operations.'};
}

export function executeScientificMethodsForNode(input:{
  node:CanonicalGraphNode;
  edges:CanonicalGraphEdge[];
  reading:FieldScientificReading;
  history:EpochRecord[];
}) {
  const families=unique(input.reading.methodCompetition.candidates.filter(x=>x.assumptionCheck==='OBSERVABLE').map(x=>x.family));
  const executions:ScientificMethodExecution[]=[];
  for(const family of families){
    if(family==='CHANGE_POINT')executions.push(executeChangePoint(input.history));
    else if(family==='SURVIVAL_SOJOURN')executions.push(executeSojourn(input.history));
    else if(family==='MARKOV_SEMI_MARKOV')executions.push(executeMarkov(input.history));
    else if(family==='STATE_SPACE')executions.push(executeStateSpace(input.node,input.history));
    else if(family==='POINT_PROCESS')executions.push(executePointProcess(input.history));
    else if(family==='DYNAMICAL_SYSTEMS')executions.push(executeDynamical(input.history));
    else if(family==='NETWORK_SCIENCE')executions.push(executeNetwork(input.node,input.edges,input.history));
    else if(family==='ACTIVE_LEARNING')executions.push(executeActiveLearning(input.reading,input.history));
  }
  return executions;
}

export async function persistScientificMethodExecutions(input:{
  nodeId:string;
  actorId:string;
  trigger:string;
  executions:ScientificMethodExecution[];
}) {
  if(!input.executions.length)return {ok:true as const,persisted:false as const,skipped:true as const,reason:'NO_METHOD_EXECUTION'};
  const fingerprint=sha256({
    contract:SFI_SCIENTIFIC_METHOD_RUNTIME_CONTRACT,
    nodeId:input.nodeId,
    executions:input.executions.map(x=>({family:x.family,status:x.status,result:x.result,historyEventIds:x.historyEventIds})),
  });
  const eventId=`jr-science:${fingerprint}`;
  const db=createServiceSupabaseClient();
  const existing=await db.from('epistemic_events').select('event_id').eq('event_id',eventId).maybeSingle();
  if(existing.data?.event_id)return {ok:true as const,persisted:false as const,skipped:true as const,reason:'IDENTICAL_METHOD_RESULT_ALREADY_PERSISTED',eventId,fingerprint};

  const event=await appendEpistemicEvent({
    eventId,
    eventName:'SFI_FIELD_SCIENTIFIC_METHODS_EXECUTED',
    epistemicClass:'derived',
    confidence:1,
    occurredAt:new Date().toISOString(),
    source:{sourceId:input.actorId,sourceType:input.trigger},
    logbookId:`FIELD_METHOD:${input.nodeId}`,
    lineage:unique(input.executions.flatMap(x=>[...x.evidenceRefs,...x.historyEventIds])),
    payload:{
      contract:SFI_SCIENTIFIC_METHOD_RUNTIME_CONTRACT,
      fingerprint,
      nodeId:input.nodeId,
      actorId:input.actorId,
      trigger:input.trigger,
      executions:input.executions,
      canonicalMutation:false,
      observedClaim:false,
      causalClaim:false,
      boundary:'Scientific runtime results are DERIVED analyses over persisted field history. An executed descriptive/screening method is not observation, evidence admission, causality, regime establishment, canon or RETURN.',
    },
  });
  return event.ok
    ? {ok:true as const,persisted:true as const,skipped:false as const,eventId,fingerprint}
    : {ok:false as const,persisted:false as const,skipped:false as const,eventId,fingerprint,error:event.error};
}
