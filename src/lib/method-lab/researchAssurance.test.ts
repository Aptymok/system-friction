import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { assessMethodLabResearchAssurance } from './researchAssurance';
import type { MethodLabResearchObject } from './researchObjects';

const hash = (s: string) => createHash('sha256').update(s).digest('hex');
function object(overrides: Partial<MethodLabResearchObject> = {}): MethodLabResearchObject {
  return {
    objectId: 'QA-PUBLIC-DERIVATIVE', objectClass: 'AUDIT', title: 'Test',
    publicTitle: 'Test public', objective: 'Test evidence lineage', method: 'DOCUMENTARY_AUDIT',
    state: 'FINDINGS_REGISTERED', epistemicState: 'MIXED', returnState: 'PENDING',
    publicationState: 'PUBLIC_DERIVATIVE_READY', summary: 'Internal',
    publicSummary: 'Bounded public reconstruction', confidence: null,
    evidenceRefs: ['sha256:source-evidence'], findings: [],
    publicFindings: [{ id: 'F001', title: 'Test result', state: 'DERIVED', summary: 'A derived result', evidenceRefs: [] }],
    metrics: {}, publicMetrics: {}, limitations: ['Limited sample'],
    publicLimitations: ['Not externally validated'], lineage: [],
    version: '1.0.0', source: 'METHOD_LAB', updatedAt: '2026-10-22T00:00:00Z', ...overrides,
  };
}
function pkg(o: MethodLabResearchObject) {
  return { objectId: o.objectId, version: o.version, packageHash: hash('package'),
    files: ['README.md','FINDINGS.md','PUBLIC_TRACE.md','METRICS.json','PROVENANCE.md','THREATS_TO_VALIDITY.md','manifest.json']
      .map(path=>({path,sha256:hash(path)})),
    manifest: {rawDataIncluded:false,promotionRequired:true},
  };
}

test('eligible public derivative is reviewable but NEVER certified or published', () => {
  const o=object(), r=assessMethodLabResearchAssurance(o,pkg(o));
  assert.equal(r.p1StructuralStatus,'PASS');
  assert.equal(r.p2AdversarialStatus,'PASS');
  assert.equal(r.eligibleForGovernedReview,true);
  assert.equal(r.p3CertificationStatus,'NOT_CERTIFIED');
  assert.equal(r.p4DelegatedAuthorityStatus,'NOT_GRANTED');
  assert.equal(r.p5PublicationStatus,'NOT_PUBLISHED_BY_ASSESSMENT');
});

test('private object is excluded even when all structural fields are present', () => {
  const o=object({publicationState:'PRIVATE'});
  const r=assessMethodLabResearchAssurance(o,pkg(o));
  assert.equal(r.eligibleForGovernedReview,false);
  assert.ok(r.failed.includes('P1_PUBLIC_BOUNDARY'));
});
test('untested study may not claim verified empirical return', () => {
  const o=object({epistemicState:'NOT_TESTED',returnState:'VERIFIED'});
  const r=assessMethodLabResearchAssurance(o,pkg(o));
  assert.ok(r.failed.includes('P2_NO_SIMULATION_AS_RETURN'));
});
test('empty public findings, missing source refs and limitations each fail closed', () => {
  for (const broken of [{publicFindings:[]},{evidenceRefs:[]},{publicLimitations:[]}]) {
    const o=object(broken as Partial<MethodLabResearchObject>);
    const r=assessMethodLabResearchAssurance(o,pkg(o));
    assert.equal(r.eligibleForGovernedReview,false);
  }
});
test('invalid package fingerprints or duplicate entries are rejected', () => {
  const o=object(), p=pkg(o);
  p.files.push({...p.files[0]});
  const bad=assessMethodLabResearchAssurance(o,p);
  assert.ok(bad.failed.includes('P1_PACKAGE_INTEGRITY'));
  const mismatch=assessMethodLabResearchAssurance(o,{...pkg(o),packageHash:'fake'});
  assert.ok(mismatch.failed.includes('P1_PACKAGE_INTEGRITY'));
});
test('review does not promote a merely published object or invent certification', () => {
  const o=object({publicationState:'HUB_PUBLISHED',source:'EXTERNAL_AGENT'});
  const r=assessMethodLabResearchAssurance(o,pkg(o));
  assert.equal(r.eligibleForGovernedReview,false);
  assert.equal(r.p3CertificationStatus,'NOT_CERTIFIED');
});
test('no source or private raw data flows through the assurance output', () => {
  const o=object({evidenceRefs:['private:do-not-export'],summary:'private-not-for-output'});
  const output=JSON.stringify(assessMethodLabResearchAssurance(o,pkg(o)));
  assert.ok(!output.includes('private:do-not-export'));
  assert.ok(!output.includes('private-not-for-output'));
});
