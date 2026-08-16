import type { SfiCanonicalRef, SfiEpistemicClass } from '../contracts/sfi';
import type { SfiCaseObjectKind } from './operational';

export const SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT = 'SFI-SYSTEM-AI-ASSURANCE-DOMAIN-1.0' as const;

export const SFI_SYSTEM_AI_ENTITY_TYPES = [
  'SYSTEM','COMPONENT','PROCESS','WORKFLOW','ACTOR','INTERFACE','DATA_SOURCE','DATASET','AI_SYSTEM','AI_MODEL',
  'MODEL_ENDPOINT','PROMPT_TEMPLATE','RETRIEVAL_LAYER','TOOL','AI_EXECUTION','DECISION_POINT','HUMAN_GATE','CONTROL',
  'FAILURE_EVENT','USE_CASE','INTEGRATION_POINT','OUTCOME',
] as const;
export type SfiSystemAiEntityType = (typeof SFI_SYSTEM_AI_ENTITY_TYPES)[number];

export const SFI_SYSTEM_AI_RELATION_TYPES = [
  'SYSTEM_HAS_COMPONENT','SYSTEM_HAS_PROCESS','SYSTEM_HAS_WORKFLOW','COMPONENT_DEPENDS_ON_COMPONENT','PROCESS_USES_COMPONENT',
  'WORKFLOW_CONTAINS_PROCESS','ACTOR_PARTICIPATES_IN_PROCESS','INTERFACE_CONNECTS_COMPONENT','DATA_SOURCE_FEEDS_COMPONENT',
  'AI_SYSTEM_USES_MODEL','AI_SYSTEM_USES_DATA_SOURCE','AI_SYSTEM_USES_RETRIEVAL','AI_SYSTEM_USES_TOOL','AI_SYSTEM_EMBEDDED_IN_PROCESS',
  'AI_EXECUTION_RUNS_ON_AI_SYSTEM','AI_EXECUTION_USES_MODEL','AI_EXECUTION_USES_PROMPT_TEMPLATE','AI_EXECUTION_USES_DATA_SOURCE',
  'AI_EXECUTION_USES_TOOL','AI_EXECUTION_PRODUCES_DECISION_INPUT','DECISION_POINT_GATED_BY_HUMAN','ACTOR_AUTHORIZES_DECISION',
  'CONTROL_GOVERNS_AI_SYSTEM','FAILURE_EVENT_OCCURS_AT_COMPONENT','FAILURE_EVENT_AFFECTS_PROCESS',
  'FAILURE_EVENT_ASSOCIATED_WITH_AI_EXECUTION','USE_CASE_TARGETS_PROCESS','INTEGRATION_POINT_CONNECTS_COMPONENT','OUTCOME_OBSERVED_FOR_PROCESS',
] as const;
export type SfiSystemAiRelationType = (typeof SFI_SYSTEM_AI_RELATION_TYPES)[number];
export type SfiSystemAiRelationEpistemicRole = Extract<SfiEpistemicClass, 'RECORD' | 'INFERENCE' | 'EPISTEMIC_ASSESSMENT'>;

export type SfiSystemAiEntityRef = SfiCanonicalRef & { entityType: SfiSystemAiEntityType };
export type SfiSystemAiRelationDraft = {
  relationKey: string;
  relationType: SfiSystemAiRelationType;
  epistemicRole: SfiSystemAiRelationEpistemicRole;
  from: SfiSystemAiEntityRef;
  to: SfiSystemAiEntityRef;
  sourceRefs?: SfiCanonicalRef[];
  recordRefs?: SfiCanonicalRef[];
  evidenceRefs?: SfiCanonicalRef[];
  payload?: Record<string, unknown>;
  observedAt?: string | null;
};
export type SfiSystemAiCaseObjectInput = {
  kind: SfiCaseObjectKind;
  epistemicRole: SfiEpistemicClass;
  canonicalRef: SfiCanonicalRef;
  sourceRefs?: SfiCanonicalRef[];
  recordRefs?: SfiCanonicalRef[];
  evidenceRefs?: SfiCanonicalRef[];
  payload: Record<string, unknown>;
  observedAt?: string | null;
};
export type SfiSystemAiIntakePackage = {
  contract: typeof SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT;
  object: SfiSystemAiCaseObjectInput;
  relations: SfiSystemAiRelationDraft[];
};

