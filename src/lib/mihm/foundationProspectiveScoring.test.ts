import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateMihmP4ExistingRegistry,MIHM_P4_CONTRACT} from './foundationProspectiveScoring';
import type {SfiPredictionEntry,SfiPredictionVerification} from '../sfi/predictions/types';

/** Arithmetic fixtures are TEST ONLY and never persisted as observations. */
const a='a'.repeat(64),b='b'.repeat(64);
const issued='2026-10-30T12:00:00.000Z',target='2026-11-01T12:00:00.000Z';
const packet=(change:Record<string,unknown>={})=>({
 contract:MIHM_P4_CONTRACT,targetKey:'daily_requests',unit:'requests/day',
 targetAt:target,scope:'Manhattan borough',methodVersion:'P4-lab-0.1',metric:'MAE',
 snapshots:[{sourceRef:'official-311',sha256:a,observedAt:'2026-10-29T12:00:00.000Z',
    availableAt:'2026-10-30T10:00:00.000Z',capturedAt:'2026-10-30T11:00:00.000Z'}],
 baseline:{modelId:'m0',version:'1',value:100,lower90:70,upper90:130,inputSourceRefs:['official-311']},
 mihm:{modelId:'m1',version:'1',value:110,lower90:90,upper90:120,inputSourceRefs:['official-311']},
 ...change,
});
const prediction=(p=packet(),overrides:Record<string,unknown>={})=>({
 id:'test-entry',case_id:'case-test',hypothesis_id:'hypothesis-test',
 prediccion_explicita:JSON.stringify(p),
 prediction_registered_at:issued,created_at:issued,
 is_predictive_evidence:true,estado_observacion:'registrada_pre_perturbacion',
 ...overrides,
}) as unknown as SfiPredictionEntry;
const verification=(out:Record<string,unknown>={},more:Record<string,unknown>={})=>({
 id:'v-test',prediction_entry_id:'test-entry',hypothesis_id:'hypothesis-test',
 verification_state:'CLOSED',evaluation_result:'TRUE',verified_by:'human-reviewer',return_window:'72h',
 source_quality_tier:1,ground_truth_source_type:'official-source',
 source_snapshot_hash:b,source_checked_at:'2026-11-02T15:00:00.000Z',
 created_at:'2026-10-30T12:01:00.000Z',
 verification_rule:{observable:'daily_requests',entity:'Manhattan borough',source_query:'recorded provider series',window:'72h'},
 source_value:{value:107,unit:'requests/day',observedAt:target,availableAt:'2026-11-02T11:00:00.000Z',
    capturedAt:'2026-11-02T12:00:00.000Z',sha256:b,sourceRef:'official-311',...out},
 ...more,
}) as unknown as SfiPredictionVerification;
const score=(p=prediction(),vs=[verification()])=>evaluateMihmP4ExistingRegistry([p],vs);
test('P4 does not manufacture evidence from P3 archived retrospective observations',()=>{
 const receipt=JSON.parse(readFileSync(
  'docs/research/evidence/MIHM-FOUNDATION-P3-VIABILITY-RECOVERY-2026-10-30.json','utf8'));
 assert.equal(receipt.institutionalReturnVerified,false);
 assert.equal(receipt.originalDataAtEventTimeAvailabilityIndependentlyVerified,false);
 const result=evaluateMihmP4ExistingRegistry([],[]);
 assert.equal(result.status,'NO_PROSPECTIVE_PAIRS');
 assert.equal(result.registered,0);assert.equal(result.scored,0);
 assert.equal(result.baselineMAE,null);
 assert.equal(result.historicalP3ReclassifiedAsProspective,false);
 assert.equal(result.independentScientificValidationEstablished,false);
 assert.equal(result.homeostasisEstablished,false);
 assert.equal(result.institutionalReturnIssued,false);
});
test('P4 arithmetic only: a synthetic unit-test pair is scored but NOT scientifically validated',()=>{
 const result=score();
 assert.equal(result.status,'INSUFFICIENT_VERIFIED_PAIRS');
 assert.equal(result.scored,1);
 assert.equal(result.baselineMAE,7);
 assert.equal(result.mihmMAE,3);
 assert.equal(result.maeGain,4);
 assert.equal(result.baselineCoverage90,1);
 assert.equal(result.mihmCoverage90,1);
 assert.equal(result.productionPromotionAllowed,false);
 assert.equal(result.independentScientificValidationEstablished,false);
});
test('P4 rejects historical sources not published or captured by genuine T0',()=>{
 for(const bad of [
  {snapshots:[{...packet().snapshots[0],availableAt:'2026-10-31T12:00:00.000Z'}]},
  {snapshots:[{...packet().snapshots[0],capturedAt:'2026-10-30T14:00:00.000Z'}]},
  {snapshots:[{...packet().snapshots[0],sha256:'not-a-sha'}]},
  {targetAt:issued},
 ]) {
  const result=score(prediction(packet(bad)));
  assert.equal(result.scored,0);assert.equal(result.evidence[0].status,'BLOCKED');
 }
});
test('P4 rejects unequal model source budgets and unregistered narrative',()=>{
 let p=packet();
 p.mihm.inputSourceRefs=['different-source'];
 assert.equal(score(prediction(p)).blocked,1);
 assert.equal(score(prediction(packet(),{is_predictive_evidence:false})).blocked,1);
 assert.equal(score(prediction(packet(),{prediccion_explicita:'Great things will happen'})).blocked,1);
});
test('P4 does not transform missing, contradictory, disputed or unclosed outcomes into numeric zero',()=>{
 for(const v of [
  verification({value:null}),
  verification({value:'107'}),
  verification({availableAt:'2026-10-29T12:00:00.000Z'}),
  verification({sha256:a}),
  verification({}, {verified_by:null}),
  verification({}, {verification_state:'DISPUTED'}),
  verification({}, {source_snapshot_hash:null}),
 ]) {
  const result=score(prediction(),[v]);
  assert.equal(result.scored,0);
  assert.equal(result.blocked,1);
  assert.equal(result.baselineMAE,null);
 }
 const pending=score(prediction(),[]);
 assert.equal(pending.pending,1);assert.equal(pending.scored,0);
});
test('P4 keeps contradictory verification duplicates blocked, and no empty registry becomes calibrated',()=>{
 const duplicated=score(prediction(),[verification(),verification({}, {id:'different',source_value:{
   value:106,unit:'requests/day',observedAt:target,availableAt:'2026-11-02T11:00:00.000Z',
   capturedAt:'2026-11-02T12:00:00.000Z',sha256:b,sourceRef:'official-311',
 }})]);
 assert.equal(duplicated.blocked,1);assert.equal(duplicated.scored,0);
 assert.equal(score().independentScientificValidationEstablished,false);
});

