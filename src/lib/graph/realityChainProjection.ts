import type { CanonicalGraphEdge, CanonicalGraphNode } from '../../../packages/graph/src';

export const REALITY_CHAIN_STAGES = ['WORLD','CAPTURE','EVIDENCE','TRANSFORMATION','INFERENCE','VERIFICATION','AUTHORITY','ACTION','RETURN'] as const;
export type RealityChainStage = typeof REALITY_CHAIN_STAGES[number];
export type RealityChainState = 'OBSERVED'|'DERIVED'|'INFERRED'|'UNKNOWN'|'NOT OBSERVED'|'NOT VERIFIED'|'NOT APPLICABLE';

export type RealityChainNodeReading = {
  stage: RealityChainStage|'UNCLASSIFIED'; state: RealityChainState; sourceVersion: string|null; captureTime: string|null;
  uncertainty: unknown|null; verificationState: string|null; authority: string|null; executionState: string|null;
  expectedReturn: unknown|null; observedReturn: unknown|null; applicableObligation: unknown|null;
};

const text=(value:unknown)=>typeof value==='string'&&value.trim()?value.trim():null;
const first=(a:Record<string,unknown>,keys:string[])=>{for(const k of keys) if(a[k]!==undefined&&a[k]!==null)return a[k]; return null;};
const haystack=(node:CanonicalGraphNode)=>[node.ontologyType,node.label,node.origin,node.provenance,...node.lineage,...Object.keys(node.attributes),...Object.values(node.attributes).filter((v):v is string=>typeof v==='string')].join(' ').toLowerCase();

export function readRealityChainNode(node:CanonicalGraphNode):RealityChainNodeReading {
  const value=haystack(node);
  const stage=REALITY_CHAIN_STAGES.find((candidate)=>value.includes(candidate.toLowerCase()))??'UNCLASSIFIED';
  const declared=text(first(node.attributes,['epistemicState','epistemic_state','state','verification_status']))?.toUpperCase();
  const allowed:RealityChainState[]=['OBSERVED','DERIVED','INFERRED','UNKNOWN','NOT OBSERVED','NOT VERIFIED','NOT APPLICABLE'];
  const state=allowed.includes(declared as RealityChainState)?declared as RealityChainState:'UNKNOWN';
  return {
    stage,state,
    sourceVersion:text(first(node.attributes,['sourceVersion','source_version','version'])),
    captureTime:text(first(node.attributes,['captureTime','capture_time','observedAt','observed_at','occurredAt','occurred_at'])),
    uncertainty:first(node.attributes,['uncertainty','confidenceBoundary','confidence_boundary']),
    verificationState:text(first(node.attributes,['verificationState','verification_state','verification_status'])),
    authority:text(first(node.attributes,['authority','authorityClass','authority_class','authorizedBy','authorized_by'])),
    executionState:text(first(node.attributes,['executionState','execution_state','execution_status'])),
    expectedReturn:first(node.attributes,['expectedReturn','expected_return','expectedOutcome','expected_outcome','prediction']),
    observedReturn:first(node.attributes,['observedReturn','observed_return','outcome','observedOutcome','observed_outcome']),
    applicableObligation:first(node.attributes,['applicableObligation','applicable_obligation','obligation','obligations']),
  };
}

export function readRealityChainEdge(edge:CanonicalGraphEdge) {
  const relation=edge.relation.toUpperCase();
  const material=['CAPTURE','EVIDENCE','TRANSFORM','INFER','VERIFY','AUTHOR','ACTION','EXECUT','RETURN','CONTRAST','SUPPORT','CONTRADICT'].some((token)=>relation.includes(token));
  return {material,provenance:edge.provenance||'UNKNOWN',relation:edge.relation,state:text(first(edge.attributes,['state','epistemicState','epistemic_state']))?.toUpperCase()??'UNKNOWN'};
}

export function realityChainCoverage(nodes:CanonicalGraphNode[]) {
  const present=new Set(nodes.map(readRealityChainNode).filter((item)=>item.stage!=='UNCLASSIFIED').map((item)=>item.stage));
  return REALITY_CHAIN_STAGES.map((stage)=>({stage,observed:present.has(stage)}));
}
