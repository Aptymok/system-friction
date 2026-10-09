import type { CanonicalGraphEdge, CanonicalGraphNode } from '../../../packages/graph/src';

export const REALITY_PASSPORT_STAGES = [
  'WORLD','CAPTURE','EVIDENCE','FRICTION','TRANSFORMATION','HYPOTHESIS','INFERENCE','CLAIM',
  'VERIFICATION','AUTHORITY','ACTION','RETURN','CONTRAST','LEARNING',
] as const;
export type RealityPassportStage = typeof REALITY_PASSPORT_STAGES[number];

export const REALITY_CHAIN_STATES = [
  'OBSERVED','DECLARED','IMPORTED','EXTRACTED','DERIVED','INFERRED','SIMULATED','PROPOSED',
  'UNKNOWN','MISSING','DEGRADED','CONFLICTED','REJECTED','CANONICAL',
  'NOT OBSERVED','NOT VERIFIED','NOT APPLICABLE','ABSTAIN','BLOCKED',
] as const;
export type RealityChainState = typeof REALITY_CHAIN_STATES[number];

export type RealityPassportNodeReading = {
  stage: RealityPassportStage|'UNCLASSIFIED';
  state: RealityChainState;
  sourceVersion: string|null;
  captureTime: string|null;
  uncertainty: unknown|null;
  verificationState: string|null;
  authority: string|null;
  executionState: string|null;
  expectedReturn: unknown|null;
  observedReturn: unknown|null;
  applicableObligation: unknown|null;
  verificationCost: unknown|null;
  verificationBudget: unknown|null;
  nextBestObservation: string|null;
  privacyBoundary: unknown|null;
  trajectory: unknown|null;
  verificationMethod: string|null;
  verifier: string|null;
  verifierSelectionReason: string|null;
  falseAcceptBoundary: unknown|null;
  falseRejectBoundary: unknown|null;
  expectedInformationGain: unknown|null;
  verificationCostUnit: string|null;
  verificationBudgetUnit: string|null;
  verificationPerturbation: unknown|null;
  provenanceBindingMethod: string|null;
  provenanceBindingResult: unknown|null;
};

export type RealityPassport = {
  contract: 'SFI-REALITY-PASSPORT-1.2';
  nodeId: string;
  stage: RealityPassportStage|'UNCLASSIFIED';
  epistemicState: RealityChainState;
  decision: 'CONTINUE'|'ABSTAIN'|'BLOCKED';
  reasons: string[];
  temporal: {
    sourceVersion: string|null;
    captureTime: string|null;
    nodeUpdatedAt: string|null;
  };
  epistemic: {
    uncertainty: unknown|null;
  };
  provenance: {
    declared: string;
    lineageCount: number;
    lineageRefs: string[];
    supportingRelationCount: number;
    supportingRelationRefs: string[];
    contradictionCount: number;
    contradictionRefs: string[];
    independence: {
      state: 'REPRESENTED'|'UNKNOWN';
      independentRootCount: number|null;
      rootRefs: string[];
      duplicateSupportCount: number|null;
      boundary: 'MATERIAL_OR_HASH_DIVERSITY_DOES_NOT_PROVE_EVIDENCE_INDEPENDENCE';
    };
    contentBinding: {
      method: string|null;
      result: unknown|null;
      verificationPerturbation: unknown|null;
      boundary: 'PROVENANCE_BINDING_DOES_NOT_PROVE_EVENT_TRUTH';
    };
  };
  verification: {
    state: string;
    method: string|null;
    verifier: string|null;
    selectionReason: string|null;
    cost: unknown|null;
    costUnit: string|null;
    budget: unknown|null;
    budgetUnit: string|null;
    expectedInformationGain: unknown|null;
    falseAcceptBoundary: unknown|null;
    falseRejectBoundary: unknown|null;
    nextBestObservation: string|null;
    processImpact: unknown|null;
    boundary: 'VERIFICATION_RESULT_REQUIRES_METHOD_AND_SCOPE_PROVENANCE_FOR_AUDIT';
  };
  authority: {
    state: string;
    executionState: string;
    authorityExpanded: boolean|null;
    mayMintReturn: boolean|null;
    mayPromoteCanon: boolean|null;
  };
  persistence: {
    represented: boolean;
    refs: string[];
    boundary: 'ACTION_RESPONSE_NOT_PERSISTED_STATE_UNLESS_EXPLICITLY_REPRESENTED';
  };
  returnState: {
    expected: unknown|null;
    observed: unknown|null;
    status: 'OBSERVED'|'PENDING'|'NOT_APPLICABLE'|'UNKNOWN';
  };
  constraints: {
    privacy: unknown|null;
    trajectory: unknown|null;
  };
  boundary: 'DERIVED_PROJECTION_NOT_CANONICAL_TRUTH';
  methodBoundary: 'PROJECTS_REALITY_WITHOUT_REDEFINING_REALITY_CHAIN_METHOD';
};

