/**
 * SFI MIHM foundation research gate v0.1.
 * The MIHM parent is a general systemic formalism, not a new Phi calculator.
 * A MIHM-T claim is a bounded child of that parent, not an independent model.
 * Pure structural and public-source-vintage checking, not an empirical result.
 */
import {
  MIHM_DIMENSIONAL_TRANSFER_MODEL_V0,
  SFI_SYSTEM_CONTRACT,
  SFI_SYSTEM_INVARIANTS,
  type SfiDimensionalTransferV0,
  type SfiSystemBoundaryV1,
  type SfiSystemModelV1,
} from '../../core/contracts/system';
import type { MihmMethodId } from './methodSelectionContract';

export const SFI_MIHM_FOUNDATION_RESEARCH_CONTRACT = 'SFI-MIHM-FOUNDATION-RESEARCH-0.1' as const;

export type MihmSourceVintage = {
  sourceId: string;
  sourceKind: 'OFFICIAL_DOCUMENT' | 'ORIGINAL_LOG' | 'OBSERVATION' | 'MODEL_OUTPUT';
  eventAt: string | null;
  availableAt: string | null;  // public/source admissibility, NOT actor cognition
  recordRef: string;
  sourceClass: 'REAL_DOCUMENTARY' | 'REAL_TELEMETRY' | 'SIMULATED' | 'INFERRED';
};

export type SfiMihmFoundationFrame = {
  contract: typeof SFI_MIHM_FOUNDATION_RESEARCH_CONTRACT;
  systemContract: typeof SFI_SYSTEM_CONTRACT;
  model: SfiSystemModelV1;
  boundary: SfiSystemBoundaryV1;
  primaryMethod: MihmMethodId;
  question: string;
  studyMode: 'DESCRIPTIVE' | 'RETROSPECTIVE' | 'PROSPECTIVE';
  timeCut: string;
  sourceVintages: MihmSourceVintage[];
  // Optional derived temporal representation; it never replaces parent/system.
  temporalExtension?: SfiDimensionalTransferV0 | null;
};

export type SfiMihmFoundationAssessment = {
  contract: typeof SFI_MIHM_FOUNDATION_RESEARCH_CONTRACT;
  readiness: 'READY_FOR_BOUNDED_RESEARCH' | 'BLOCKED';
  reasons: string[];
  admittedSourceIds: string[];
  excludedSourceIds: string[];
  sourceGaps: string[];
  parentModelId: string;
  primaryMethod: MihmMethodId;
  miHmTStatus: 'NOT_REQUESTED' | 'EXPERIMENTAL_CHILD' | 'BLOCKED';
  objective: 'SYSTEMIC_VIABILITY_NOT_GLOBAL_OPTIMUM';
  cimpsPublicationPrerequisite: false;
  canonicalPhiCalculated: false;
  universalPhiIntroduced: false;
  prospectiveValidationClaimed: false;
  causalIdentificationClaimed: false;
  scientificStatus: 'FOUNDATION_RESEARCH_NOT_VALIDATED';
  warnings: string[];
};

const iso = (s: unknown): s is string =>
  typeof s === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s) &&
  Number.isFinite(Date.parse(s));

const refIds = (refs: unknown) => Array.isArray(refs) ?
  refs.map(r => r && typeof r.id === 'string' ? r.id.trim() : '') : null;

const validRefs = (refs: unknown) => {
  const a = refIds(refs);
  return a !== null && a.every(Boolean) && new Set(a).size === a.length;
};

