import { assessMihmInstrumentCompatibility, type MihmInstrumentState, type MihmInstrumentLink } from './instrumentContract';
import { calculateMihmNodeState, simulateMihmRedistribution, projectMihmDynamics, compareMihmForecasts, sampleMihmUncertainty, screenMihmPathologies } from '../../../packages/mihm-core/src';
/**
 * MIHM Foundation typed-field audit (research-only adapter).
 *
 * Reuses the parent SFI system, source-vintage gate and canonical Phi taxonomy.
 * This module never runs a second engine, mutates the reduced kernel, scores
 * canonical Phi, issues forecasts, executes actions or records RETURN.
 * A typed field and chronological co-occurrence are not causal homeostasis.
 */
import type { SfiCanonicalRef } from '../../core/contracts/epistemic';
import type { SfiSystemEntityKind } from '../../core/contracts/system';
import {
  assessSfiMihmFoundation,
  type SfiMihmFoundationFrame,
} from './foundationResearchContract';

export const SFI_MIHM_TYPED_FIELD_AUDIT = 'SFI-MIHM-TYPED-FIELD-AUDIT-0.1' as const;

export type MihmFieldFamily =
  | 'PHYSICAL' | 'INFORMATIONAL' | 'OPERATIONAL' | 'INSTITUTIONAL'
  | 'ECONOMIC' | 'TEMPORAL' | 'COGNITIVE' | 'DIGITAL' | 'ECOLOGICAL';
export type MihmFieldSampleState =
  | 'MEASURED' | 'MISSING' | 'INFERRED' | 'SIMULATED' | 'CONTRADICTED';
export type MihmFieldSample = {
  id: string;
  entityKind: Extract<SfiSystemEntityKind, 'STATE' | 'DIMENSION'>;
  nodeRef: SfiCanonicalRef;
  dimensionRef: SfiCanonicalRef;
  fieldFamily: MihmFieldFamily;
  unit: string;
  value: number | null;
  state: MihmFieldSampleState;
  observedAt: string;
  availableAt: string | null;
  sourceRef: SfiCanonicalRef | null;
};
export type MihmFieldViabilityLimit = {
  id: string;
  dimensionRef: SfiCanonicalRef;
  unit: string;
  lower: number | null;
  upper: number | null;
  direction: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER' | 'UNKNOWN';
};
export type MihmFieldAttractor = {
  id: string;
  attractorRef: SfiCanonicalRef;
  nodeRef: SfiCanonicalRef;
  dimensionRef: SfiCanonicalRef;
  unit: string;
  lower: number;
  upper: number;
};
export type MihmFieldRelation = {
  relationRef: SfiCanonicalRef;
  sourceNodeRef: SfiCanonicalRef;
  targetNodeRef: SfiCanonicalRef;
  sourceDimensionRef: SfiCanonicalRef;
  targetDimensionRef: SfiCanonicalRef;
  status: 'HYPOTHESIZED' | 'DOCUMENTED';
  lagMs: number | null;
  sourceRefs: SfiCanonicalRef[];
};
export type MihmResourceReading = {
  id: string;
  cycleRef: SfiCanonicalRef;
  resource: 'TOKENS' | 'CPU_TIME' | 'API_CALLS' | 'MONEY' | 'ENERGY' | 'OTHER';
  unit: string;
  amount: number | null;
  state: MihmFieldSampleState;
  sourceRef: SfiCanonicalRef | null;
  observedAt: string;
  availableAt: string | null;
};
export type MihmTypedFieldAuditInput = {
  contract: typeof SFI_MIHM_TYPED_FIELD_AUDIT;
  frame: SfiMihmFoundationFrame;
  samples: MihmFieldSample[];
  viabilityLimits: MihmFieldViabilityLimit[];
  attractors: MihmFieldAttractor[];
  relations: MihmFieldRelation[];
  resources: MihmResourceReading[];
  requestedProjectionHorizonMs: number | null;
};

