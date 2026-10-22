import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMethodLabIndependentReviewDossier } from './researchReviewDossier';
import type { MethodLabResearchObject } from './researchObjects';
import type { assessMethodLabResearchAssurance } from './researchAssurance';

type Assessment = ReturnType<typeof assessMethodLabResearchAssurance>;
function audit(overrides: Partial<MethodLabResearchObject> = {}): MethodLabResearchObject {
  return {
    objectId: 'SFI-AUDIT-TEST', objectClass: 'AUDIT',
    title: 'INTERNAL-SENSITIVE-TITLE', publicTitle: 'Bounded public audit',
    objective: 'Internal method testing', method: 'SFI_AUDIT', state: 'FINDINGS_REGISTERED',
    epistemicState: 'MIXED', returnState: 'PENDING', publicationState: 'PUBLIC_DERIVATIVE_READY',
    summary: 'PRIVATE_SUMMARY_NOT_FOR_OUTPUT', publicSummary: 'Only bounded de-identified findings',
    confidence: 0.92,
    evidenceRefs: ['private:UNPUBLISHED_SOURCE_IDENTIFIER'], findings: [],
    publicFindings: [{ id:'F001',title:'Incomplete state',state:'OBSERVED',
      summary:'The public finding is not independently reproduced',evidenceRefs:[] }],
    metrics: { privateInternalCount: 999 }, publicMetrics: {source_records: 20},
    limitations:['INTERNAL_RESTRICTED_LIMIT'], publicLimitations:['No raw records disclosed'],
    lineage: ['private:RESTRICTED_LINEAGE'],version:'1.0.1',source:'METHOD_LAB',
    updatedAt:'2026-10-22T00:00:00Z',...overrides,
  };
}
function assurance(o: MethodLabResearchObject, ready = true) {
  return {
    objectId:o.objectId,version:o.version,packageHash:'a'.repeat(64),
    eligibleForGovernedReview:ready,p1StructuralStatus:ready?'PASS':'FAIL',p2AdversarialStatus:'PASS',
  } as Assessment;
}
test('P1/P2 PASS produces only a REVIEW REQUEST, never a certificate or publication',()=>{
  const o=audit();
  const d=buildMethodLabIndependentReviewDossier(o,assurance(o));
  assert.equal(d.publicDerivativeEligible,true);
  assert.equal(d.automatedAssessment.p1,'PASS');
  assert.equal(d.automatedAssessment.p2,'PASS');
  assert.equal(d.certificationStatus,'NOT_CERTIFIED');
  assert.equal(d.certificateId,null);
  assert.equal(d.signedAt,null);
  assert.equal(d.transportAuthorized,false);
  assert.equal(d.issuedCredentials,false);
  assert.equal(d.publicationStatus,'NOT_PUBLISHED_BY_DOSSIER');
  assert.equal(d.p0FreshIntegrityReceipt,'NOT_ATTACHED_MUST_BE_CAPTURED_AT_APPROVAL');
  assert.equal(d.reviewTasks.every(t=>t.status==='NOT_REVIEWED'),true);
  assert.equal(d.findingsToReview[0].sourceAudit,'NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(d.packageHash,'a'.repeat(64));
});
test('Method Lab audit requires cohort, calendar clock and quantile independent reproduction',()=>{
  const d=buildMethodLabIndependentReviewDossier(audit(),assurance(audit()));
  for(const id of ['R01_SOURCE','R02_METHOD','R03_LINEAGE','R04_REPRODUCTION','R05_ADVERSARIAL',
     'R06A_COHORT','R06B_CLOCKS','R06C_QUANTILES','R07_PRIVACY','R08_AUTHORITY','R09_DATA_PLANE','R10_CERTIFICATE','R11_RETURN'])
    assert.ok(d.reviewTasks.some(t=>t.id===id),id);
  assert.equal(new Set(d.reviewTasks.map(t=>t.id)).size,d.reviewTasks.length);
});
test('no internal evidence/source references or internal summary leaks in reviewer request',()=>{
  const o=audit(), d=buildMethodLabIndependentReviewDossier(o,assurance(o));
  const v=JSON.stringify(d);
  for(const secret of ['INTERNAL-SENSITIVE-TITLE','PRIVATE_SUMMARY_NOT_FOR_OUTPUT',
    'UNPUBLISHED_SOURCE_IDENTIFIER','RESTRICTED_LINEAGE','INTERNAL_RESTRICTED_LIMIT','privateInternalCount'])
    assert.ok(!v.includes(secret),secret);
});
test('PRIVATE object does not expose derivative or findings even when a caller asserts readiness',()=>{
  const o=audit({publicationState:'PRIVATE',publicSummary:'PRIVATE_UNRELEASED_CONTEXT'});
  const d=buildMethodLabIndependentReviewDossier(o,assurance(o));
  assert.equal(d.publicDerivativeEligible,false);
  assert.equal(d.publicCandidate,null);
  assert.deepEqual(d.findingsToReview,[]);
  assert.equal(d.certificationStatus,'NOT_CERTIFIED');
  assert.ok(!JSON.stringify(d).includes('PRIVATE_UNRELEASED_CONTEXT'));
});
test('mismatched assurance identity/version cannot be adopted as a reviewable dossier',()=>{
  const o=audit();
  const d=buildMethodLabIndependentReviewDossier(o,{...assurance(o),objectId:'DIFFERENT'} as Assessment);
  assert.equal(d.publicDerivativeEligible,false);
});
test('failed P1/P2 eligibility yields no released public candidate',()=>{
  const o=audit();
  const d=buildMethodLabIndependentReviewDossier(o,assurance(o,false));
  assert.equal(d.publicDerivativeEligible,false);
  assert.equal(d.publicCandidate,null);
  assert.equal(d.certificationStatus,'NOT_CERTIFIED');
});
