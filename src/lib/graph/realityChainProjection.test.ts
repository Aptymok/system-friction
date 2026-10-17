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
  assert.equal(passport.contract,'SFI-REALITY-PASSPORT-1.1');
});


test('passport explicitly preserves the public Reality Chain Method boundary',()=>{
  const subject=node({nodeId:'method-boundary',ontologyType:'HYPOTHESIS',attributes:{epistemicClass:'INFERRED'}});
  const passport=buildRealityPassport(subject,[]);
  assert.equal(passport.methodBoundary,'PROJECTS_REALITY_WITHOUT_REDEFINING_REALITY_CHAIN_METHOD');
  assert.equal(passport.boundary,'DERIVED_PROJECTION_NOT_CANONICAL_TRUTH');
});

test('represented repeated evidence root is disclosed, never double-counted as independent confirmation',()=>{
  const subject=node({nodeId:'claim-repeated-evidence',ontologyType:'CLAIM',attributes:{epistemicClass:'DERIVED',verificationState:'VERIFIED'}});
  const edges=[
    edge({edgeId:'support-1',sourceNodeId:'doc-1',targetNodeId:subject.nodeId,relation:'supports',attributes:{sourceRootId:'original-source-1'}}),
    edge({edgeId:'support-2',sourceNodeId:'doc-2',targetNodeId:subject.nodeId,relation:'supports',attributes:{sourceRootId:'original-source-1'}}),
  ];
  const passport=buildRealityPassport(subject,edges);
  assert.equal(passport.contract,'SFI-REALITY-PASSPORT-1.1','do not roll contract back to 1.0');
  assert.equal(passport.provenance.independence.state,'REPRESENTED');
  assert.equal(passport.provenance.independence.independentRootCount,1);
  assert.equal(passport.provenance.independence.duplicateSupportCount,1);
  assert.match(passport.reasons.join(' '),/not independent observations/i);
  assert.equal(passport.provenance.independence.boundary,'MATERIAL_OR_HASH_DIVERSITY_DOES_NOT_PROVE_EVIDENCE_INDEPENDENCE');
});

test('unrepresented evidence roots remain UNKNOWN rather than invented as independent',()=>{
  const subject=node({nodeId:'claim-unknown-roots',ontologyType:'CLAIM',attributes:{epistemicClass:'INFERRED'}});
  const supporting=edge({edgeId:'support-unknown',sourceNodeId:'source-unknown',targetNodeId:subject.nodeId,relation:'supports'});
  const passport=buildRealityPassport(subject,[supporting]);
  assert.equal(passport.provenance.independence.state,'UNKNOWN');
  assert.equal(passport.provenance.independence.independentRootCount,null);
  assert.equal(passport.provenance.independence.duplicateSupportCount,null);
});

test('verification provenance exposes method, verifier, cost units and process impact without asserting truth',()=>{
  const subject=node({
    nodeId:'claim-verification-trail',
    ontologyType:'CLAIM',
    attributes:{
      epistemicClass:'DERIVED',
      verificationState:'VERIFIED',
      verificationMethod:'bounded-evidence-check',
      verifier:'authorized-checker',
      verifierSelectionReason:'separation-of-duties',
      verificationCostUnit:'MXN',
      verificationBudgetUnit:'MXN',
      expectedInformationGain:0.2,
      falseAcceptBoundary:'not quantified',
      falseRejectBoundary:'not quantified',
      verificationPerturbation:'minimal',
      provenanceBindingMethod:'sha256',
      provenanceBindingResult:'matched-document',
    },
  });
  const passport=buildRealityPassport(subject,[]);
  assert.equal(passport.verification.method,'bounded-evidence-check');
  assert.equal(passport.verification.verifier,'authorized-checker');
  assert.equal(passport.verification.selectionReason,'separation-of-duties');
  assert.equal(passport.verification.costUnit,'MXN');
  assert.equal(passport.verification.expectedInformationGain,0.2);
  assert.equal(passport.verification.processImpact,'minimal');
  assert.equal(passport.provenance.contentBinding.method,'sha256');
  assert.equal(passport.provenance.contentBinding.boundary,'PROVENANCE_BINDING_DOES_NOT_PROVE_EVENT_TRUTH');
  assert.equal(passport.methodBoundary,'PROJECTS_REALITY_WITHOUT_REDEFINING_REALITY_CHAIN_METHOD');
});
