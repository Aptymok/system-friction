import test from 'node:test';
import assert from 'node:assert/strict';
import type { CanonicalGraphEdge, CanonicalGraphNode } from '../../../packages/graph/src';
import { buildRealityPassport } from './realityChainProjection';

function node(partial:Partial<CanonicalGraphNode> & Pick<CanonicalGraphNode,'nodeId'>):CanonicalGraphNode {
  return {
    nodeId:partial.nodeId,
    label:partial.label ?? partial.nodeId,
    ontologyType:partial.ontologyType ?? 'claim',
    profile:partial.profile ?? 'sfi',
    origin:partial.origin ?? 'test',
    provenance:partial.provenance ?? 'test',
    lineage:partial.lineage ?? [],
    attributes:partial.attributes ?? {},
    createdAt:partial.createdAt ?? '2026-10-02T00:00:00.000Z',
    updatedAt:partial.updatedAt ?? '2026-10-02T00:00:00.000Z',
  };
}

function edge(partial:Partial<CanonicalGraphEdge> & Pick<CanonicalGraphEdge,'edgeId'|'sourceNodeId'|'targetNodeId'>):CanonicalGraphEdge {
  return {
    edgeId:partial.edgeId,
    sourceNodeId:partial.sourceNodeId,
    targetNodeId:partial.targetNodeId,
    relation:partial.relation ?? 'related_to',
    weight:partial.weight ?? 1,
    profile:partial.profile ?? 'sfi',
    origin:partial.origin ?? 'test',
    provenance:partial.provenance ?? 'test',
    lineage:partial.lineage ?? [],
    attributes:partial.attributes ?? {},
    createdAt:partial.createdAt ?? '2026-10-02T00:00:00.000Z',
    updatedAt:partial.updatedAt ?? '2026-10-02T00:00:00.000Z',
  };
}

test('claim without represented verification or support abstains',()=>{
  const subject=node({nodeId:'claim-1',ontologyType:'CLAIM',attributes:{epistemicClass:'INFERRED'}});
  const passport=buildRealityPassport(subject,[]);
  assert.equal(passport.decision,'ABSTAIN');
  assert.equal(passport.verification.state,'UNKNOWN');
});

test('action without represented authority is blocked',()=>{
  const subject=node({nodeId:'action-1',ontologyType:'ACTION',attributes:{epistemicClass:'DERIVED',verificationState:'VERIFIED'}});
  const passport=buildRealityPassport(subject,[]);
  assert.equal(passport.decision,'BLOCKED');
  assert.match(passport.reasons.join(' '),/authority/i);
});

test('support relation preserves contradiction visibility',()=>{
  const subject=node({nodeId:'claim-2',ontologyType:'CLAIM',attributes:{epistemicClass:'DERIVED',verificationState:'VERIFIED'}});
  const evidence=node({nodeId:'evidence-1',ontologyType:'EVIDENCE',attributes:{epistemicClass:'OBSERVED'}});
  const rival=node({nodeId:'rival-1',ontologyType:'HYPOTHESIS',attributes:{epistemicClass:'INFERRED'}});
  const edges=[
    edge({edgeId:'support',sourceNodeId:evidence.nodeId,targetNodeId:subject.nodeId,relation:'supports_claim'}),
    edge({edgeId:'contra',sourceNodeId:rival.nodeId,targetNodeId:subject.nodeId,relation:'contradicts_claim'}),
  ];
  const passport=buildRealityPassport(subject,edges);
  assert.equal(passport.provenance.supportingRelationCount,1);
  assert.equal(passport.provenance.contradictionCount,1);
});

test('observed return is never reduced to execution success',()=>{
  const subject=node({
    nodeId:'action-2',
    ontologyType:'ACTION',
    attributes:{
      epistemicClass:'OBSERVED',
      verificationState:'VERIFIED',
      authority:'ROOT',
      expectedReturn:'observable-change',
      observedReturn:'measured-change',
    },
  });
  const passport=buildRealityPassport(subject,[]);
  assert.equal(passport.returnState.status,'OBSERVED');
  assert.equal(passport.returnState.observed,'measured-change');
  assert.equal(passport.boundary,'DERIVED_PROJECTION_NOT_CANONICAL_TRUTH');
});


test('underscore epistemic states normalize without manufacturing observation',()=>{
  const subject=node({nodeId:'claim-underscore',ontologyType:'CLAIM',attributes:{epistemicClass:'NOT_OBSERVED'}});
  const passport=buildRealityPassport(subject,[]);
  assert.equal(passport.epistemicState,'NOT OBSERVED');
  assert.equal(passport.decision,'ABSTAIN');
});

test('passport exposes exact support and contradiction references',()=>{
  const subject=node({nodeId:'claim-refs',ontologyType:'CLAIM',attributes:{epistemicClass:'DERIVED',verificationState:'VERIFIED'}});
  const evidence=node({nodeId:'evidence-ref',ontologyType:'EVIDENCE',attributes:{epistemicClass:'OBSERVED'}});
  const rival=node({nodeId:'rival-ref',ontologyType:'HYPOTHESIS',attributes:{epistemicClass:'INFERRED'}});
  const edges=[
    edge({edgeId:'edge-support-ref',sourceNodeId:evidence.nodeId,targetNodeId:subject.nodeId,relation:'supports_claim'}),
    edge({edgeId:'edge-contra-ref',sourceNodeId:rival.nodeId,targetNodeId:subject.nodeId,relation:'contradicts_claim'}),
  ];
  const passport=buildRealityPassport(subject,edges);
  assert.deepEqual(passport.provenance.supportingRelationRefs,['edge-support-ref']);
  assert.deepEqual(passport.provenance.contradictionRefs,['edge-contra-ref']);
});