const ENDPOINTS: Record<SfiSystemAiRelationType, readonly [SfiSystemAiEntityType, SfiSystemAiEntityType]> = {
  SYSTEM_HAS_COMPONENT:['SYSTEM','COMPONENT'], SYSTEM_HAS_PROCESS:['SYSTEM','PROCESS'], SYSTEM_HAS_WORKFLOW:['SYSTEM','WORKFLOW'],
  COMPONENT_DEPENDS_ON_COMPONENT:['COMPONENT','COMPONENT'], PROCESS_USES_COMPONENT:['PROCESS','COMPONENT'], WORKFLOW_CONTAINS_PROCESS:['WORKFLOW','PROCESS'],
  ACTOR_PARTICIPATES_IN_PROCESS:['ACTOR','PROCESS'], INTERFACE_CONNECTS_COMPONENT:['INTERFACE','COMPONENT'], DATA_SOURCE_FEEDS_COMPONENT:['DATA_SOURCE','COMPONENT'],
  AI_SYSTEM_USES_MODEL:['AI_SYSTEM','AI_MODEL'], AI_SYSTEM_USES_DATA_SOURCE:['AI_SYSTEM','DATA_SOURCE'], AI_SYSTEM_USES_RETRIEVAL:['AI_SYSTEM','RETRIEVAL_LAYER'],
  AI_SYSTEM_USES_TOOL:['AI_SYSTEM','TOOL'], AI_SYSTEM_EMBEDDED_IN_PROCESS:['AI_SYSTEM','PROCESS'], AI_EXECUTION_RUNS_ON_AI_SYSTEM:['AI_EXECUTION','AI_SYSTEM'],
  AI_EXECUTION_USES_MODEL:['AI_EXECUTION','AI_MODEL'], AI_EXECUTION_USES_PROMPT_TEMPLATE:['AI_EXECUTION','PROMPT_TEMPLATE'], AI_EXECUTION_USES_DATA_SOURCE:['AI_EXECUTION','DATA_SOURCE'],
  AI_EXECUTION_USES_TOOL:['AI_EXECUTION','TOOL'], AI_EXECUTION_PRODUCES_DECISION_INPUT:['AI_EXECUTION','DECISION_POINT'], DECISION_POINT_GATED_BY_HUMAN:['DECISION_POINT','HUMAN_GATE'],
  ACTOR_AUTHORIZES_DECISION:['ACTOR','DECISION_POINT'], CONTROL_GOVERNS_AI_SYSTEM:['CONTROL','AI_SYSTEM'], FAILURE_EVENT_OCCURS_AT_COMPONENT:['FAILURE_EVENT','COMPONENT'],
  FAILURE_EVENT_AFFECTS_PROCESS:['FAILURE_EVENT','PROCESS'], FAILURE_EVENT_ASSOCIATED_WITH_AI_EXECUTION:['FAILURE_EVENT','AI_EXECUTION'], USE_CASE_TARGETS_PROCESS:['USE_CASE','PROCESS'],
  INTEGRATION_POINT_CONNECTS_COMPONENT:['INTEGRATION_POINT','COMPONENT'], OUTCOME_OBSERVED_FOR_PROCESS:['OUTCOME','PROCESS'],
};

function requireText(value: string, field: string) { const v=value.trim(); if(!v) throw new Error(`SFI_SYSTEM_AI_INVALID:${field}`); return v; }
function dateOrNull(value: string | null | undefined, field: string) { const v=value?.trim()||null; if(v && Number.isNaN(Date.parse(v))) throw new Error(`SFI_SYSTEM_AI_INVALID:${field}`); return v; }
function ratioOrNull(value: number | null | undefined, field: string) { if(value===null||typeof value==='undefined') return null; if(!Number.isFinite(value)||value<0||value>1) throw new Error(`SFI_SYSTEM_AI_INVALID:${field}`); return value; }

export function systemAiEntityRef(entityType:SfiSystemAiEntityType,id:string):SfiSystemAiEntityRef {
  return { entityType, id:`system-ai:${entityType}:${requireText(id,'entityId')}`, version:'1.0', hash:null };
}

