import type { CanonicalGraphEdge, CanonicalGraphNode } from '../../../packages/graph/src';

export const SFI_FIELD_SCIENTIFIC_READING_CONTRACT = 'SFI-FIELD-SCIENTIFIC-READING-1.0' as const;

type Row = Record<string, unknown>;
export type TemporalBasis = 'SEQUENCE'|'CYCLE'|'RECURRENCE'|'PHASE'|'STATE_OCCUPANCY'|'CHRONOLOGY';
export type TemporalCoordinate = { basis: TemporalBasis; value: number|string; source: string };
export type ResolutionLevel = 'OBSERVATION'|'EVENT'|'TRANSITION'|'CYCLE'|'PHENOMENON'|'REGIME'|'SYSTEM_HISTORY';

function record(v: unknown): Row { return v && typeof v === 'object' && !Array.isArray(v) ? v as Row : {}; }
function txt(v: unknown) { return typeof v === 'string' && v.trim() ? v.trim() : null; }
function num(v: unknown) { const n=Number(v); return v !== null && v !== '' && Number.isFinite(n) ? n : null; }
function firstText(a: Row, keys: string[]) { for (const k of keys) { const v=txt(a[k]); if(v) return {value:v,source:k}; } return null; }
function firstNum(a: Row, keys: string[]) { for (const k of keys) { const v=num(a[k]); if(v!==null) return {value:v,source:k}; } return null; }
function list(v: unknown) { return Array.isArray(v) ? v.filter((x):x is string=>typeof x==='string'&&Boolean(x.trim())).map(x=>x.trim()) : []; }

export function temporalCoordinates(node: CanonicalGraphNode): TemporalCoordinate[] {
  const a=record(node.attributes); const out: TemporalCoordinate[]=[];
  const sequence=firstNum(a,['sequence','sequenceIndex','sequence_index','transitionIndex','transition_index','eventIndex','event_index','order']);
  if(sequence) out.push({basis:'SEQUENCE',...sequence});
  const cycle=firstNum(a,['cycle','cycleIndex','cycle_index','cycleNumber','cycle_number']);
  if(cycle) out.push({basis:'CYCLE',...cycle});
  const recurrence=firstNum(a,['recurrence','recurrenceIndex','recurrence_index','recurrenceCount','recurrence_count']);
  const recurrenceText=firstText(a,['recurrencePattern','recurrence_pattern','recurrenceInterval','recurrence_interval']);
  if(recurrence) out.push({basis:'RECURRENCE',...recurrence}); else if(recurrenceText) out.push({basis:'RECURRENCE',...recurrenceText});
  const phase=firstText(a,['phase','temporalPhase','temporal_phase','cyclePhase','cycle_phase','statePhase','state_phase']);
  if(phase) out.push({basis:'PHASE',...phase});
  const occupancy=firstNum(a,['timeInState','time_in_state','sojourn','sojournDuration','sojourn_duration','stateDuration','state_duration']);
  if(occupancy) out.push({basis:'STATE_OCCUPANCY',...occupancy});
  const chronology=firstText(a,['observedAt','observed_at','occurredAt','occurred_at','effectiveAt','effective_at','releasedAt','released_at','validFrom','valid_from','validTo','valid_to']);
  if(chronology && !Number.isNaN(Date.parse(chronology.value))) out.push({basis:'CHRONOLOGY',value:Date.parse(chronology.value),source:chronology.source});
  return out;
}

