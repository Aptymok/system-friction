import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertFixture, buildLabInput, buildBaselineCandidate, validateCandidate, executeLocalCase } from './run.mjs';

const f = JSON.parse(readFileSync(new URL('./aiweeknyc.case.json',import.meta.url),'utf8'));

test('fixture explicitly quarantines all invented anchors from evidence/authority/return/reality chain',()=>{
  assert.equal(assertFixture(f), f);
  assert.equal(f.boundaries.realityChainAdmission,false);
  assert.equal(f.boundaries.worldReturnMinting,false);
  assert.equal(f.boundaries.executionAllowed,false);
  for (const anchor of Object.values(f.anchors)) assert.equal(anchor.class,'SIMULATED');
});
test('backcast exposes fictional initial + authority + fictional RETURN only',()=>{
  const input=buildLabInput(f,'backcast');
  assert.deepEqual(Object.keys(input.anchors),['initial','authority','return']);
  assert.equal(JSON.stringify(input).includes(f.realReference.artifact),false);
  const run=executeLocalCase(f,'backcast');
  assert.equal(run.realityChainEligible,false);
  assert.equal(run.executionPerformed,false);
  assert.equal(run.candidate.inferences.length,2);
  assert.equal(run.candidate.executionCandidates[0].executionState,'NOT_EXECUTED');
});
test('hindsight forecast cannot see terminal RETURN or real-world observation',()=>{
  const input=buildLabInput(f,'forecast');
  assert.deepEqual(Object.keys(input.anchors),['initial','authority']);
  assert.equal(JSON.stringify(input).includes('LAB-SYN-RETURN-001'),false);
  assert.equal(JSON.stringify(input).includes(f.realReference.artifact),false);
  const run=executeLocalCase(f,'forecast');
  assert.equal(run.timelineAuthenticity,'RETROSPECTIVE_REPLAY_NOT_PROSPECTIVE');
  assert.equal(run.scientificValidation,'NOT_ESTABLISHED');
  assert.equal(run.terminalObservation.status,'WITHHELD');
});
test('reveal only exposes external artifact metadata, not verified event occurrence',()=>{
  const run=executeLocalCase(f,'forecast',{reveal:true});
  assert.equal(run.terminalObservation.status,'EXTERNAL_METADATA_ONLY');
  assert.equal(run.terminalObservation.realEventOccurred,'UNVERIFIED_FROM_METADATA_ALONE');
  assert.equal(run.terminalObservation.observationEligible,false);
  assert.equal(Date.parse(f.realReference.artifactCreatedAt)<Date.parse(f.realReference.scheduledStart),true);
});
test('reject fabricated evidence, canon, real execution, after-cutoff reference and OBSERVED labels',()=>{
  const input=buildLabInput(f,'forecast');
  const candidate=buildBaselineCandidate(input);
  assert.equal(validateCandidate(candidate,input),candidate);
  assert.throws(()=>validateCandidate({...candidate,evidenceRefs:['fake']},input),/FORBIDDEN_EVIDENCE/);
  assert.throws(()=>validateCandidate({...candidate,inferences:[{...candidate.inferences[0],epistemicClass:'OBSERVED'}]},input),/HYPOTHETICAL/);
  assert.throws(()=>validateCandidate({...candidate,inferences:[{...candidate.inferences[0],basisRefs:['LAB-SYN-RETURN-001']}]},input),/UNKNOWN_OR_FUTURE/);
  assert.throws(()=>validateCandidate({...candidate,executionCandidates:[{id:'bad',epistemicClass:'SIMULATED',executionState:'EXECUTED',proposedAction:'false',basisRefs:[]}]},input),/EXECUTION_CLAIM_NOT_ALLOWED/);
});
test('fails closed if a synthetic anchor is relabeled observed or an execution authority is enabled',()=>{
  const changed=structuredClone(f);
  changed.anchors.initial.class='OBSERVED';
  assert.throws(()=>assertFixture(changed),/UNSAFE_ANCHOR/);
  const changed2=structuredClone(f);
  changed2.boundaries.realityChainAdmission=true;
  assert.throws(()=>assertFixture(changed2),/FORBIDDEN_SAFETY_CAPABILITY/);
});
