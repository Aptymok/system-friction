import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSyntheticResearchReviewPreview, verifySyntheticResearchReviewPreview } from './review-preview.mjs';

const fixture = JSON.parse(readFileSync(new URL('./aiweeknyc.case.json',import.meta.url),'utf8'));
const make = () => buildSyntheticResearchReviewPreview(fixture);

test('two reproducible, synthetic-only candidate paths are inspectable without writes',() => {
  const preview = make();
  assert.equal(preview.cases.length,2);
  assert.deepEqual(preview.cases.map(x => x.mode),['backcast','forecast']);
  assert.equal(preview.boundaries.scientificCertification,'NOT_CERTIFIED');
  assert.equal(preview.boundaries.publicationAuthorization,'NOT_GRANTED');
  assert.equal(preview.boundaries.repositoryPromotion,'FORBIDDEN');
  assert.equal(preview.boundaries.externalReturn,'NOT_OBSERVED');
  assert.equal(preview.privateRealReferenceCopied,false);
  assert.equal(verifySyntheticResearchReviewPreview(preview,fixture),true);
});
test('forecast cannot see synthetic terminal return and no candidate claims observed evidence',() => {
  const preview = make();
  const [backcast,forecast] = preview.cases;
  assert.ok(backcast.input.anchors.return);
  assert.equal('return' in forecast.input.anchors,false);
  for(const item of preview.cases){
    assert.equal(item.observedReturn,'NOT_AVAILABLE');
    assert.equal(item.canonicalEvidenceEligible,false);
    assert.equal(item.realExecution,false);
    assert.equal(item.baseline.producedBy,'DETERMINISTIC_BASELINE_NOT_LLM');
    assert.ok(item.baseline.inferences.every(x=>x.epistemicClass==='INFERRED'));
    assert.ok(item.baseline.executionCandidates.every(x=>x.executionState==='NOT_EXECUTED'));
  }
});
test('private realReference changes cannot influence the exported synthetic preview',() => {
  const altered = structuredClone(fixture);
  altered.realReference.title = 'DO_NOT_SHARE_PRIVATE_RECORDING_TITLE';
  altered.realReference.artifact = 'SENSITIVE_PRIVATE_DRIVE_IDENTIFIER';
  altered.realReference.discrepancy = 'PRIVATE_ATTENDEE_LOG';
  const original = make();
  const modified = buildSyntheticResearchReviewPreview(altered);
  assert.deepEqual(modified,original);
  const publicJson = JSON.stringify(modified);
  for (const secret of ['DO_NOT_SHARE_PRIVATE_RECORDING_TITLE','SENSITIVE_PRIVATE_DRIVE_IDENTIFIER',
    'PRIVATE_ATTENDEE_LOG','PRIVATE_GOOGLE_DRIVE_RECORDING_METADATA','artifactCreatedAt','scheduledStart','realReference'])
    assert.equal(publicJson.includes(secret),false,secret);
});
test('payload tampering breaks complete candidate and envelope checks',() => {
  const preview = make();
  assert.equal(verifySyntheticResearchReviewPreview({...preview,digest:'0'.repeat(64)},fixture),false);
  const altered = structuredClone(preview);
  altered.cases[0].baseline.inferences[0].proposition = 'CLAIMED_OBSERVED_EXECUTION';
  assert.equal(verifySyntheticResearchReviewPreview(altered,fixture),false);
});
test('the preview cannot be relabeled as published or certified even if the caller recomputes fields',() => {
  const preview = make();
  const mutated = structuredClone(preview);
  mutated.boundaries.scientificCertification = 'CERTIFIED';
  assert.equal(verifySyntheticResearchReviewPreview(mutated,fixture),false);
  mutated.digest = preview.digest;
  assert.equal(verifySyntheticResearchReviewPreview(mutated,fixture),false);
});
test('synthetic boundary failure stops packet creation',() => {
  const bad = structuredClone(fixture);
  bad.boundaries.publishAsObserved = true;
  assert.throws(()=>buildSyntheticResearchReviewPreview(bad),/FORBIDDEN_SAFETY_CAPABILITY/);
});