export type RelationScientificReading = {
  edgeId:string; source:string; target:string; relation:string;
  currentWeight:number; previousWeight:number|null; weightDelta:number|null;
  currentState:string|null; previousState:string|null;
  latency:number|null; uncertainty:number|null; onset:string|null; offset:string|null;
  recurrence:number|string|null; evidenceRefs:string[]; provenanceBound:boolean;
};
export function relationScientificReading(edge: CanonicalGraphEdge): RelationScientificReading {
  const a=record(edge.attributes);
  const previousWeight=firstNum(a,['previousWeight','previous_weight','priorWeight','prior_weight'])?.value ?? null;
  return {
    edgeId:edge.edgeId,source:edge.sourceNodeId,target:edge.targetNodeId,relation:edge.relation,currentWeight:edge.weight,
    previousWeight,weightDelta:previousWeight===null?null:Math.abs(edge.weight-previousWeight),
    currentState:firstText(a,['relationState','relation_state','state'])?.value??null,
    previousState:firstText(a,['previousRelationState','previous_relation_state','priorState','prior_state'])?.value??null,
    latency:firstNum(a,['latency','latencyMs','latency_ms','lag','lagMs','lag_ms'])?.value??null,
    uncertainty:firstNum(a,['uncertainty','uncertaintyScore','uncertainty_score'])?.value??null,
    onset:firstText(a,['onset','onsetAt','onset_at','validFrom','valid_from'])?.value??null,
    offset:firstText(a,['offset','offsetAt','offset_at','validTo','valid_to'])?.value??null,
    recurrence:firstNum(a,['recurrence','recurrenceIndex','recurrence_index'])?.value??firstText(a,['recurrencePattern','recurrence_pattern'])?.value??null,
    evidenceRefs:[...new Set([...edge.lineage,...list(a.evidenceRefs),...list(a.evidence_refs)])],
    provenanceBound:Boolean(edge.provenance||edge.lineage.length||list(a.evidenceRefs).length||list(a.evidence_refs).length),
  };
}

export type EmergenceReading = {
  state:'OBSERVED_EMERGENCE'|'FIRST_OBSERVED_AT'|'NOT_ESTABLISHED';
  reason:string; observedAt:string|null; priorState:string|null;
};
export function emergenceReading(node: CanonicalGraphNode): EmergenceReading {
  const a=record(node.attributes);
  const current=String(a.presenceState??a.presence_state??a.state??'').toUpperCase();
  const prior=String(a.previousPresenceState??a.previous_presence_state??a.previousState??a.previous_state??'').toUpperCase()||null;
  const observedAt=firstText(a,['observedAt','observed_at','occurredAt','occurred_at'])?.value??null;
  if(/PRESENT|OBSERVED_PRESENCE/.test(current) && prior && /OBSERVED_ABSENCE|ABSENT/.test(prior))
    return {state:'OBSERVED_EMERGENCE',reason:'Observed absence followed by observed presence under the recorded observation boundary.',observedAt,priorState:prior};
  if(/PRESENT|OBSERVED_PRESENCE/.test(current) && (!prior || /UNKNOWN|NOT_OBSERVED/.test(prior)))
    return {state:'FIRST_OBSERVED_AT',reason:'Presence is observed, but prior absence was not established.',observedAt,priorState:prior};
  return {state:'NOT_ESTABLISHED',reason:'The record does not establish an observed absence-to-presence transition.',observedAt,priorState:prior};
}

export type CapacityObservation = {
  interventionRef:string|null; perturbationMagnitude:number|null;
  response:'ABSORPTION'|'RECOVERY'|'REORGANIZATION'|'DEGRADATION'|'FRAGMENTATION'|'UNKNOWN';
  recoveryTime:number|null; evidenceRefs:string[];
};
export function capacityObservation(node: CanonicalGraphNode): CapacityObservation|null {
  const a=record(node.attributes);
  const interventionRef=firstText(a,['interventionRef','intervention_ref','actionRef','action_ref','perturbationRef','perturbation_ref'])?.value??null;
  const responseRaw=String(a.capacityResponse??a.capacity_response??a.responseClass??a.response_class??'').toUpperCase();
  const allowed=['ABSORPTION','RECOVERY','REORGANIZATION','DEGRADATION','FRAGMENTATION'] as const;
  const response=allowed.find(x=>responseRaw.includes(x))??'UNKNOWN';
  const evidenceRefs=[...new Set([...node.lineage,...list(a.evidenceRefs),...list(a.evidence_refs),...list(a.returnEvidenceRefs),...list(a.return_evidence_refs)])];
  if(!interventionRef && response==='UNKNOWN' && !evidenceRefs.length) return null;
  return {interventionRef,perturbationMagnitude:firstNum(a,['perturbationMagnitude','perturbation_magnitude','interventionMagnitude','intervention_magnitude'])?.value??null,response,recoveryTime:firstNum(a,['recoveryTime','recovery_time','timeToRecovery','time_to_recovery'])?.value??null,evidenceRefs};
}

