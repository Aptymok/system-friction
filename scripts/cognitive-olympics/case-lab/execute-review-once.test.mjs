import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { executeSyntheticReviewOnce, verifySyntheticReviewReceipt } from './execute-review-once.mjs';
const fixture = JSON.parse(readFileSync(new URL('./aiweeknyc.case.json', import.meta.url), 'utf8'));
const context = { executedAt:'2026-10-22T20:00:00Z',
  sourceCommit:'a'.repeat(40), ciRunId:'39896118446', ciAttempt:'1' };
const make = () => executeSyntheticReviewOnce(fixture,context);

test('an actual bounded heuristic invocation generates two verified reproducible passes', () => {
  const first = make(), second = make();
  assert.deepEqual(first,second);
  assert.equal(first.executed,true);
  assert.equal(first.executionLane,'GITHUB_ACTIONS_SYNTHETIC_ONLY');
  assert.equal(first.reproduction.repeatCount,2);
  assert.equal(first.reproduction.samePreviewDigest,true);
  assert.equal(first.reproduction.candidateDigests.length,2);
  assert.equal(first.payload.cases.length,2);
  assert.equal(verifySyntheticReviewReceipt(first,fixture),true);
});
test('does not claim an SFI registered cognitive executor or scientific certification', () => {
  const r = make();
  assert.equal(r.registeredSfiAgentExecuted,false);
  assert.equal(r.cognitiveCapabilityGrantChecked,false);
  assert.equal(r.reviewAndAuthority.p4AutonomousCognitiveCycle,'NOT_DEMONSTRATED');
  assert.equal(r.reviewAndAuthority.independentHumanReview,'NOT_OBTAINED');
  assert.equal(r.reviewAndAuthority.p3ScientificCertification,'NOT_CERTIFIED');
  assert.equal(r.reviewAndAuthority.p5PublicResearchRelease,'FORBIDDEN');
  assert.equal(r.reviewAndAuthority.externalReturn,'NOT_OBSERVED');
  assert.equal(r.persistence,'GITHUB_CI_ARTIFACT_ONLY_NO_DB_WRITES');
});
test('entire exported CI receipt excludes realReference fields and private event artifact metadata', () => {
  const r = make();
  const output=JSON.stringify(r);
  for(const value of [fixture.realReference.title,fixture.realReference.artifact,
      fixture.realReference.artifactCreatedAt,fixture.realReference.discrepancy,
      'realReference','PRIVATE_GOOGLE_DRIVE_RECORDING_METADATA'])
    assert.ok(!output.includes(value), 'private field leaked');
});
test('historical private metadata changes do not alter deterministic output', () => {
  const c=structuredClone(fixture);
  c.realReference.title='PRIVATE_SUBJECT';
  c.realReference.artifact='DO_NOT_EXPORT';
  assert.deepEqual(executeSyntheticReviewOnce(c,context),make());
});
test('receipt tampering and relabelled authority fail integrity, even with unrelated timestamp drift', () => {
  const r=make();
  const altered=structuredClone(r);
  altered.registeredSfiAgentExecuted=true;
  assert.equal(verifySyntheticReviewReceipt(altered,fixture),false);
  const changedTime=structuredClone(r);
  changedTime.executedAt='2026-10-23T20:00:00Z';
  assert.equal(verifySyntheticReviewReceipt(changedTime,fixture),false);
  const unauthorized=structuredClone(r);
  unauthorized.reviewAndAuthority.p3ScientificCertification='CERTIFIED';
  assert.equal(verifySyntheticReviewReceipt(unauthorized,fixture),false);
});
test('a malformed source commit is not falsely described as anchored in CI',()=>{
  const r=executeSyntheticReviewOnce(fixture,{...context,sourceCommit:'not-a-git-sha'});
  assert.equal(r.executionLane,'LOCAL_SYNTHETIC_UNANCHORED');
  assert.equal(r.sourceCommit,null);
  assert.equal(verifySyntheticReviewReceipt(r,fixture),true);
});
test('unsafe synthetic material remains rejected before a receipt is produced',()=>{
  const altered=structuredClone(fixture);
  altered.boundaries.realityChainAdmission=true;
  assert.throws(()=>executeSyntheticReviewOnce(altered,context),/FORBIDDEN_SAFETY_CAPABILITY/);
});
