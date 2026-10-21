import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePossibility, type PossibilityInput } from './hypothesisConditionalExplore';
import type { HypothesisConditionalBranch } from './hypothesisConditionalBranches';

const branch: HypothesisConditionalBranch = {
  id:'hyp-1:SUPPORT_IF:C1', relation:'SUPPORT_IF', criterionId:'C1',
  signal:'systemicFriction', metric:null, operator:'GT', threshold:0.7, unit:null,
  required:true, minimumObservations:5, sourceFamilies:[],
  epistemicClass:'CONDITIONAL_NOT_OBSERVED',
  contextRule:'Frozen original validation window only.',
  verificationState:'NOT_EVALUATED_HERE',
};
const sample: PossibilityInput = {
  value:'0.75', presence:'UNKNOWN', observations:'5', evidence:'10', sourceFamilies:'1',
};

test('the original frozen branch is never mutated', () => {
  const before = JSON.stringify(branch);
  evaluatePossibility(branch,10,1,sample);
  assert.equal(JSON.stringify(branch),before);
});
test('an empty hypothetical value is unknown rather than zero', () => {
  assert.equal(evaluatePossibility(branch,10,1,{...sample,value:''}).state,'VALUE_UNSPECIFIED');
  assert.equal(evaluatePossibility(branch,10,1,{...sample,value:'Infinity'}).state,'VALUE_UNSPECIFIED');
});
test('a counterexample changes only the criterion, not the canonical outcome', () => {
  const result=evaluatePossibility(branch,10,1,{...sample,value:'0.6'});
  assert.equal(result.state,'CRITERION_NOT_MET');
  assert.equal(result.matchesCriterion,false);
});
test('a matching signal with inadequate evidence remains insufficient', () => {
  const result=evaluatePossibility(branch,10,1,{...sample,evidence:'0'});
  assert.equal(result.state,'SAMPLING_INSUFFICIENT');
  assert.ok(result.missing.some(x=>x.includes('Evidencia')));
});
test('qualified hypothetical numbers never get labeled observed', () => {
  const result=evaluatePossibility(branch,10,1,sample);
  assert.equal(result.state,'CONDITION_POSSIBLE_IN_SCENARIO');
  assert.match(result.boundary,/No verifica/);
});
test('declared source families require provenance verification even with sufficient counts', () => {
  const result=evaluatePossibility({...branch,sourceFamilies:['technology_discourse']},10,1,sample);
  assert.equal(result.state,'SAMPLING_INSUFFICIENT');
  assert.ok(result.missing.some(x=>x.includes('technology_discourse')));
});
test('presence and absence criteria are evaluated without synthetic numeric measurement', () => {
  const presence={...branch,operator:'PRESENCE' as const,threshold:null};
  assert.equal(evaluatePossibility(presence,10,1,{...sample,value:'',presence:'PRESENT'}).state,'CONDITION_POSSIBLE_IN_SCENARIO');
  assert.equal(evaluatePossibility(presence,10,1,{...sample,presence:'ABSENT'}).state,'CRITERION_NOT_MET');
});
test('a fractional observation count cannot meet the observation minimum', () => {
  assert.equal(evaluatePossibility(branch,10,1,{...sample,observations:'5.5'}).state,'SAMPLING_INSUFFICIENT');
});