export function validateSystemAiRelationDraft(draft:SfiSystemAiRelationDraft):string[] {
  const violations:string[]=[]; const expected=ENDPOINTS[draft.relationType];
  if(!draft.relationKey.trim()) violations.push('SYSTEM_AI_RELATION_KEY_REQUIRED');
  if(!expected) violations.push('SYSTEM_AI_RELATION_TYPE_UNKNOWN');
  if(expected && draft.from.entityType!==expected[0]) violations.push(`SYSTEM_AI_RELATION_FROM_TYPE_MISMATCH:${expected[0]}`);
  if(expected && draft.to.entityType!==expected[1]) violations.push(`SYSTEM_AI_RELATION_TO_TYPE_MISMATCH:${expected[1]}`);
  if(draft.epistemicRole==='INFERENCE' && (draft.evidenceRefs?.length??0)===0) violations.push('SYSTEM_AI_INFERRED_RELATION_REQUIRES_EVIDENCE');
  if(draft.observedAt && Number.isNaN(Date.parse(draft.observedAt))) violations.push('SYSTEM_AI_RELATION_OBSERVED_AT_INVALID');
  return violations;
}

function relation(input:Omit<SfiSystemAiRelationDraft,'epistemicRole'> & {epistemicRole?:SfiSystemAiRelationEpistemicRole}):SfiSystemAiRelationDraft {
  const draft:SfiSystemAiRelationDraft={...input,epistemicRole:input.epistemicRole??'RECORD'}; const violations=validateSystemAiRelationDraft(draft);
  if(violations.length) throw new Error(`SFI_SYSTEM_AI_RELATION_INVALID:${violations.join(',')}`); return draft;
}

export function normalizeSystemAiEntityRecord(input:{entityType:SfiSystemAiEntityType;entityId:string;label?:string|null;attributes?:Record<string,unknown>;observedAt?:string|null;sourceRefs?:SfiCanonicalRef[]}):SfiSystemAiIntakePackage {
  const ref=systemAiEntityRef(input.entityType,input.entityId);
  return { contract:SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT, object:{kind:'RECORD',epistemicRole:'RECORD',canonicalRef:ref,sourceRefs:input.sourceRefs??[],payload:{entityType:input.entityType,label:input.label?.trim()||null,attributes:input.attributes??{}},observedAt:dateOrNull(input.observedAt,'observedAt')}, relations:[] };
}

export function normalizeAiExecutionTrace(input:{executionId:string;aiSystemRef:SfiSystemAiEntityRef;modelRef:SfiSystemAiEntityRef;startedAt:string;finishedAt?:string|null;status:string;promptTemplateRef?:SfiSystemAiEntityRef|null;dataSourceRefs?:SfiSystemAiEntityRef[];toolRefs?:SfiSystemAiEntityRef[];inputHash?:string|null;contextHash?:string|null;outputHash?:string|null;sourceRefs?:SfiCanonicalRef[]}):SfiSystemAiIntakePackage {
  if(input.aiSystemRef.entityType!=='AI_SYSTEM') throw new Error('SFI_AI_EXECUTION_SYSTEM_REF_INVALID'); if(input.modelRef.entityType!=='AI_MODEL') throw new Error('SFI_AI_EXECUTION_MODEL_REF_INVALID');
  const executionRef=systemAiEntityRef('AI_EXECUTION',input.executionId); const startedAt=dateOrNull(input.startedAt,'startedAt'); if(!startedAt) throw new Error('SFI_SYSTEM_AI_INVALID:startedAt');
  const relations:SfiSystemAiRelationDraft[]=[
    relation({relationKey:`${executionRef.id}:system`,relationType:'AI_EXECUTION_RUNS_ON_AI_SYSTEM',from:executionRef,to:input.aiSystemRef,sourceRefs:input.sourceRefs,observedAt:startedAt}),
    relation({relationKey:`${executionRef.id}:model`,relationType:'AI_EXECUTION_USES_MODEL',from:executionRef,to:input.modelRef,sourceRefs:input.sourceRefs,observedAt:startedAt}),
  ];
  if(input.promptTemplateRef){ if(input.promptTemplateRef.entityType!=='PROMPT_TEMPLATE') throw new Error('SFI_AI_EXECUTION_PROMPT_REF_INVALID'); relations.push(relation({relationKey:`${executionRef.id}:prompt`,relationType:'AI_EXECUTION_USES_PROMPT_TEMPLATE',from:executionRef,to:input.promptTemplateRef,sourceRefs:input.sourceRefs,observedAt:startedAt})); }
  for(const ref of input.dataSourceRefs??[]){ if(ref.entityType!=='DATA_SOURCE') throw new Error('SFI_AI_EXECUTION_DATA_REF_INVALID'); relations.push(relation({relationKey:`${executionRef.id}:data:${ref.id}`,relationType:'AI_EXECUTION_USES_DATA_SOURCE',from:executionRef,to:ref,sourceRefs:input.sourceRefs,observedAt:startedAt})); }
  for(const ref of input.toolRefs??[]){ if(ref.entityType!=='TOOL') throw new Error('SFI_AI_EXECUTION_TOOL_REF_INVALID'); relations.push(relation({relationKey:`${executionRef.id}:tool:${ref.id}`,relationType:'AI_EXECUTION_USES_TOOL',from:executionRef,to:ref,sourceRefs:input.sourceRefs,observedAt:startedAt})); }
  return {contract:SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT,object:{kind:'RECORD',epistemicRole:'RECORD',canonicalRef:executionRef,sourceRefs:input.sourceRefs??[],payload:{entityType:'AI_EXECUTION',startedAt,finishedAt:dateOrNull(input.finishedAt,'finishedAt'),status:requireText(input.status,'status'),inputHash:input.inputHash?.trim()||null,contextHash:input.contextHash?.trim()||null,outputHash:input.outputHash?.trim()||null,rawPromptPersisted:false,rawInputPersisted:false,decisionAuthorityClaimed:false},observedAt:startedAt},relations};
}

