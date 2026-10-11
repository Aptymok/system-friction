import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadOfficialDossier,
  sourceViewAsOf,
  summaryOfCase,
  validateOfficialDossier,
} from './mihmt-knight-official.mjs';

const d=loadOfficialDossier();
const copy=()=>structuredClone(d);

test('case contains real official sources, dated filings, document-specific fact locators',()=>{
  assert.equal(d.dataClass,'REAL_HISTORICAL_OFFICIAL_DOCUMENTATION');
  assert.equal(d.studyRole,'RETROSPECTIVE_RECONSTRUCTION_AND_CALIBRATION_ONLY');
  assert.equal(d.officialSources.length,5);
  assert.equal(d.documentedFindings.length,15);
  assert.equal(d.dimensionalReadings.length,11);
  assert.equal(d.relationships.length,8);
  assert.ok(d.officialSources.every(s=>s.url.startsWith('https://www.sec.gov/')));
  assert.ok(d.documentedFindings.every(f=>f.locator&&f.sourceId));
});
test('pre-incident date admits only public regulatory rule context, not future SEC findings',()=>{
  const v=sourceViewAsOf(d,'2012-08-01');
  assert.deepEqual(v.sources.map(s=>s.id),['SEC-RLP-67347']);
  assert.deepEqual(v.findings.map(f=>f.id),['F01']);
  assert.deepEqual(v.documentedQuantities,[]);
  assert.equal(v.hasPublicIncidentSpecificClaims,false);
  assert.equal(v.prospectivePredictionValidated,false);
  assert.equal(v.actorKnowledgeFromPublicDate,'UNKNOWN_UNLESS_SEPARATE_CONTEMPORANEOUS_RECEIPT');
});
test('even if same date is supplied, unavailable intra-day timestamps cannot be assumed',()=>{
  const v=sourceViewAsOf(d,'2012-08-02');
  assert.equal(v.hasPublicIncidentSpecificClaims,false);
  assert.ok(v.excludedSources.some(s=>s.id==='KCG-EX-99.1-20120802'));
});
test('August 2 issuer disclosure only enters subsequent public snapshot',()=>{
  const v=sourceViewAsOf(d,'2012-08-03');
  assert.ok(v.sources.some(s=>s.id==='KCG-EX-99.1-20120802'));
  assert.ok(v.findings.some(f=>f.id==='F10'));
  assert.ok(!v.findings.some(f=>f.id==='F05'));
  assert.ok(!v.findings.some(f=>f.id==='F09'));
  assert.ok(v.documentedQuantities.some(q=>q.id==='D09'));
  assert.ok(!v.documentedQuantities.some(q=>q.id==='D10'));
});
test('August 6 financing is subsequent document, not previous loss or forecast',()=>{
  const before=sourceViewAsOf(d,'2012-08-06');
  const after=sourceViewAsOf(d,'2012-08-07');
  assert.ok(!before.findings.some(f=>f.id==='F11'));
  assert.ok(after.findings.some(f=>f.id==='F11'));
  assert.equal(after.documentedQuantities.find(q=>q.id==='D11').value,400000000);
});
test('SEC postmortem does not leak into pre-2013 public timeline',()=>{
  const before=sourceViewAsOf(d,'2013-10-16');
  const after=sourceViewAsOf(d,'2013-10-17');
  assert.ok(!before.findings.some(f=>f.id==='F05'));
  assert.ok(after.findings.some(f=>f.id==='F05'));
  assert.ok(after.findings.some(f=>f.id==='F09'));
  assert.equal(after.documentedQuantities.length,11);
  assert.equal(after.relations.length,8);
  assert.equal(after.findings.length,15);
});
test('correctly distinguishes company preliminary $440m from later SEC more than $460m',()=>{
  const v=sourceViewAsOf(d,'2013-10-17');
  const preliminary=v.documentedQuantities.find(q=>q.id==='D09');
  const later=v.documentedQuantities.find(q=>q.id==='D10');
  assert.deepEqual([preliminary.value,preliminary.operator],[440000000,'APPROXIMATELY']);
  assert.deepEqual([later.value,later.operator],[460000000,'GREATER_THAN']);
  assert.notEqual(preliminary.findingRef,later.findingRef);
});
test('SEC 4m number is market executions, not fictitious 4m orders',()=>{
  const q=d.dimensionalReadings.find(r=>r.id==='D06');
  assert.equal(q.measure,'market_executions');
  assert.equal(q.operator,'GREATER_THAN');
  assert.equal(d.documentedFindings.find(f=>f.id==='F07').quantity.parentOrders,212);
});
test('rejects fabricated source domains, fictional epistemic admissions and unsupported references',()=>{
  const f=copy();f.officialSources[0].url='https://example.com/not-an-official-source';
  assert.throws(()=>validateOfficialDossier(f),/INVALID_OFFICIAL_SOURCE/);
  const x=copy();x.sourcePolicies.acceptedIntoCanonicalRealityChain=true;
  assert.throws(()=>validateOfficialDossier(x),/FORBIDDEN_OR_UNPROVEN_STATUS/);
  const y=copy();y.documentedFindings[0].sourceId='fabricated';
  assert.throws(()=>validateOfficialDossier(y),/UNSUPPORTED_FINDING/);
});
test('does not create canonical Phi or synthetic risk score from unrelated real units',()=>{
  const output=summaryOfCase(d);
  assert.equal(output.dataClass,'REAL_HISTORICAL_OFFICIAL_DOCUMENTATION');
  assert.equal(output.empiricalPerformance,'NOT_EVALUATED');
  assert.equal(output.canonicalEvidenceAdmitted,false);
  assert.equal(output.realityChainEligible,false);
  assert.ok(!Object.hasOwn(output,'riskPrediction'));
  assert.ok(!Object.hasOwn(output,'phi'));
  assert.equal(output.temporalViews.length,3);
});
test('rejects inverted synthetic dates and missing timestamps rather than filling historical gaps',()=>{
  const f=copy();f.officialSources[0].publicAvailableFrom='2012-02-30';
  assert.throws(()=>validateOfficialDossier(f),/INVALID_OFFICIAL_SOURCE/);
  assert.throws(()=>sourceViewAsOf(d,'not-a-date'),/INVALID_AS_OF_DAY/);
});