test('action response is not treated as persisted state without explicit persistence evidence',()=>{
  const subject=node({
    nodeId:'action-persistence',
    ontologyType:'ACTION',
    attributes:{
      epistemicClass:'OBSERVED',
      verificationState:'VERIFIED',
      authority:'ROOT',
      executionState:'SUCCEEDED',
      expectedReturn:'change',
    },
  });
  const passport=buildRealityPassport(subject,[]);
  assert.equal(passport.persistence.represented,false);
  assert.equal(passport.persistence.boundary,'ACTION_RESPONSE_NOT_PERSISTED_STATE_UNLESS_EXPLICITLY_REPRESENTED');
});

test('external cognitive peer style inferred claim remains bounded without verification',()=>{
  const subject=node({
    nodeId:'external-peer-claim',
    ontologyType:'CLAIM',
    attributes:{
      epistemicClass:'INFERRED',
      authorityExpanded:false,
      mayMintReturn:false,
      mayPromoteCanon:false,
    },
  });
  const passport=buildRealityPassport(subject,[]);
  assert.equal(passport.decision,'ABSTAIN');
  assert.equal(passport.authority.authorityExpanded,false);
  assert.equal(passport.authority.mayMintReturn,false);
  assert.equal(passport.authority.mayPromoteCanon,false);
  assert.equal(passport.contract,'SFI-REALITY-PASSPORT-1.2');
});


test('passport explicitly preserves the public Reality Chain Method boundary',()=>{
  const subject=node({nodeId:'method-boundary',ontologyType:'HYPOTHESIS',attributes:{epistemicClass:'INFERRED'}});
  const passport=buildRealityPassport(subject,[]);
  assert.equal(passport.methodBoundary,'PROJECTS_REALITY_WITHOUT_REDEFINING_REALITY_CHAIN_METHOD');
  assert.equal(passport.boundary,'DERIVED_PROJECTION_NOT_CANONICAL_TRUTH');
});


test('repeated support from the same represented source root is not counted as independent evidence',()=>{
  const subject=node({nodeId:'claim-independent',ontologyType:'CLAIM',attributes:{epistemicClass:'DERIVED',verificationState:'VERIFIED'}});
  const edges=[
    edge({edgeId:'copy-1',sourceNodeId:'e1',targetNodeId:subject.nodeId,relation:'supports_claim',attributes:{sourceRootId:'observation-root-1'}}),
    edge({edgeId:'copy-2',sourceNodeId:'e2',targetNodeId:subject.nodeId,relation:'supports_claim',attributes:{sourceRootId:'observation-root-1'}}),
    edge({edgeId:'independent-2',sourceNodeId:'e3',targetNodeId:subject.nodeId,relation:'supports_claim',attributes:{sourceRootId:'observation-root-2'}}),
  ];
  const passport=buildRealityPassport(subject,edges);
  assert.equal(passport.provenance.independence.state,'REPRESENTED');
  assert.equal(passport.provenance.independence.independentRootCount,2);
  assert.equal(passport.provenance.independence.duplicateSupportCount,1);
  assert.match(passport.reasons.join(' '),/not counted as independent observations/i);
});

test('independence remains unknown when supporting edges do not expose source roots',()=>{
  const subject=node({nodeId:'claim-unknown-independence',ontologyType:'CLAIM',attributes:{epistemicClass:'DERIVED',verificationState:'VERIFIED'}});
  const edges=[edge({edgeId:'support-no-root',sourceNodeId:'e1',targetNodeId:subject.nodeId,relation:'supports_claim'})];
  const passport=buildRealityPassport(subject,edges);
  assert.equal(passport.provenance.independence.state,'UNKNOWN');
  assert.equal(passport.provenance.independence.independentRootCount,null);
});

test('verification provenance remains distinct from verification result',()=>{
  const subject=node({
    nodeId:'claim-verifier',
    ontologyType:'CLAIM',
    attributes:{
      epistemicClass:'DERIVED',
      verificationState:'VERIFIED',
      verificationMethod:'watermark_detector',
      verifier:'detector-A',
      verifierSelectionReason:'lowest bounded cost for origin claim',
      verificationCost:3,
      verificationCostUnit:'calls',
      verificationBudget:10,
      verificationBudgetUnit:'calls',
      falseAcceptBoundary:'1e-7',
      falseRejectBoundary:'benchmark-dependent',
      expectedInformationGain:0.6,
      provenanceBindingMethod:'soft-watermark',
      provenanceBindingResult:'present',
      verificationPerturbation:'object transformed during binding',
    },
  });
  const passport=buildRealityPassport(subject,[]);
  assert.equal(passport.verification.method,'watermark_detector');
  assert.equal(passport.verification.verifier,'detector-A');
  assert.equal(passport.verification.costUnit,'calls');
  assert.equal(passport.provenance.contentBinding.method,'soft-watermark');
  assert.equal(passport.provenance.contentBinding.result,'present');
  assert.equal(passport.provenance.contentBinding.boundary,'PROVENANCE_BINDING_DOES_NOT_PROVE_EVENT_TRUTH');
  assert.equal(passport.verification.processImpact,'object transformed during binding');
});
