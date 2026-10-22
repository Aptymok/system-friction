import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { assessMethodLabResearchAssurance } from './researchAssurance';
import type { MethodLabResearchObject } from './researchObjects';

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value === null || typeof value !== 'object') return value;
  return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((out, key) => {
    out[key] = canonical((value as Record<string, unknown>)[key]);
    return out;
  }, {});
}
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
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
  const manifest = {
    schema: 'SFI-METHOD-LAB-RESEARCH-PACKAGE-1.0',
    generatedAt: o.updatedAt,
    sourceOfTruth: 'METHOD_LAB_EVENT_LEDGER',
    promotionRequired: true,
    rawDataIncluded: false,
    object: { objectId: o.objectId, version: o.version },
  };
  const files = ['README.md','FINDINGS.md','PUBLIC_TRACE.md','METRICS.json','PROVENANCE.md','THREATS_TO_VALIDITY.md','manifest.json']
    .map(path => ({ path, content: path === 'manifest.json' ? JSON.stringify(manifest, null, 2) : 'Test public derivative: '+path }))
    .map(file => ({ ...file, sha256: hash(file.content) }));
  return { objectId: o.objectId, version: o.version,
    packageHash: hash(files.map(f => ({ path: f.path, sha256: f.sha256 }))), files, manifest };
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
test('tampering with file bytes is rejected even when the original hash has a valid shape', () => {
  const o = object(), p = pkg(o);
  p.files[0].content = 'Unexpected replacement';
  const r = assessMethodLabResearchAssurance(o, p);
  assert.ok(r.failed.includes('P1_PACKAGE_INTEGRITY'));
  assert.equal(r.eligibleForGovernedReview, false);
});
test('tampering with an SHA and recomputing aggregate still fails independent file verification', () => {
  const o = object(), p = pkg(o);
  p.files[0].sha256 = hash('unrelated');
  p.packageHash = hash(p.files.map(f => ({ path: f.path, sha256: f.sha256 })));
  const r = assessMethodLabResearchAssurance(o, p);
  assert.ok(r.failed.includes('P1_PACKAGE_INTEGRITY'));
});
test('a self-consistent package for another object is rejected by manifest binding', () => {
  const o = object(), p = pkg(o);
  p.manifest.object.objectId = 'UNRELATED-OBJECT';
  const f = p.files.find(f => f.path === 'manifest.json')!;
  f.content = JSON.stringify(p.manifest, null, 2);
  f.sha256 = hash(f.content);
  p.packageHash = hash(p.files.map(v => ({ path: v.path, sha256: v.sha256 })));
  const r = assessMethodLabResearchAssurance(o, p);
  assert.equal(r.p1StructuralStatus, 'FAIL');
  assert.ok(r.failed.includes('P1_MANIFEST_BINDING'));
});
test('mismatch between manifest representation and content is rejected', () => {
  const o = object(), p = pkg(o);
  p.manifest.generatedAt = '2000-01-01T00:00:00Z';
  const r = assessMethodLabResearchAssurance(o, p);
  assert.ok(r.failed.includes('P1_MANIFEST_BINDING'));
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