export function normalizeSystemFailureEvent(input:{failureId:string;occurredAt:string;failureType:string;description?:string|null;componentRef?:SfiSystemAiEntityRef|null;processRef?:SfiSystemAiEntityRef|null;aiExecutionRef?:SfiSystemAiEntityRef|null;sourceRefs?:SfiCanonicalRef[]}):SfiSystemAiIntakePackage {
  const failureRef=systemAiEntityRef('FAILURE_EVENT',input.failureId); const occurredAt=dateOrNull(input.occurredAt,'occurredAt'); if(!occurredAt) throw new Error('SFI_SYSTEM_AI_INVALID:occurredAt'); const relations:SfiSystemAiRelationDraft[]=[];
  if(input.componentRef){ if(input.componentRef.entityType!=='COMPONENT') throw new Error('SFI_FAILURE_COMPONENT_REF_INVALID'); relations.push(relation({relationKey:`${failureRef.id}:component`,relationType:'FAILURE_EVENT_OCCURS_AT_COMPONENT',from:failureRef,to:input.componentRef,sourceRefs:input.sourceRefs,observedAt:occurredAt})); }
  if(input.processRef){ if(input.processRef.entityType!=='PROCESS') throw new Error('SFI_FAILURE_PROCESS_REF_INVALID'); relations.push(relation({relationKey:`${failureRef.id}:process`,relationType:'FAILURE_EVENT_AFFECTS_PROCESS',from:failureRef,to:input.processRef,sourceRefs:input.sourceRefs,observedAt:occurredAt})); }
  if(input.aiExecutionRef){ if(input.aiExecutionRef.entityType!=='AI_EXECUTION') throw new Error('SFI_FAILURE_EXECUTION_REF_INVALID'); relations.push(relation({relationKey:`${failureRef.id}:execution`,relationType:'FAILURE_EVENT_ASSOCIATED_WITH_AI_EXECUTION',from:failureRef,to:input.aiExecutionRef,sourceRefs:input.sourceRefs,observedAt:occurredAt})); }
  return {contract:SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT,object:{kind:'RECORD',epistemicRole:'RECORD',canonicalRef:failureRef,sourceRefs:input.sourceRefs??[],payload:{entityType:'FAILURE_EVENT',occurredAt,failureType:requireText(input.failureType,'failureType'),description:input.description?.trim()||null,causeClaimed:false},observedAt:occurredAt},relations};
}