const text=(value:unknown)=>typeof value==='string'&&value.trim()?value.trim():null;
const bool=(value:unknown)=>value===true?true:value===false?false:null;
const first=(a:Record<string,unknown>,keys:string[])=>{for(const k of keys) if(a[k]!==undefined&&a[k]!==null)return a[k]; return null;};
const haystack=(node:CanonicalGraphNode)=>[
  node.ontologyType,node.label,node.origin,node.provenance,...node.lineage,
  ...Object.keys(node.attributes),...Object.values(node.attributes).filter((v):v is string=>typeof v==='string'),
].join(' ').toLowerCase();

function normalizedToken(value:string|null){
  return value?.trim().toUpperCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ')??null;
}
function normalizedStage(value:string|null):RealityPassportStage|null{
  const token=normalizedToken(value);
  if(!token)return null;
  return REALITY_PASSPORT_STAGES.find((candidate)=>candidate===token)??null;
}
function normalizedState(value:string|null):RealityChainState|null{
  const token=normalizedToken(value);
  if(!token)return null;
  return REALITY_CHAIN_STATES.find((candidate)=>candidate===token)??null;
}
function relationMatches(edge:CanonicalGraphEdge,tokens:string[]){
  const value=`${edge.relation} ${edge.provenance} ${Object.keys(edge.attributes).join(' ')}`.toLowerCase();
  return tokens.some((token)=>value.includes(token));
}
function representedAuthority(value:string|null){
  const token=normalizedToken(value);
  return Boolean(token&&!['UNKNOWN','NONE','NOT REPRESENTED','NOT APPLICABLE','MISSING'].includes(token));
}
function verificationBlocks(value:string|null){
  const token=normalizedToken(value);
  return token!==null&&['UNKNOWN','MISSING','NOT VERIFIED','FAILED','REJECTED','BLOCKED'].includes(token);
}
function strings(value:unknown){
  if(typeof value==='string'&&value.trim())return [value.trim()];
  if(Array.isArray(value))return value.filter((item):item is string=>typeof item==='string'&&item.trim().length>0).map((item)=>item.trim());
  return [];
}
function persistenceRefs(node:CanonicalGraphNode){
  const keys=['eventId','event_id','receiptId','receipt_id','recordId','record_id','persistedAt','persisted_at'];
  return Array.from(new Set(keys.flatMap((key)=>strings(node.attributes[key]))));
}
function explicitSupportingRoots(edge:CanonicalGraphEdge){
  const keys=[
    'lineageRootId','lineage_root_id','lineageRootRefs','lineage_root_refs',
    'sourceRootId','source_root_id','sourceRootRefs','source_root_refs',
    'independentSourceId','independent_source_id','independentSourceRefs','independent_source_refs',
    'originObservationId','origin_observation_id','originObservationRefs','origin_observation_refs',
    'sourceId','source_id',
  ];
  return Array.from(new Set(keys.flatMap((key)=>strings(edge.attributes[key]))));
}
function evidenceIndependence(supporting:CanonicalGraphEdge[]){
  const rootsByEdge=supporting.map((edge)=>explicitSupportingRoots(edge));
  const fullyRepresented=supporting.length>0&&rootsByEdge.every((refs)=>refs.length>0);
  const rootRefs=Array.from(new Set(rootsByEdge.flat()));
  return {
    state:fullyRepresented?'REPRESENTED' as const:'UNKNOWN' as const,
    independentRootCount:fullyRepresented?rootRefs.length:null,
    rootRefs,
    duplicateSupportCount:fullyRepresented?Math.max(0,supporting.length-rootRefs.length):null,
    boundary:'MATERIAL_OR_HASH_DIVERSITY_DOES_NOT_PROVE_EVIDENCE_INDEPENDENCE' as const,
  };
}