export type ScientificMethodCandidate = {
  family:'CHANGE_POINT'|'SURVIVAL_SOJOURN'|'MARKOV_SEMI_MARKOV'|'STATE_SPACE'|'POINT_PROCESS'|'DYNAMICAL_SYSTEMS'|'NETWORK_SCIENCE'|'ACTIVE_LEARNING';
  question:string; dataRequired:string[]; assumptions:string[]; failureModes:string[]; output:string; falsificationCondition:string; computationalCost:'LOW'|'MEDIUM'|'HIGH';
};
export function scientificMethodCandidates(node: CanonicalGraphNode, edges: CanonicalGraphEdge[]): ScientificMethodCandidate[] {
  const coords=temporalCoordinates(node); const adjacent=edges.filter(e=>e.sourceNodeId===node.nodeId||e.targetNodeId===node.nodeId).map(relationScientificReading);
  const out:ScientificMethodCandidate[]=[];
  const add=(x:ScientificMethodCandidate)=>{if(!out.some(y=>y.family===x.family))out.push(x)};
  if(coords.some(x=>x.basis==='SEQUENCE'||x.basis==='CHRONOLOGY') && adjacent.some(x=>x.previousState||x.weightDelta!==null)) add({family:'CHANGE_POINT',question:'Did the observed relational/state process change at a bounded point?',dataRequired:['ordered observations','comparable state or relation measure'],assumptions:['ordering is meaningful','measurement definition is stable across compared observations'],failureModes:['sparse observations','measurement drift','retrospective boundary selection'],output:'change-point candidate with uncertainty',falsificationCondition:'additional comparable observations do not preserve the detected change or support a rival boundary',computationalCost:'MEDIUM'});
  if(coords.some(x=>x.basis==='STATE_OCCUPANCY')) add({family:'SURVIVAL_SOJOURN',question:'How long does the observed state persist before transition?',dataRequired:['state entry/exit or censoring','comparable occupancy observations'],assumptions:['state definition is stable','censoring is represented'],failureModes:['unrecorded exits','informative censoring','mixed state definitions'],output:'sojourn/time-to-event estimate',falsificationCondition:'new occupancy observations are incompatible with the estimated persistence distribution',computationalCost:'MEDIUM'});
  if(coords.some(x=>x.basis==='CYCLE'||x.basis==='RECURRENCE') && adjacent.some(x=>x.currentState||x.previousState)) add({family:'MARKOV_SEMI_MARKOV',question:'Do observed state transitions recur with stable transition/sojourn structure?',dataRequired:['repeated state transitions','state identity','ordering'],assumptions:['states are distinguishable','sufficient repeated transitions exist'],failureModes:['hidden confounding states','nonstationarity','insufficient transitions'],output:'transition/sojourn structure candidate',falsificationCondition:'prospective transitions materially violate the fitted transition structure',computationalCost:'MEDIUM'});
  if(adjacent.length>=2 && adjacent.filter(x=>x.provenanceBound).length>=2) add({family:'NETWORK_SCIENCE',question:'Which observed relational configuration changes with the field?',dataRequired:['provenance-bound nodes and relations','comparable relation definition'],assumptions:['edges represent comparable relations','graph boundary is declared'],failureModes:['boundary bias','missing edges','weight semantics mismatch'],output:'relational structure measures/candidates',falsificationCondition:'structure disappears or reverses under equivalent boundary/resolution',computationalCost:'LOW'});
  if(adjacent.some(x=>x.currentState==='CHALLENGED'||x.previousState==='CHALLENGED')) add({family:'ACTIVE_LEARNING',question:'Which next observation best separates the remaining rival explanations?',dataRequired:['explicit rivals','candidate observations','observable outcomes'],assumptions:['candidate observations are feasible','outcomes discriminate rivals'],failureModes:['non-discriminating measurement','unobservable outcome','rivals not materially distinct'],output:'next discriminating observation',falsificationCondition:'selected observation fails to reduce the declared rival set under its stopping condition',computationalCost:'LOW'});
  return out;
}