test('P4 never combines different metrics, units or territories into one MAE',()=>{
 const a=prediction(),b=prediction(packet({targetKey:'different_measure'}),{
   id:'entry-second',
 });
 const v1=verification(),v2=verification({},{
   id:'verification-second',prediction_entry_id:'entry-second',
   verification_rule:{observable:'different_measure',entity:'Manhattan borough',
     source_query:'recorded provider series',window:'72h'}
 });
 const out=evaluateMihmP4ExistingRegistry([a,b],[v1,v2]);
 assert.equal(out.status,'INCOMMENSURABLE_COHORT');
 assert.equal(out.scored,2);
 assert.equal(out.maeGain,null);
 assert.equal(out.baselineMAE,null);
});
test('P4 does not double count independent predictions of same target date and area',()=>{
 const a=prediction(),b=prediction(packet(),{id:'entry-two'});
 const ver=[verification(),verification({}, {id:'v2',prediction_entry_id:'entry-two'})];
 const out=evaluateMihmP4ExistingRegistry([a,b],ver);
 assert.equal(out.scored,0);assert.equal(out.blocked,2);
 assert(out.evidence.every(x=>x.blockers.includes('DUPLICATED_TARGET_DATE')));
});
test('P4 verification rule must be in the declared return window and registered before outcome',()=>{
 const wrongWindow=score(prediction(),[verification({},{
   verification_rule:{observable:'daily_requests',entity:'Manhattan borough',
     source_query:'recorded provider series',window:'7d'}
 })]);
 assert.equal(wrongWindow.scored,0);
 const lateRule=score(prediction(),[verification({},{
   created_at:'2026-11-02T12:00:00.000Z',
 })]);
 assert.equal(lateRule.scored,0);
});