export function readRealityPassportNode(node:CanonicalGraphNode):RealityPassportNodeReading {
  const value=haystack(node);
  const ontologyStage=normalizedStage(text(node.ontologyType));
  const explicitStage=normalizedStage(text(first(node.attributes,['realityChainStage','reality_chain_stage','realityStage','reality_stage','stage'])));
  const stage=explicitStage??ontologyStage??REALITY_PASSPORT_STAGES.find((candidate)=>value.includes(candidate.toLowerCase()))??'UNCLASSIFIED';
  const declared=text(first(node.attributes,['epistemicState','epistemic_state','epistemicClass','epistemic_class','state','verification_status']));
  const state=normalizedState(declared)??'UNKNOWN';
  return {
    stage,state,
    sourceVersion:text(first(node.attributes,['sourceVersion','source_version','version'])),
    captureTime:text(first(node.attributes,['captureTime','capture_time','observedAt','observed_at','occurredAt','occurred_at'])),
    uncertainty:first(node.attributes,['uncertainty','confidenceBoundary','confidence_boundary']),
    verificationState:text(first(node.attributes,['verificationState','verification_state','verification_status','contrastStatus','contrast_status'])),
    authority:text(first(node.attributes,['authority','authorityClass','authority_class','authorizedBy','authorized_by','decisionAuthority','decision_authority'])),
    executionState:text(first(node.attributes,['executionState','execution_state','execution_status','status'])),
    expectedReturn:first(node.attributes,['expectedReturn','expected_return','expectedOutcome','expected_outcome','prediction']),
    observedReturn:first(node.attributes,['observedReturn','observed_return','outcome','observedOutcome','observed_outcome','return']),
    applicableObligation:first(node.attributes,['applicableObligation','applicable_obligation','obligation','obligations']),
    verificationCost:first(node.attributes,['verificationCost','verification_cost','estimatedVerificationCost','estimated_verification_cost']),
    verificationBudget:first(node.attributes,['verificationBudget','verification_budget','budget']),
    nextBestObservation:text(first(node.attributes,['nextBestObservation','next_best_observation','nextObservation','next_observation','discriminatingObservation','discriminating_observation'])),
    privacyBoundary:first(node.attributes,['privacyBoundary','privacy_boundary','privacy','confidentiality']),
    trajectory:first(node.attributes,['trajectory','trajectoryId','trajectory_id','temporalTrajectory','temporal_trajectory']),
    verificationMethod:text(first(node.attributes,['verificationMethod','verification_method','verificationProtocol','verification_protocol','verifierMethod','verifier_method'])),
    verifier:text(first(node.attributes,['verifier','verifierId','verifier_id','verificationProvider','verification_provider','verificationAgent','verification_agent'])),
    verifierSelectionReason:text(first(node.attributes,['verifierSelectionReason','verifier_selection_reason','verificationSelectionReason','verification_selection_reason','selectionReason','selection_reason'])),
    falseAcceptBoundary:first(node.attributes,['falseAcceptBoundary','false_accept_boundary','falseAcceptRate','false_accept_rate','far']),
    falseRejectBoundary:first(node.attributes,['falseRejectBoundary','false_reject_boundary','falseRejectRate','false_reject_rate','frr']),
    expectedInformationGain:first(node.attributes,['expectedInformationGain','expected_information_gain','informationGain','information_gain']),
    verificationCostUnit:text(first(node.attributes,['verificationCostUnit','verification_cost_unit','costUnit','cost_unit'])),
    verificationBudgetUnit:text(first(node.attributes,['verificationBudgetUnit','verification_budget_unit','budgetUnit','budget_unit'])),
    verificationPerturbation:first(node.attributes,['verificationPerturbation','verification_perturbation','verificationProcessImpact','verification_process_impact','provenancePerturbation','provenance_perturbation']),
    provenanceBindingMethod:text(first(node.attributes,['provenanceBindingMethod','provenance_binding_method','contentProvenanceMethod','content_provenance_method','watermarkMethod','watermark_method','fingerprintMethod','fingerprint_method'])),
    provenanceBindingResult:first(node.attributes,['provenanceBindingResult','provenance_binding_result','contentProvenanceResult','content_provenance_result','watermarkResult','watermark_result','fingerprintResult','fingerprint_result']),
  };
}