export type FieldScientificReading = {
  contract:typeof SFI_FIELD_SCIENTIFIC_READING_CONTRACT;
  temporal:{coordinates:TemporalCoordinate[];availableResolutions:ResolutionLevel[];multipleClocks:boolean};
  relations:RelationScientificReading[];
  emergence:EmergenceReading;
  capacity:CapacityObservation|null;
  methodCandidates:ScientificMethodCandidate[];
  reversibility:{sourceObservationRefs:string[];aggregationRefs:string[];phenomenonRefs:string[];reconstructable:boolean};
  boundaries:string[];
};
export function deriveFieldScientificReading(node: CanonicalGraphNode, edges: CanonicalGraphEdge[]): FieldScientificReading {
  const a=record(node.attributes); const coordinates=temporalCoordinates(node);
  const relations=edges.filter(e=>e.sourceNodeId===node.nodeId||e.targetNodeId===node.nodeId).map(relationScientificReading);
  const sourceObservationRefs=[...new Set([...node.lineage,...list(a.sourceObservationRefs),...list(a.source_observation_refs)])];
  const aggregationRefs=[...new Set([...list(a.aggregationRefs),...list(a.aggregation_refs)])];
  const phenomenonRefs=[...new Set([...list(a.phenomenonRefs),...list(a.phenomenon_refs)])];
  const available=new Set<ResolutionLevel>(['OBSERVATION']);
  if(coordinates.some(x=>x.basis==='SEQUENCE'||x.basis==='CHRONOLOGY')) available.add('EVENT');
  if(relations.some(x=>x.previousState||x.weightDelta!==null)) available.add('TRANSITION');
  if(coordinates.some(x=>x.basis==='CYCLE'||x.basis==='RECURRENCE'||x.basis==='PHASE')) available.add('CYCLE');
  if(phenomenonRefs.length||String(node.ontologyType).toUpperCase()==='PHENOMENON') available.add('PHENOMENON');
  const regimeDeclared=Boolean(firstText(a,['regime','regimeState','regime_state','regimeChange','regime_change']));
  if(regimeDeclared) available.add('REGIME');
  if(coordinates.length>1||sourceObservationRefs.length>1) available.add('SYSTEM_HISTORY');
  return {
    contract:SFI_FIELD_SCIENTIFIC_READING_CONTRACT,
    temporal:{coordinates,availableResolutions:[...available],multipleClocks:new Set(coordinates.map(x=>x.basis)).size>1},
    relations,
    emergence:emergenceReading(node),
    capacity:capacityObservation(node),
    methodCandidates:scientificMethodCandidates(node,edges),
    reversibility:{sourceObservationRefs,aggregationRefs,phenomenonRefs,reconstructable:sourceObservationRefs.length>0 && (aggregationRefs.length===0||phenomenonRefs.length===0||Boolean(node.provenance))},
    boundaries:['NO_OBSERVED_ABSENCE_NO_EMERGENCE','RECURRENCE_NOT_ATTRACTOR','METHOD_CANDIDATE_NOT_METHOD_RESULT','CAPACITY_REQUIRES_OBSERVED_PERTURBATION_RETURN','GEOMETRY_READING_NOT_CAUSAL_FORCE','AGGREGATION_MUST_PRESERVE_SOURCE_LINEAGE'],
  };
}