function validIso(x: unknown): x is string {
  if (typeof x !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(x)) return false;
  const t=Date.parse(x);
  if (!Number.isFinite(t)) return false;
  // Reject normalized nonexistent days, including years' leap-day boundary.
  const datePart=x.slice(0,10);
  const shift=x.endsWith('Z') ? 0 :
    Number(x.slice(-6,-3)) * 60 + Number(x.slice(-2)) * (x.slice(-6,-5)==='-'?-1:1);
  const at=new Date(t+shift*60000);
  return Number.isFinite(at.getTime()) && at.toISOString().slice(0,10)===datePart;
}
const validRef=(x: SfiCanonicalRef | null | undefined): x is SfiCanonicalRef =>
  typeof x?.id==='string' && Boolean(x.id.trim());

function eligibleSample(s: MihmFieldSample, timeCut: number): boolean {
  return s.state==='MEASURED' && s.value!==null && Number.isFinite(s.value)
    && validRef(s.sourceRef) && validIso(s.availableAt)
    && Date.parse(s.availableAt)<=timeCut;
}
function asIds(v: SfiCanonicalRef[]) { return new Set(v.map(x=>x.id)); }
export type MihmTypedFieldAudit = {
  contract: typeof SFI_MIHM_TYPED_FIELD_AUDIT;
  epistemicClass: 'INFERENCE';
  readiness: 'BLOCKED' | 'DOCUMENTARY_DIAGNOSTIC_ONLY';
  reasons: string[];
  acceptedSampleIds: string[];
  excludedSampleIds: string[];
  dimensionTrajectories: Array<{
    nodeId: string; dimensionId: string; family: MihmFieldFamily; unit: string;
    firstAt: string; lastAt: string;
    delta: number; ratePerHour: number;
    interpretation: 'DEGRADATION_CANDIDATE' | 'IMPROVEMENT_CANDIDATE' | 'DIRECTION_UNKNOWN';
    observedLimitViolations: number | null;
  }>;
  propagation: Array<{
    relationId: string;
    state: 'TEMPORAL_ASSOCIATION_CANDIDATE' | 'NOT_IDENTIFIABLE';
    causal: false;
    reason: string;
  }>;
  attractorChecks: Array<{
    attractorId: string;
    repeatedInBand: number;
    state: 'REPEATED_BAND_OCCUPANCY_ONLY' | 'INSUFFICIENT_OBSERVATIONS';
    attractorIdentified: false;
  }>;
  resourceTotals: Array<{
    resource: MihmResourceReading['resource']; unit: string;
    amount: number | null; measuredEntries: number; missingEntries: number;
    status: 'COMPLETE_DECLARED_RECEIPTS' | 'PARTIAL_OR_UNTRUSTED';
  }>;
  requestedProjection: {
    horizonMs: number | null;
    projectedState: null;
    status: 'BLOCKED_NOT_CALIBRATED_OR_INDEPENDENTLY_VALIDATED';
  };
  canonicalPhiCalculated: false;
  homeostasisEstablished: false;
  causalPropagationEstablished: false;
  observedReturnCreated: false;
  externalActionAuthorized: false;
  resourceCostsIndependentlyVerified: false;
};