export function readRealityChainEdge(edge:CanonicalGraphEdge) {
  const relation=edge.relation.toUpperCase();
  const material=['CAPTURE','EVIDENCE','FRICTION','TRANSFORM','HYPOTH','INFER','CLAIM','VERIFY','AUTHOR','ACTION','EXECUT','RETURN','CONTRAST','LEARN','SUPPORT','CONTRADICT'].some((token)=>relation.includes(token));
  return {material,provenance:edge.provenance||'UNKNOWN',relation:edge.relation,state:normalizedState(text(first(edge.attributes,['state','epistemicState','epistemic_state'])))??'UNKNOWN'};
}

export function buildRealityPassport(node:CanonicalGraphNode,edges:CanonicalGraphEdge[]):RealityPassport {
  const reading=readRealityPassportNode(node);
  const connected=edges.filter((edge)=>edge.sourceNodeId===node.nodeId||edge.targetNodeId===node.nodeId);
  const supporting=connected.filter((edge)=>relationMatches(edge,['support','evidence','verify','observe','capture','derive','infer']));
  const contradictions=connected.filter((edge)=>relationMatches(edge,['contradict','counterevidence','conflict','falsif','reject']));
  const reasons:string[]=[];
  let decision:RealityPassport['decision']='CONTINUE';

  const claimLike=['CLAIM','INFERENCE','HYPOTHESIS','ACTION'].includes(reading.stage);
  const authorityRequired=reading.stage==='ACTION';
  const returnRequired=reading.stage==='ACTION'||reading.expectedReturn!==null;

  if (['UNKNOWN','MISSING','NOT OBSERVED'].includes(reading.state)) {
    reasons.push('Epistemic state is not sufficiently observed.');
    decision='ABSTAIN';
  }
  if (claimLike && ((!reading.verificationState&&supporting.length===0)||verificationBlocks(reading.verificationState))) {
    reasons.push(reading.verificationState
      ? `Represented verification state is ${reading.verificationState}.`
      : 'No explicit verification state or supporting relation is available.');
    decision='ABSTAIN';
  }
  if (contradictions.length>0) {
    reasons.push(`${contradictions.length} contradiction or counterevidence relation(s) remain visible.`);
  }
  if (authorityRequired && !representedAuthority(reading.authority)) {
    reasons.push('Action authority is not represented.');
    decision='BLOCKED';
  }
  if (['BLOCKED','REJECTED'].includes(reading.state)) {
    reasons.push('Persisted state prevents continuation.');
    decision='BLOCKED';
  }

  const returnStatus:RealityPassport['returnState']['status']=
    reading.observedReturn!==null ? 'OBSERVED'
    : returnRequired ? 'PENDING'
    : reading.stage==='RETURN'||reading.stage==='CONTRAST'||reading.stage==='LEARNING' ? 'UNKNOWN'
    : 'NOT_APPLICABLE';

  if (returnStatus==='PENDING' && decision==='CONTINUE') reasons.push('Execution/expectation exists but observed RETURN is still pending.');

  const independence=evidenceIndependence(supporting);
  if(independence.state==='REPRESENTED'&&independence.duplicateSupportCount!==null&&independence.duplicateSupportCount>0){
    reasons.push(`${independence.duplicateSupportCount} supporting relation(s) reuse represented evidence roots and are not counted as independent observations.`);
  }

  const persistedRefs=persistenceRefs(node);
  const persistedFlag=bool(first(node.attributes,['persisted','persistedState','persisted_state','persistenceConfirmed','persistence_confirmed']));
  const persistenceRepresented=persistedFlag===true||persistedRefs.length>0;

  return {
    contract:'SFI-REALITY-PASSPORT-1.2',
    nodeId:node.nodeId,
    stage:reading.stage,
    epistemicState:reading.state,
    decision,
    reasons,
    temporal:{
      sourceVersion:reading.sourceVersion,
      captureTime:reading.captureTime,
      nodeUpdatedAt:node.updatedAt??null,
    },
    epistemic:{uncertainty:reading.uncertainty},
    provenance:{
      declared:node.provenance||'UNKNOWN',
      lineageCount:node.lineage.length,
      lineageRefs:[...node.lineage],
      supportingRelationCount:supporting.length,
      supportingRelationRefs:supporting.map((edge)=>edge.edgeId),
      contradictionCount:contradictions.length,
      contradictionRefs:contradictions.map((edge)=>edge.edgeId),
      independence,
      contentBinding:{
        method:reading.provenanceBindingMethod,
        result:reading.provenanceBindingResult,
        verificationPerturbation:reading.verificationPerturbation,
        boundary:'PROVENANCE_BINDING_DOES_NOT_PROVE_EVENT_TRUTH',
      },
    },
    verification:{
      state:reading.verificationState??'UNKNOWN',
      method:reading.verificationMethod,
      verifier:reading.verifier,
      selectionReason:reading.verifierSelectionReason,
      cost:reading.verificationCost,
      costUnit:reading.verificationCostUnit,
      budget:reading.verificationBudget,
      budgetUnit:reading.verificationBudgetUnit,
      expectedInformationGain:reading.expectedInformationGain,
      falseAcceptBoundary:reading.falseAcceptBoundary,
      falseRejectBoundary:reading.falseRejectBoundary,
      nextBestObservation:reading.nextBestObservation,
      processImpact:reading.verificationPerturbation,
      boundary:'VERIFICATION_RESULT_REQUIRES_METHOD_AND_SCOPE_PROVENANCE_FOR_AUDIT',
    },
    authority:{
      state:reading.authority??'UNKNOWN',
      executionState:reading.executionState??'UNKNOWN',
      authorityExpanded:bool(first(node.attributes,['authorityExpanded','authority_expanded'])),
      mayMintReturn:bool(first(node.attributes,['mayMintReturn','may_mint_return','observedReturnCreated','observed_return_created'])),
      mayPromoteCanon:bool(first(node.attributes,['mayPromoteCanon','may_promote_canon','canonPromoted','canon_promoted'])),
    },
    persistence:{
      represented:persistenceRepresented,
      refs:persistedRefs,
      boundary:'ACTION_RESPONSE_NOT_PERSISTED_STATE_UNLESS_EXPLICITLY_REPRESENTED',
    },
    returnState:{
      expected:reading.expectedReturn,
      observed:reading.observedReturn,
      status:returnStatus,
    },
    constraints:{
      privacy:reading.privacyBoundary,
      trajectory:reading.trajectory,
    },
    boundary:'DERIVED_PROJECTION_NOT_CANONICAL_TRUTH',
    methodBoundary:'PROJECTS_REALITY_WITHOUT_REDEFINING_REALITY_CHAIN_METHOD',
  };
}

export function realityPassportCoverage(nodes:CanonicalGraphNode[]) {
  const present=new Set(nodes.map(readRealityPassportNode).filter((item)=>item.stage!=='UNCLASSIFIED').map((item)=>item.stage));
  return REALITY_PASSPORT_STAGES.map((stage)=>({stage,observed:present.has(stage)}));
}
