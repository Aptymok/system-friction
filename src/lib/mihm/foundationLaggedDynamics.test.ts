import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  MIHM_P2_DECLARED_PAIRS, assessMihmFoundationLaggedDynamics,
} from './foundationLaggedDynamics';
import type {MihmManhattanP1Archive} from './foundationSourceMetrology';

const archive=JSON.parse(readFileSync(
  'docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json','utf8',
)) as MihmManhattanP1Archive;
const clone=()=>structuredClone(archive);
const run=(x:MihmManhattanP1Archive=clone())=>assessMihmFoundationLaggedDynamics(x);

test('P2 runs fixed lag2, own-history, feature-matched placebo and transparent weekly naive on P1-approved archived data',()=>{
  const r=run();
  assert.equal(r.status,'RETROSPECTIVE_DIAGNOSTIC__VINTAGE_BLOCKED',r.reasons.join(';'));
  assert.deepEqual(r.pairs.map(x=>x.target),['service311','fdnyCount','cbdEntries','crzEntries']);
  assert.equal(r.pairs.length,4);
  for(const p of r.pairs){
    assert.deepEqual(p.samples,{train:189,validation:61,historicalAudit:92});
    assert.equal(p.placeboIsFeatureMatched,true);
    assert.equal(p.independentCrossSystemEffectEstablished,false);
    assert.equal(p.causalPropagationEstablished,false);
    assert.equal(p.realWorldForecastEligible,false);
    assert.deepEqual(Object.keys(p.models),
      ['WEEKLY_NAIVE','OWN_LAG','CROSS_LAG2','AGE_SHIFT_PLACEBO']);
    assert.equal(p.models.WEEKLY_NAIVE.trained,null);
    assert.equal(p.models.OWN_LAG.trained?.coefficients.length,1);
    assert.equal(p.models.CROSS_LAG2.trained?.coefficients.length,2);
    assert.equal(p.models.AGE_SHIFT_PLACEBO.trained?.coefficients.length,2);
    for(const model of Object.values(p.models)){
      assert.equal(model.validation.days,61);
      assert.equal(model.historicalAudit.days,92);
      for(const window of [model.validation,model.historicalAudit]){
        assert(Number.isFinite(window.mae)&&window.mae>=0);
        assert(Number.isFinite(window.rmse)&&window.rmse>=0);
        assert(Number.isFinite(window.bias));
      }
    }
  }
  assert.equal(r.fixedMethod.ridgeAlpha,25);
  assert.equal(r.fixedMethod.placeboLagDays,16);
  assert.equal(r.chronology.featureMinimumLagDays,2);
  assert.equal(r.fixedMethod.calibrationWasChosenAfterExposureToArchive,true);
  assert.equal(r.chronology.datedResponseVintagesVerified,false);
  assert.equal(r.canonicalPhiCalculated,false);
  assert.equal(r.homeostasisEstablished,false);
  assert.equal(r.independentProspectiveValidation,false);
  assert.equal(r.externalReturnRecorded,false);
  assert.equal(r.productionPromotionAllowed,false);
});
test('P2 refuses to promote nested CBD / CRZ measurements as an independent cross-system mechanism',()=>{
  const nested=run().pairs.find(x=>x.target==='crzEntries');
  assert(nested);
  assert.equal(nested.driver,'cbdEntries');
  assert.equal(nested.declaredRelation,'STRUCTURAL_NESTING_NEGATIVE_CONTROL');
  assert.equal(nested.independentCrossSystemEffectEstablished,false);
  assert.equal(nested.realWorldForecastEligible,false);
  assert.equal(MIHM_P2_DECLARED_PAIRS.length,4);
});
test('P2 holds the fitted model exactly invariant to changes in post-training outcomes',()=>{
  const baseline=run();
  const changed=clone();
  for(const row of changed.rows){
    if(row.day>'2026-04-30'){
      row.service311+=100;
      row.fdnyCount+=20;
      row.cbdEntries+=1000;
      row.crzEntries+=800;
    }
  }
  const rerun=run(changed);
  assert.equal(rerun.status,'RETROSPECTIVE_DIAGNOSTIC__VINTAGE_BLOCKED');
  for(let i=0;i<baseline.pairs.length;i++){
    for(const key of ['OWN_LAG','CROSS_LAG2','AGE_SHIFT_PLACEBO'] as const){
      assert.deepEqual(baseline.pairs[i].models[key].trained,rerun.pairs[i].models[key].trained);
    }
  }
  assert.notEqual(baseline.pairs[0].models.OWN_LAG.validation.mae,
    rerun.pairs[0].models.OWN_LAG.validation.mae);
});
test('P2 fails closed on missing values, duplicate dates and source releases falsely labelled verified',()=>{
  for(const modify of [
    (a:MihmManhattanP1Archive)=>{a.rows[3].service311=null as unknown as number},
    (a:MihmManhattanP1Archive)=>{a.rows[4].day=a.rows[3].day},
    (a:MihmManhattanP1Archive)=>{a.dataAsOfOriginalDates='VERIFIED'},
    (a:MihmManhattanP1Archive)=>{a.sourceAreaUnits.cbdEntries='Manhattan borough'},
    (a:MihmManhattanP1Archive)=>{a.rows[50].crzEntries=a.rows[50].cbdEntries+1},
    (a:MihmManhattanP1Archive)=>{a.sourceReads[0].sourceResponseSha256='fake'}
  ]){
    const modified=clone();modify(modified);
    const outcome=run(modified);
    assert.equal(outcome.status,'ABSTAINED_P1_INVALID');
    assert.equal(outcome.pairs.length,0);
    assert.equal(outcome.productionPromotionAllowed,false);
  }
});
test('P2 parameters are deterministic and source vintages are never silently certified',()=>{
  const a=run(),b=run();
  assert.deepEqual(a,b);
  assert(a.reasons.includes('ALL_SOURCE_VINTAGES_AT_HISTORICAL_T0_UNVERIFIED'));
  assert(a.reasons.includes('FDNY_ANNUAL_PUBLICATION_BLOCKS_DAY_AHEAD_AS_OF_CLAIMS'));
  assert(a.reasons.includes('PREVIOUS_G2B_AND_JULY_SEPTEMBER_HISTORIC_OUTCOMES_ALREADY_INSPECTED'));
});