export function auditMihmTypedField(input: MihmTypedFieldAuditInput): MihmTypedFieldAudit {
  const parent=assessSfiMihmFoundation(input.frame);
  const reasons=[...parent.reasons.map(x=>'PARENT:'+x)];
  const frame=input.frame,m=frame.model;
  const cut=Date.parse(frame.timeCut);
  const nodeIds=asIds(m.nodeRefs),dimensionIds=asIds(m.dimensionRefs);
  const relIds=asIds(m.relationRefs),attractorIds=asIds(m.attractorRefs);
  const sourceIds=new Set(parent.admittedSourceIds);
  const sourceClasses=new Map(frame.sourceVintages.map(v=>[v.sourceId,v.sourceClass]));
  if(input.contract!==SFI_MIHM_TYPED_FIELD_AUDIT) reasons.push('TYPED_FIELD_CONTRACT_REQUIRED');
  let measured:MihmFieldSample[]=[];
  const excludedSampleIds:string[]=[];
  const keys=new Set<string>();
  const units=new Map<string,string>();
  const families=new Map<string,MihmFieldFamily>();
  const conflictedDimensions=new Set<string>();
  for(const s of input.samples) {
    const k=s.nodeRef?.id+'|'+s.dimensionRef?.id+'|'+
      (validIso(s.observedAt)?Date.parse(s.observedAt):s.observedAt);
    if(keys.has(k)) {
      reasons.push('DUPLICATE_SAMPLE:'+k);
      excludedSampleIds.push(s.id);
      continue;
    }
    keys.add(k);
    if(!s.id?.trim()||!nodeIds.has(s.nodeRef?.id)||!dimensionIds.has(s.dimensionRef?.id)||
       !s.unit?.trim()||!validIso(s.observedAt)||!['STATE','DIMENSION'].includes(s.entityKind)||
       !['PHYSICAL','INFORMATIONAL','OPERATIONAL','INSTITUTIONAL','ECONOMIC','TEMPORAL','COGNITIVE','DIGITAL','ECOLOGICAL'].includes(s.fieldFamily)||
       !['MEASURED','MISSING','INFERRED','SIMULATED','CONTRADICTED'].includes(s.state)||
       (s.value!==null&&!Number.isFinite(s.value))||
       ((s.state==='MISSING'||s.state==='CONTRADICTED')&&s.value!==null)||
       (s.state==='MEASURED'&&s.value===null)||
       (s.availableAt!==null&&!validIso(s.availableAt))) reasons.push('INVALID_TYPED_SAMPLE:'+s.id);
    const unitKey=s.dimensionRef?.id;
    if(units.has(unitKey)&&units.get(unitKey)!==s.unit){
      reasons.push('DIMENSION_UNIT_CONFLICT:'+unitKey);
      conflictedDimensions.add(unitKey);
    }
    units.set(unitKey,s.unit);
    if(families.has(unitKey)&&families.get(unitKey)!==s.fieldFamily){
      reasons.push('DIMENSION_FAMILY_CONFLICT:'+unitKey);
      conflictedDimensions.add(unitKey);
    }
    families.set(unitKey,s.fieldFamily);
    if(validIso(s.observedAt)&&Number.isFinite(cut)&&Date.parse(s.observedAt)>cut)
      reasons.push('FUTURE_OBSERVATION_AT_CUT:'+s.id);
    if(s.state==='MEASURED'&&validIso(s.observedAt)&&validIso(s.availableAt)&&
       Date.parse(s.availableAt)<Date.parse(s.observedAt)) reasons.push('SOURCE_AVAILABLE_BEFORE_OBSERVATION:'+s.id);
    if(s.state==='MEASURED'&&validRef(s.sourceRef)&&
      !['REAL_TELEMETRY','REAL_DOCUMENTARY'].includes(sourceClasses.get(s.sourceRef.id)??''))
      reasons.push('MEASURED_FROM_NON_REAL_SOURCE:'+s.id);
    if(s.state==='MEASURED'&&validRef(s.sourceRef)&&!sourceIds.has(s.sourceRef.id))
      reasons.push('SOURCE_NOT_ADMISSIBLE_IN_PARENT:'+s.id);
    if(eligibleSample(s,cut)&&validIso(s.observedAt)&&Date.parse(s.availableAt as string)>=Date.parse(s.observedAt) &&
       sourceIds.has(s.sourceRef!.id) &&
       ['REAL_TELEMETRY','REAL_DOCUMENTARY'].includes(sourceClasses.get(s.sourceRef!.id)??'') &&
       validIso(s.observedAt)&&Date.parse(s.observedAt)<=cut) measured.push(s);
    else excludedSampleIds.push(s.id);
  }
  // A conflicting dimension invalidates the whole series, including earlier samples.
  measured=measured.filter(s=>{
    if(!conflictedDimensions.has(s.dimensionRef.id))return true;
    excludedSampleIds.push(s.id);
    return false;
  });
  const limitByDimension=new Map<string,MihmFieldViabilityLimit[]>();
  for(const lim of input.viabilityLimits){
    if(!lim.id?.trim()||!dimensionIds.has(lim.dimensionRef?.id)||
       !['HIGHER_IS_BETTER','LOWER_IS_BETTER','UNKNOWN'].includes(lim.direction)||
       !lim.unit?.trim()||lim.lower===null&&lim.upper===null||
       lim.lower!==null&&!Number.isFinite(lim.lower)||
       lim.upper!==null&&!Number.isFinite(lim.upper)||
       lim.lower!==null&&lim.upper!==null&&lim.lower>lim.upper||
       units.has(lim.dimensionRef.id)&&units.get(lim.dimensionRef.id)!==lim.unit)
      reasons.push('INVALID_VIABILITY_LIMIT:'+lim.id);
    const a=limitByDimension.get(lim.dimensionRef?.id)??[];
    a.push(lim); limitByDimension.set(lim.dimensionRef?.id,a);
  }
  const series=new Map<string,MihmFieldSample[]>();
  for(const s of measured){const k=s.nodeRef.id+'|'+s.dimensionRef.id;const a=series.get(k)??[];a.push(s);series.set(k,a);}
  const dimensionTrajectories:MihmTypedFieldAudit['dimensionTrajectories']=[];
  for(const a of series.values()){
    a.sort((x,y)=>Date.parse(x.observedAt)-Date.parse(y.observedAt));
    const first=a[0],last=a[a.length-1];
    const durationMs=Date.parse(last.observedAt)-Date.parse(first.observedAt);
    if(durationMs<=0)continue;
    const limits=limitByDimension.get(first.dimensionRef.id)??[];
    let oriented:'HIGHER_IS_BETTER'|'LOWER_IS_BETTER'|'UNKNOWN'='UNKNOWN';
    if(limits.length===1 && ['HIGHER_IS_BETTER','LOWER_IS_BETTER','UNKNOWN'].includes(limits[0].direction))oriented=limits[0].direction;
    const delta=(last.value as number)-(first.value as number);
    const interpreted=oriented==='UNKNOWN'?'DIRECTION_UNKNOWN':
      (delta*(oriented==='HIGHER_IS_BETTER'?1:-1)<0?'DEGRADATION_CANDIDATE':'IMPROVEMENT_CANDIDATE');
    const violations=limits.length===0?null:a.filter(s=>limits.some(l=>
      (l.lower!==null&&(s.value as number)<l.lower)||
      (l.upper!==null&&(s.value as number)>l.upper))).length;
    dimensionTrajectories.push({
      nodeId:first.nodeRef.id,dimensionId:first.dimensionRef.id,family:first.fieldFamily,
      unit:first.unit,firstAt:first.observedAt,lastAt:last.observedAt,
      delta,ratePerHour:delta/(durationMs/3600000),
      interpretation:interpreted,observedLimitViolations:violations,
    });
  }
  const propagation:MihmTypedFieldAudit['propagation']=[];
  for(const edge of input.relations){
    const valid=relIds.has(edge.relationRef?.id)&&nodeIds.has(edge.sourceNodeRef?.id)
      &&nodeIds.has(edge.targetNodeRef?.id)&&dimensionIds.has(edge.sourceDimensionRef?.id)
      &&dimensionIds.has(edge.targetDimensionRef?.id)&&edge.sourceNodeRef.id!==edge.targetNodeRef.id
      &&(edge.lagMs===null||(Number.isFinite(edge.lagMs)&&edge.lagMs>=0))
      &&['HYPOTHESIZED','DOCUMENTED'].includes(edge.status);
    if(!valid)reasons.push('INVALID_RELATION:'+edge.relationRef?.id);
    const from=series.get(edge.sourceNodeRef?.id+'|'+edge.sourceDimensionRef?.id)??[];
    const to=series.get(edge.targetNodeRef?.id+'|'+edge.targetDimensionRef?.id)??[];
    const ordered=from.length>=2&&to.length>=2&&Date.parse(from[0].observedAt)<Date.parse(to[to.length-1].observedAt);
    propagation.push({relationId:edge.relationRef?.id??'UNKNOWN',
      state:valid&&ordered?'TEMPORAL_ASSOCIATION_CANDIDATE':'NOT_IDENTIFIABLE',causal:false,
      reason:valid&&ordered?'Typed relation and chronologically ordered endpoints, NOT a causal transfer estimate.':'No adequate measured pair under a typed relation.',
    });
  }
  const attractorChecks:MihmTypedFieldAudit['attractorChecks']=[];
  for(const a of input.attractors){
    if(!attractorIds.has(a.attractorRef?.id)||!nodeIds.has(a.nodeRef?.id)||
      !dimensionIds.has(a.dimensionRef?.id)||
      !Number.isFinite(a.lower)||!Number.isFinite(a.upper)||a.lower>a.upper||
      !a.unit?.trim()||units.has(a.dimensionRef.id)&&units.get(a.dimensionRef.id)!==a.unit)
      reasons.push('INVALID_ATTRACTOR:'+a.id);
    const records=measured.filter(s=>s.nodeRef.id===a.nodeRef.id&&s.dimensionRef.id===a.dimensionRef.id)
      .sort((x,y)=>Date.parse(x.observedAt)-Date.parse(y.observedAt));
    const inBand=records.slice(-3).filter(s=>s.value!==null&&s.value>=a.lower&&s.value<=a.upper).length;
    attractorChecks.push({attractorId:a.id,repeatedInBand:inBand,
      state:records.length>=3&&inBand===3?'REPEATED_BAND_OCCUPANCY_ONLY':'INSUFFICIENT_OBSERVATIONS',
      attractorIdentified:false,
    });
  }
  const resourceGroup=new Map<string,MihmResourceReading[]>();
  const resourceIdentity=new Set<string>(),conflictedResources=new Set<string>();
  for(const r of input.resources){
    const key=r.resource+'|'+r.unit;
    const identity=r.id+'|'+r.cycleRef?.id+'|'+r.resource+'|'+r.unit+'|'+
      (validIso(r.observedAt)?Date.parse(r.observedAt):r.observedAt);
    if(resourceIdentity.has(identity)){
      reasons.push('DUPLICATE_RESOURCE_RECEIPT:'+r.id);
      conflictedResources.add(key);
    }
    resourceIdentity.add(identity);
    if(!r.id?.trim()||!validRef(r.cycleRef)||!r.unit?.trim()||!['TOKENS','CPU_TIME','API_CALLS','MONEY','ENERGY','OTHER'].includes(r.resource)||
      !validIso(r.observedAt)||(r.availableAt!==null&&!validIso(r.availableAt))||
      r.amount!==null&&(!Number.isFinite(r.amount)||r.amount<0)||
      (r.state==='MISSING'||r.state==='CONTRADICTED')&&r.amount!==null||
      (r.state==='MEASURED'&&r.amount===null)||
      validIso(r.availableAt)&&validIso(r.observedAt)&&Date.parse(r.availableAt)<Date.parse(r.observedAt))
      reasons.push('INVALID_RESOURCE_READING:'+r.cycleRef?.id);
    const k=r.resource+'|'+r.unit;
    const a=resourceGroup.get(k)??[];a.push(r);resourceGroup.set(k,a);
  }
  const resourceTotals:MihmTypedFieldAudit['resourceTotals']=[];
  for(const [key,entries] of resourceGroup){
    const good=entries.filter(r=>r.state==='MEASURED'&&r.amount!==null&&Number.isFinite(r.amount)&&r.amount>=0&&validRef(r.sourceRef)&&
      validIso(r.availableAt)&&validIso(r.observedAt)&&
      sourceIds.has(r.sourceRef!.id)&&
      ['REAL_TELEMETRY','REAL_DOCUMENTARY'].includes(sourceClasses.get(r.sourceRef!.id)??'')&&
      Date.parse(r.availableAt)<=cut&&
      Date.parse(r.availableAt)>=Date.parse(r.observedAt)&&Date.parse(r.observedAt)<=cut);
    const complete=good.length===entries.length&&!conflictedResources.has(key);
    resourceTotals.push({resource:entries[0].resource,unit:entries[0].unit,
      amount:complete?good.reduce((n,r)=>n+(r.amount as number),0):null,
      measuredEntries:good.length,missingEntries:entries.length-good.length,
      status:complete?'COMPLETE_DECLARED_RECEIPTS':'PARTIAL_OR_UNTRUSTED'});
  }
  if(input.requestedProjectionHorizonMs!==null &&
    (!Number.isFinite(input.requestedProjectionHorizonMs)||input.requestedProjectionHorizonMs<=0))
    reasons.push('INVALID_PROJECTION_HORIZON');
  if(!measured.length)reasons.push('NO_ELIGIBLE_MEASURED_SAMPLES');
  return {
    contract:SFI_MIHM_TYPED_FIELD_AUDIT,epistemicClass:'INFERENCE',
    readiness:reasons.length?'BLOCKED':'DOCUMENTARY_DIAGNOSTIC_ONLY',reasons,
    acceptedSampleIds:measured.map(x=>x.id),excludedSampleIds,
    dimensionTrajectories,propagation,attractorChecks,resourceTotals,
    requestedProjection:{horizonMs:input.requestedProjectionHorizonMs,projectedState:null,
      status:'BLOCKED_NOT_CALIBRATED_OR_INDEPENDENTLY_VALIDATED'},
    canonicalPhiCalculated:false,homeostasisEstablished:false,
    causalPropagationEstablished:false,observedReturnCreated:false,
    externalActionAuthorized:false,resourceCostsIndependentlyVerified:false,
  };
}