export function normalizeAiDecisionTrace(input:{decisionId:string;decidedAt:string;disposition:string;aiExecutionRef?:SfiSystemAiEntityRef|null;humanGateRef?:SfiSystemAiEntityRef|null;authorityActorRef?:SfiSystemAiEntityRef|null;sourceRefs?:SfiCanonicalRef[]}):SfiSystemAiIntakePackage {
  const decisionRef=systemAiEntityRef('DECISION_POINT',input.decisionId); const decidedAt=dateOrNull(input.decidedAt,'decidedAt'); if(!decidedAt) throw new Error('SFI_SYSTEM_AI_INVALID:decidedAt'); const relations:SfiSystemAiRelationDraft[]=[];
  if(input.aiExecutionRef){ if(input.aiExecutionRef.entityType!=='AI_EXECUTION') throw new Error('SFI_AI_DECISION_EXECUTION_REF_INVALID'); relations.push(relation({relationKey:`${input.aiExecutionRef.id}:decision:${decisionRef.id}`,relationType:'AI_EXECUTION_PRODUCES_DECISION_INPUT',from:input.aiExecutionRef,to:decisionRef,sourceRefs:input.sourceRefs,observedAt:decidedAt})); }
  if(input.humanGateRef){ if(input.humanGateRef.entityType!=='HUMAN_GATE') throw new Error('SFI_AI_DECISION_GATE_REF_INVALID'); relations.push(relation({relationKey:`${decisionRef.id}:gate`,relationType:'DECISION_POINT_GATED_BY_HUMAN',from:decisionRef,to:input.humanGateRef,sourceRefs:input.sourceRefs,observedAt:decidedAt})); }
  if(input.authorityActorRef){ if(input.authorityActorRef.entityType!=='ACTOR') throw new Error('SFI_AI_DECISION_ACTOR_REF_INVALID'); relations.push(relation({relationKey:`${input.authorityActorRef.id}:decision:${decisionRef.id}`,relationType:'ACTOR_AUTHORIZES_DECISION',from:input.authorityActorRef,to:decisionRef,sourceRefs:input.sourceRefs,observedAt:decidedAt})); }
  return {contract:SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT,object:{kind:'RECORD',epistemicRole:'RECORD',canonicalRef:decisionRef,sourceRefs:input.sourceRefs??[],payload:{entityType:'DECISION_POINT',decidedAt,disposition:requireText(input.disposition,'disposition'),aiOutputEqualsDecision:false,humanAuthorityObserved:Boolean(input.humanGateRef&&input.authorityActorRef)},observedAt:decidedAt},relations};
}

export const SFI_AI_FAILURE_LAYERS=['DATA','MODEL','PROMPT','RETRIEVAL','TOOL','INTEGRATION','WORKFLOW','HUMAN_HANDOFF','GOVERNANCE','UNKNOWN'] as const;
export type SfiAiFailureLayer=(typeof SFI_AI_FAILURE_LAYERS)[number];

export function buildSystemFrictionAssessment(input:{assessmentId:string;locationRef:SfiSystemAiEntityRef;affectedRefs?:SfiSystemAiEntityRef[];frictionType:string;evidenceRefs:SfiCanonicalRef[];recordRefs?:SfiCanonicalRef[];confidence?:number|null;magnitudeProxy?:number|null}):SfiSystemAiCaseObjectInput {
  if(!input.evidenceRefs.length) throw new Error('SFI_SYSTEM_FRICTION_REQUIRES_EVIDENCE'); const confidence=ratioOrNull(input.confidence,'confidence'); const magnitude=ratioOrNull(input.magnitudeProxy,'magnitudeProxy');
  return {kind:'FRICTION',epistemicRole:'INFERENCE',canonicalRef:{id:`system-friction:${requireText(input.assessmentId,'assessmentId')}`,version:'1.0',hash:null},recordRefs:input.recordRefs??[],evidenceRefs:input.evidenceRefs,payload:{contract:SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT,assessmentType:'SYSTEM_FRICTION',locationRef:input.locationRef,affectedRefs:input.affectedRefs??[],frictionType:requireText(input.frictionType,'frictionType'),confidence,magnitudeProxy:magnitude,causalMechanismEstablished:false,truthAuthority:false}};
}

export function buildAiImplementationFailureAssessment(input:{assessmentId:string;failureRef:SfiSystemAiEntityRef;layer:SfiAiFailureLayer;evidenceRefs:SfiCanonicalRef[];recordRefs?:SfiCanonicalRef[];determinability:'DETERMINED'|'PARTIALLY_DETERMINED'|'UNDETERMINED';confidence?:number|null;competingHypotheses?:string[]}):SfiSystemAiCaseObjectInput {
  if(input.failureRef.entityType!=='FAILURE_EVENT') throw new Error('SFI_AI_FAILURE_REF_INVALID'); if(!input.evidenceRefs.length) throw new Error('SFI_AI_FAILURE_ASSESSMENT_REQUIRES_EVIDENCE');
  return {kind:'EPISTEMIC_ASSESSMENT',epistemicRole:'EPISTEMIC_ASSESSMENT',canonicalRef:{id:`ai-failure-assessment:${requireText(input.assessmentId,'assessmentId')}`,version:'1.0',hash:null},recordRefs:input.recordRefs??[],evidenceRefs:input.evidenceRefs,payload:{contract:SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT,assessmentType:'AI_IMPLEMENTATION_FAILURE',failureRef:input.failureRef,layer:input.layer,determinability:input.determinability,confidence:ratioOrNull(input.confidence,'confidence'),competingHypotheses:input.competingHypotheses??[],rootCauseEstablished:false,modelBlameByDefault:false}};
}

