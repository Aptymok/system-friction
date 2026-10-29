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
  if(input.contract!==SFI_MIHM_TYPED_FIELD_AUDIT) reasons.push('TYPED_FIELD_CONTRACT_REQUIRED');
  const measured:MihmFieldSample[]=[];
  const excludedSampleIds:string[]=[];
  const keys=new Set<string>();
  const units=new Map<string,string>();
  const families=new Map<string,MihmFieldFamily>();
  for(const s of input.samples) {
    const k=s.nodeRef?.id+'|'+s.dimensionRef?.id+'|'+s.observedAt;
    if(keys.has(k)) reasons.push('DUPLICATE_SAMPLE:'+k);
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
    if(units.has(unitKey)&&units.get(unitKey)!==s.unit)reasons.push('DIMENSION_UNIT_CONFLICT:'+unitKey);
    units.set(unitKey,s.unit);
    if(families.has(unitKey)&&families.get(unitKey)!==s.fieldFamily)reasons.push('DIMENSION_FAMILY_CONFLICT:'+unitKey);
    families.set(unitKey,s.fieldFamily);
    if(validIso(s.observedAt)&&Number.isFinite(cut)&&Date.parse(s.observedAt)>cut)
      reasons.push('FUTURE_OBSERVATION_AT_CUT:'+s.id);
    if(s.state==='MEASURED'&&validIso(s.observedAt)&&validIso(s.availableAt)&&
       Date.parse(s.availableAt)<Date.parse(s.observedAt)) reasons.push('SOURCE_AVAILABLE_BEFORE_OBSERVATION:'+s.id);
    if(s.state==='MEASURED'&&validRef(s.sourceRef)&&!sourceIds.has(s.sourceRef.id))
      reasons.push('SOURCE_NOT_ADMISSIBLE_IN_PARENT:'+s.id);
    if(eligibleSample(s,cut)&&validIso(s.observedAt)&&Date.parse(s.availableAt as string)>=Date.parse(s.observedAt) &&
       sourceIds.has(s.sourceRef!.id) &&
       validIso(s.observedAt)&&Date.parse(s.observedAt)<=cut) measured.push(s);
    else excludedSampleIds.push(s.id);
  }
  const limitByDimension=new Map<string,MihmFieldViabilityLimit[]>();
  for(const lim of input.viabilityLimits){
    if(!lim.id?.trim()||!dimensionIds.has(lim.dimensionRef?.id)||
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
    if(limits.length===1)oriented=limits[0].direction;
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
    if(!attractorIds.has(a.attractorRef?.id)||!dimensionIds.has(a.dimensionRef?.id)||
      !Number.isFinite(a.lower)||!Number.isFinite(a.upper)||a.lower>a.upper||
      !a.unit?.trim()||units.has(a.dimensionRef.id)&&units.get(a.dimensionRef.id)!==a.unit)
      reasons.push('INVALID_ATTRACTOR:'+a.id);
    const records=measured.filter(s=>s.dimensionRef.id===a.dimensionRef.id)
      .sort((x,y)=>Date.parse(x.observedAt)-Date.parse(y.observedAt));
    const inBand=records.slice(-3).filter(s=>s.value!==null&&s.value>=a.lower&&s.value<=a.upper).length;
    attractorChecks.push({attractorId:a.id,repeatedInBand:inBand,
      state:records.length>=3&&inBand===3?'REPEATED_BAND_OCCUPANCY_ONLY':'INSUFFICIENT_OBSERVATIONS',
      attractorIdentified:false,
    });
  }
  const resourceGroup=new Map<string,MihmResourceReading[]>();
  for(const r of input.resources){
    if(!validRef(r.cycleRef)||!r.unit?.trim()||!['TOKENS','CPU_TIME','API_CALLS','MONEY','ENERGY','OTHER'].includes(r.resource)||
      !validIso(r.observedAt)||(r.availableAt!==null&&!validIso(r.availableAt))||
      r.amount!==null&&(!Number.isFinite(r.amount)||r.amount<0)||
      (r.state==='MISSING'||r.state==='CONTRADICTED')&&r.amount!==null)
      reasons.push('INVALID_RESOURCE_READING:'+r.cycleRef?.id);
    const k=r.resource+'|'+r.unit;
    const a=resourceGroup.get(k)??[];a.push(r);resourceGroup.set(k,a);
  }
  const resourceTotals:MihmTypedFieldAudit['resourceTotals']=[];
  for(const [key,entries] of resourceGroup){
    const good=entries.filter(r=>r.state==='MEASURED'&&r.amount!==null&&validRef(r.sourceRef)&&
      validIso(r.availableAt)&&validIso(r.observedAt)&&Date.parse(r.availableAt)<=cut&&
      Date.parse(r.availableAt)>=Date.parse(r.observedAt)&&Date.parse(r.observedAt)<=cut);
    const complete=good.length===entries.length;
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