export function assessSfiMihmFoundation(frame: SfiMihmFoundationFrame): SfiMihmFoundationAssessment {
  const errors: string[] = [];
  const sourceGaps: string[] = [];
  const warnings: string[] = [];
  const b=frame?.boundary, m=frame?.model;
  if(frame?.contract!==SFI_MIHM_FOUNDATION_RESEARCH_CONTRACT ||
     frame.systemContract!==SFI_SYSTEM_CONTRACT) errors.push('PARENT_SFI_MIHM_CONTRACT_REQUIRED');
  if(!b?.id?.trim()||!b?.subjectRef?.id?.trim()||!b?.boundaryRule?.trim()||
     !validRefs(b.includedRefs)||!validRefs(b.excludedRefs)||!Array.isArray(b.assumptions)||
     !Array.isArray(b.limitations)||!b.version?.trim()) errors.push('SYSTEM_BOUNDARY_NOT_WELL_FORMED');
  if(!m?.id?.trim()||m.boundaryRef?.id!==b?.id||
     !m.modelVersion?.trim()||!['FORMALIZED','OPERATIONAL','EXPERIMENTAL','DECLARED','NOT_IMPLEMENTED'].includes(m.implementationStatus) ||
     !Number.isFinite(m.uncertainty as number) && m.uncertainty!==null ||
     typeof m.uncertainty==='number'&&(m.uncertainty<0||m.uncertainty>1)) errors.push('SYSTEM_MODEL_INVALID');
  if(m)for(const field of [
    'nodeRefs','dimensionRefs','relationRefs','flowRefs','constraintRefs',
    'stateRefs','frictionRefs','perturbationRefs','trajectoryRefs',
    'attractorRefs','transitionRefs','emergenceRefs','evidenceRefs',
  ] as const) {
    if(!validRefs(m[field]))errors.push('INVALID_MODEL_REFERENCES:'+field);
  }
  if(!m?.nodeRefs?.length||!m?.dimensionRefs?.length)errors.push('NODES_AND_DIMENSIONS_REQUIRED');
  const included=new Set(refIds(b?.includedRefs)||[]);
  const excluded=new Set(refIds(b?.excludedRefs)||[]);
  if([...included].some(id=>excluded.has(id)))errors.push('BOUNDARY_CONTRADICTION');
  if(!frame?.question?.trim()||!['DESCRIPTIVE','RETROSPECTIVE','PROSPECTIVE'].includes(frame.studyMode)||
     !['MOP_H','SCOREFRICTION','WORLD_VECTOR','PPOI','SFI_INSTITUTIONAL'].includes(frame.primaryMethod)) errors.push('RESEARCH_SCOPE_OR_METHOD_REQUIRED');
  if(!iso(frame?.timeCut))errors.push('VALID_TIME_CUT_REQUIRED');

  const sources=Array.isArray(frame?.sourceVintages)?frame.sourceVintages:[];
  if(!Array.isArray(frame?.sourceVintages))errors.push('SOURCE_VINTAGE_SET_REQUIRED');
  const seen=new Set<string>(), admittedSourceIds:string[]=[],excludedSourceIds:string[]=[];
  for(const v of sources){
    if(!v||!v.sourceId?.trim()||!v.recordRef?.trim()||seen.has(v.sourceId)||
       !['OFFICIAL_DOCUMENT','ORIGINAL_LOG','OBSERVATION','MODEL_OUTPUT'].includes(v.sourceKind)||
       !['REAL_DOCUMENTARY','REAL_TELEMETRY','SIMULATED','INFERRED'].includes(v.sourceClass)||
       v.eventAt!==null&&!iso(v.eventAt)||v.availableAt!==null&&!iso(v.availableAt)) {
      errors.push('INVALID_SOURCE_VINTAGE');
      continue;
    }
    seen.add(v.sourceId);
    if(v.sourceKind==='MODEL_OUTPUT' && (v.sourceClass==='REAL_DOCUMENTARY'||v.sourceClass==='REAL_TELEMETRY')){
      errors.push('MODEL_OUTPUT_CANNOT_BE_ORIGINAL_REAL_SOURCE');
    }
    if(v.availableAt===null){
      excludedSourceIds.push(v.sourceId);
      sourceGaps.push('KNOWLEDGE_AVAILABILITY_UNKNOWN:'+v.sourceId);
    }else if(iso(frame.timeCut) && Date.parse(v.availableAt)<=Date.parse(frame.timeCut)){
      admittedSourceIds.push(v.sourceId);
    }else excludedSourceIds.push(v.sourceId);
    if(v.sourceKind==='OFFICIAL_DOCUMENT' && v.sourceClass==='REAL_DOCUMENTARY'){
      warnings.push('DOCUMENT_PUBLICATION_IS_NOT_HISTORIC_ACTOR_KNOWLEDGE:'+v.sourceId);
    }
  }
  if(!admittedSourceIds.length) errors.push('NO_SOURCE_ADMISSIBLE_AT_CUT');
  if(m?.evidenceRefs?.length)warnings.push('REFERENCES_ARE_NOT_AUTOMATICALLY_ADMITTED_EVIDENCE');

  let miHmTStatus:SfiMihmFoundationAssessment['miHmTStatus']='NOT_REQUESTED';
  const t=frame.temporalExtension;
  if(t){
    miHmTStatus='EXPERIMENTAL_CHILD';
    const d=new Set(refIds(m?.dimensionRefs)||[]);
    if(t.contract!==MIHM_DIMENSIONAL_TRANSFER_MODEL_V0 || t.status!=='EXPERIMENTAL' ||
       t.conservationAssumed!==false || !d.has(t.sourceDimensionRef?.id) ||
       !d.has(t.targetDimensionRef?.id) || t.sourceDimensionRef.id===t.targetDimensionRef.id ||
       !validRefs(t.evidenceRefs)||!validRefs(t.constraintRefs)||!validRefs(t.contextRefs)) {
      errors.push('TEMPORAL_EXTENSION_WITHOUT_VALID_PARENT_DIMENSIONS');
      miHmTStatus='BLOCKED';
    }
    if(t.epistemicClass==='SIMULATION' && sources.some(x=>x.sourceClass==='REAL_DOCUMENTARY')){
      warnings.push('TEMPORAL_SIMULATION_IS_NOT_REAL_DOCUMENTARY_OUTCOME');
    }
  }
  if(errors.length && t)miHmTStatus='BLOCKED';
  if(m?.implementationStatus==='DECLARED'||m?.implementationStatus==='NOT_IMPLEMENTED'){
    warnings.push('SYSTEM_MODEL_DECLARED_NOT_OPERATED');
  }
  return {
    contract:SFI_MIHM_FOUNDATION_RESEARCH_CONTRACT,
    readiness:errors.length?'BLOCKED':'READY_FOR_BOUNDED_RESEARCH',
    reasons:errors,admittedSourceIds,excludedSourceIds,sourceGaps,
    parentModelId:m?.id??'UNKNOWN',primaryMethod:frame?.primaryMethod??'SCOREFRICTION',
    miHmTStatus,
    objective:SFI_SYSTEM_INVARIANTS.optimizationObjective,
    cimpsPublicationPrerequisite:false,
    canonicalPhiCalculated:false,
    universalPhiIntroduced:false,
    prospectiveValidationClaimed:false,
    causalIdentificationClaimed:false,
    scientificStatus:'FOUNDATION_RESEARCH_NOT_VALIDATED',
    warnings,
  };
}
