import type { CanonicalGraphEdge, CanonicalGraphNode } from '../../../packages/graph/src';

export const REALITY_CHAIN_STAGES = [
  'WORLD','CAPTURE','EVIDENCE','FRICTION','TRANSFORMATION','HYPOTHESIS','INFERENCE','CLAIM',
  'VERIFICATION','AUTHORITY','ACTION','RETURN','CONTRAST','LEARNING',
] as const;
export type RealityChainStage = typeof REALITY_CHAIN_STAGES[number];

export const REALITY_CHAIN_STATES = [
  'OBSERVED','DECLARED','IMPORTED','EXTRACTED','DERIVED','INFERRED','SIMULATED','PROPOSED',
  'UNKNOWN','MISSING','DEGRADED','CONFLICTED','REJECTED','CANONICAL',
  'NOT OBSERVED','NOT VERIFIED','NOT APPLICABLE','ABSTAIN','BLOCKED',
] as const;
export type RealityChainState = typeof REALITY_CHAIN_STATES[number];

export type RealityChainNodeReading = {
  stage: RealityChainStage|'UNCLASSIFIED';
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
};

export type RealityPassport = {
  contract: 'SFI-REALITY-PASSPORT-1.0';
  nodeId: string;
  stage: RealityChainStage|'UNCLASSIFIED';
  epistemicState: RealityChainState;
  decision: 'CONTINUE'|'ABSTAIN'|'BLOCKED';
  reasons: string[];
  provenance: {
    declared: string;
    lineageCount: number;
    supportingRelationCount: number;
    contradictionCount: number;
  };
  verification: {
    state: string;
    cost: unknown|null;
    budget: unknown|null;
    nextBestObservation: string|null;
  };
  authority: {
    state: string;
    executionState: string;
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
};

const text=(value:unknown)=>typeof value==='string'&&value.trim()?value.trim():null;
const first=(a:Record<string,unknown>,keys:string[])=>{for(const k of keys) if(a[k]!==undefined&&a[k]!==null)return a[k]; return null;};
const haystack=(node:CanonicalGraphNode)=>[
  node.ontologyType,node.label,node.origin,node.provenance,...node.lineage,
  ...Object.keys(node.attributes),...Object.values(node.attributes).filter((v):v is string=>typeof v==='string'),
].join(' ').toLowerCase();

function relationMatches(edge:CanonicalGraphEdge,tokens:string[]){
  const value=`${edge.relation} ${edge.provenance} ${Object.keys(edge.attributes).join(' ')}`.toLowerCase();
  return tokens.some((token)=>value.includes(token));
}

export function readRealityChainNode(node:CanonicalGraphNode):RealityChainNodeReading {
  const value=haystack(node);
  const stage=REALITY_CHAIN_STAGES.find((candidate)=>value.includes(candidate.toLowerCase()))??'UNCLASSIFIED';
  const declared=text(first(node.attributes,['epistemicState','epistemic_state','epistemicClass','epistemic_class','state','verification_status']))?.toUpperCase();
  const state=REALITY_CHAIN_STATES.includes(declared as RealityChainState)?declared as RealityChainState:'UNKNOWN';
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
  };
}

export function readRealityChainEdge(edge:CanonicalGraphEdge) {
  const relation=edge.relation.toUpperCase();
  const material=['CAPTURE','EVIDENCE','FRICTION','TRANSFORM','HYPOTH','INFER','CLAIM','VERIFY','AUTHOR','ACTION','EXECUT','RETURN','CONTRAST','LEARN','SUPPORT','CONTRADICT'].some((token)=>relation.includes(token));
  return {material,provenance:edge.provenance||'UNKNOWN',relation:edge.relation,state:text(first(edge.attributes,['state','epistemicState','epistemic_state']))?.toUpperCase()??'UNKNOWN'};
}

export function buildRealityPassport(node:CanonicalGraphNode,edges:CanonicalGraphEdge[]):RealityPassport {
  const reading=readRealityChainNode(node);
  const connected=edges.filter((edge)=>edge.sourceNodeId===node.nodeId||edge.targetNodeId===node.nodeId);
  const supporting=connected.filter((edge)=>relationMatches(edge,['support','evidence','verify','observe','capture','derive','infer']));
  const contradictions=connected.filter((edge)=>relationMatches(edge,['contradict','counterevidence','conflict','falsif','reject']));
  const reasons:string[]=[];
  let decision:RealityPassport['decision']='CONTINUE';

  const claimLike=['CLAIM','INFERENCE','HYPOTHESIS','ACTION'].includes(reading.stage);
  const authorityRequired=reading.stage==='ACTION';
  const returnRequired=reading.stage==='ACTION'||reading.expectedReturn!==null;

  if (reading.state==='UNKNOWN'||reading.state==='MISSING'||reading.state==='NOT OBSERVED') {
    reasons.push('Epistemic state is not sufficiently observed.');
    decision='ABSTAIN';
  }
  if (claimLike && !reading.verificationState && supporting.length===0) {
    reasons.push('No explicit verification state or supporting relation is available.');
    decision='ABSTAIN';
  }
  if (contradictions.length>0) {
    reasons.push(`${contradictions.length} contradiction or counterevidence relation(s) remain visible.`);
  }
  if (authorityRequired && !reading.authority) {
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

  return {
    contract:'SFI-REALITY-PASSPORT-1.0',
    nodeId:node.nodeId,
    stage:reading.stage,
    epistemicState:reading.state,
    decision,
    reasons,
    provenance:{
      declared:node.provenance||'UNKNOWN',
      lineageCount:node.lineage.length,
      supportingRelationCount:supporting.length,
      contradictionCount:contradictions.length,
    },
    verification:{
      state:reading.verificationState??'UNKNOWN',
      cost:reading.verificationCost,
      budget:reading.verificationBudget,
      nextBestObservation:reading.nextBestObservation,
    },
    authority:{
      state:reading.authority??'UNKNOWN',
      executionState:reading.executionState??'UNKNOWN',
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
  };
}

export function realityChainCoverage(nodes:CanonicalGraphNode[]) {
  const present=new Set(nodes.map(readRealityChainNode).filter((item)=>item.stage!=='UNCLASSIFIED').map((item)=>item.stage));
  return REALITY_CHAIN_STAGES.map((stage)=>({stage,observed:present.has(stage)}));
}