/** Consume an explicit persisted graph declaration; never infer missing samples. */
export function executeMihmTypedFieldForNode(node: {
  nodeId: string; lineage: string[]; attributes: Record<string, unknown>;
}, executedAt: string) {
  const raw=node.attributes?.mihmTypedFieldAudit;
  if(raw===undefined)return null;
  const evidenceRefs=[...new Set(node.lineage??[])];
  const boundary='Derived typed-input screening only; persisted declarations are not independent verification of source values, calibrated dynamics, causality or RETURN.';
  const base={family:'MIHM_TYPED_FIELD' as const,executionLevel:'BOUNDED_SCREENING' as const,
    limitations:[boundary],evidenceRefs,historyEventIds:[] as string[],boundary};
  const blocked=(reason:string)=>({...base,status:'ABSTAINED' as const,
    result:{audit:null,calibration:{status:'NOT_CALIBRATED'},sourceValuesIndependentlyVerified:false},missing:[reason]});
  try {
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return blocked('INVALID_TYPED_FIELD_ENVELOPE');
    const envelope=raw as {caseRef:SfiCanonicalRef;cycleRef:SfiCanonicalRef;input:MihmTypedFieldAuditInput};
    const input=envelope.input;
    if(!validRef(envelope.caseRef)||!validRef(envelope.cycleRef)||!input?.frame ||
       !['samples','resources','relations','attractors','viabilityLimits'].every(k=>Array.isArray((input as unknown as Record<string,unknown>)[k])))
      return blocked('INVALID_TYPED_FIELD_INPUT');
    if(!evidenceRefs.includes(envelope.caseRef.id)||!evidenceRefs.includes(envelope.cycleRef.id))
      return blocked('TYPED_FIELD_CASE_CYCLE_LINEAGE_REQUIRED');
    if(input.frame.boundary?.subjectRef?.id!==node.nodeId)return blocked('TYPED_FIELD_SUBJECT_MISMATCH');
    if(!validIso(executedAt)||!validIso(input.frame.timeCut)||Date.parse(input.frame.timeCut)>Date.parse(executedAt))
      return blocked('TYPED_FIELD_CUTOFF_NOT_AVAILABLE');
    if(!Array.isArray(input.frame.sourceVintages)||input.frame.sourceVintages.some(s=>!s||!evidenceRefs.includes(s.recordRef)))
      return blocked('TYPED_FIELD_SOURCE_LINEAGE_REQUIRED');
    const audit=auditMihmTypedField(input);
    const spec=(raw as {mechanisms?:{
      sourceRef:SfiCanonicalRef;
      normalizedNodes?:Parameters<typeof calculateMihmNodeState>[0];
      arithmeticVersion?:Parameters<typeof calculateMihmNodeState>[1];
      redistribution?:{nodes:Parameters<typeof simulateMihmRedistribution>[0];transfers:Parameters<typeof simulateMihmRedistribution>[1]};
      dynamics?:Parameters<typeof projectMihmDynamics>[0];
      forecasts?:Parameters<typeof compareMihmForecasts>[0];
      uncertainty?:Parameters<typeof sampleMihmUncertainty>[0];
      pathologies?:Parameters<typeof screenMihmPathologies>[0];
    }}).mechanisms;
    if(spec&&(!validRef(spec.sourceRef)||!evidenceRefs.includes(spec.sourceRef.id)||!input.frame.sourceVintages.some(v=>v.recordRef===spec.sourceRef.id&&v.availableAt!==null&&validIso(v.availableAt)&&Date.parse(v.availableAt)<=Date.parse(input.frame.timeCut))))return blocked('MECHANISM_SOURCE_LINEAGE_REQUIRED');
    // Never execute additional models from a blocked metrology frame.
    const mechanisms=spec&&audit.readiness!=='BLOCKED'?{
      mathematics:spec.normalizedNodes?calculateMihmNodeState(spec.normalizedNodes,spec.arithmeticVersion):null,
      redistribution:spec.redistribution?simulateMihmRedistribution(spec.redistribution.nodes,spec.redistribution.transfers):null,
      dynamics:spec.dynamics?projectMihmDynamics(spec.dynamics):null,
      forecastComparison:spec.forecasts?compareMihmForecasts(spec.forecasts,executedAt):null,
      uncertainty:spec.uncertainty?sampleMihmUncertainty(spec.uncertainty):null,
      pathologies:spec.pathologies?screenMihmPathologies(spec.pathologies):null,
      epistemicBoundary:'Declared-model computations and simulations; no canonical Phi, empirical calibration, external action or scientific validation.'
    }:null;
    const linked=raw as {instrumentReadings?:MihmInstrumentState[];instrumentLinks?:MihmInstrumentLink[]};
    const interpretationContradictions=mechanisms?.mathematics?.status==='DERIVED'
      ? (spec?.normalizedNodes??[]).filter(n=>n.E>n.C&&n.L>0).map(n=>'SIGNED_IHG_LATENCY_MASKS_OVERLOAD:'+n.id)
      : [];
    const instrumentCompatibility=assessMihmInstrumentCompatibility({
      readings:linked.instrumentReadings??[],links:linked.instrumentLinks??[],timeCut:input.frame.timeCut,
      contradictions:interpretationContradictions,
    });
    const contradicted=instrumentCompatibility.readiness==='CONTRADICTED';
    return {...base,status:audit.readiness==='BLOCKED'?'ABSTAINED' as const:'EXECUTED' as const,
      result:{caseRef:envelope.caseRef,cycleRef:envelope.cycleRef,audit,mechanisms,instrumentCompatibility,decisionUseBlocked:instrumentCompatibility.readiness!=='COMPATIBLE_FOR_REVIEW',
        calibration:{status:'NOT_CALIBRATED'},sourceValuesIndependentlyVerified:false},
      missing:audit.readiness==='BLOCKED'?audit.reasons:contradicted?instrumentCompatibility.contradictions:[]};
  } catch {
    return blocked('MALFORMED_TYPED_FIELD_INPUT');
  }
}