export function buildAiAdoptionOpportunityAssessment(input:{assessmentId:string;processRef:SfiSystemAiEntityRef;useCaseRef:SfiSystemAiEntityRef;evidenceRefs:SfiCanonicalRef[];recordRefs?:SfiCanonicalRef[];projectedValue?:number|null;feasibility?:number|null;integrationRisk?:number|null;requiredControls?:string[]}):SfiSystemAiCaseObjectInput {
  if(input.processRef.entityType!=='PROCESS'||input.useCaseRef.entityType!=='USE_CASE') throw new Error('SFI_AI_OPPORTUNITY_REF_INVALID'); if(!input.evidenceRefs.length) throw new Error('SFI_AI_OPPORTUNITY_REQUIRES_EVIDENCE');
  return {kind:'ANALYSIS',epistemicRole:'PROJECTION',canonicalRef:{id:`ai-opportunity:${requireText(input.assessmentId,'assessmentId')}`,version:'1.0',hash:null},recordRefs:input.recordRefs??[],evidenceRefs:input.evidenceRefs,payload:{contract:SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT,assessmentType:'AI_ADOPTION_OPPORTUNITY',processRef:input.processRef,useCaseRef:input.useCaseRef,projectedValue:ratioOrNull(input.projectedValue,'projectedValue'),feasibility:ratioOrNull(input.feasibility,'feasibility'),integrationRisk:ratioOrNull(input.integrationRisk,'integrationRisk'),requiredControls:input.requiredControls??[],observedReturn:false,recommendationAuthority:false}};
}

export const SFI_AI_GOVERNANCE_STAGES=['MODEL','PROMPT','INPUT','CONTEXT','OUTPUT','DECISION','HUMAN_AUTHORITY','ACTION','RETURN'] as const;
export type SfiAiGovernanceStage=(typeof SFI_AI_GOVERNANCE_STAGES)[number];
export function buildAiGovernanceTraceAssessment(input:{assessmentId:string;stagePresence:Partial<Record<SfiAiGovernanceStage,boolean>>;recordRefs:SfiCanonicalRef[];evidenceRefs:SfiCanonicalRef[];confidence?:number|null}):SfiSystemAiCaseObjectInput {
  if(!input.evidenceRefs.length) throw new Error('SFI_AI_GOVERNANCE_ASSESSMENT_REQUIRES_EVIDENCE'); const missingStages=SFI_AI_GOVERNANCE_STAGES.filter(stage=>input.stagePresence[stage]!==true); const completeness=(SFI_AI_GOVERNANCE_STAGES.length-missingStages.length)/SFI_AI_GOVERNANCE_STAGES.length;
  return {kind:'EPISTEMIC_ASSESSMENT',epistemicRole:'EPISTEMIC_ASSESSMENT',canonicalRef:{id:`ai-governance:${requireText(input.assessmentId,'assessmentId')}`,version:'1.0',hash:null},recordRefs:input.recordRefs,evidenceRefs:input.evidenceRefs,payload:{contract:SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT,assessmentType:'AI_GOVERNANCE_TRACE',stagePresence:input.stagePresence,missingStages,traceCompleteness:completeness,auditReady:missingStages.length===0,confidence:ratioOrNull(input.confidence,'confidence'),complianceClaimed:false,authorityClaimed:false}};
}

export const SFI_SYSTEM_AI_ASSURANCE_INVARIANTS={oneSharedCasePlatform:true,rawPromptRequiredInCaseStore:false,rawInputRequiredInCaseStore:false,aiOutputEqualsDecision:false,failureEqualsRootCause:false,frictionEqualsCausality:false,projectionEqualsObservedReturn:false,traceCompletenessEqualsCompliance:false,clientGraphEqualsInstitutionalGraph:false,automaticExternalAction:false} as const;
