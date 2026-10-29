/**
 * SFI MIHM Foundation — 311 observation-channel sensitivity.
 *
 * Retrospective, diagnostic recalibration AFTER examining category outcomes.
 * Preserves observations, does not recollect/relabel incident rows, and
 * does not claim external prospective or causal validation.
 *
 * --self-test deterministic independent synthetic algebra guard;
 * --analyze reads already-archived corrected official 311 category receipts.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const INPUT='docs/research/evidence/MIHM-311-JAN-FEB-COMPOSITION-CORRECTED-2026.json';
const BYDAY=[
  {name:'JAN',onset:'JAN_SNOW',next:'JAN_FOLLOWING'},
  {name:'FEB',onset:'FEB_BLIZZARD',next:'FEB_FOLLOWING'}
];
const near=(a,b)=>Math.abs(a-b)<0.000001;
const pct=(a,b)=>Math.round(a/b*1000)/10;
function removeGroup(totalCurrent,totalBaseline,group){
  return {current:totalCurrent-group.current,
    baseline:totalBaseline-group.priorMean,
    difference:totalCurrent-totalBaseline-group.delta};
}
function analyze(receipt){
  assert.equal(receipt.contract,'MIHM-311-COMPLAINT-COMPOSITION-CORRECTED-2026-10-25-v2');
  assert(receipt.sourceDailyTotalsReconciledExactly,'Original category sum must match official 311 aggregate');
  assert(receipt.eventsSelectedBeforeInspectingAnnualOutcomes===false,'Do not misrepresent selection');
  assert(Array.isArray(receipt.results)&&receipt.results.length===4);
  const byId=Object.fromEntries(receipt.results.map(x=>[x.id,x]));
  const episodes=[];
  for(const spec of BYDAY){
    const onset=byId[spec.onset],next=byId[spec.next];
    assert(onset&&next,'Both event and following day needed');
    const rows=[onset,next].map(r=>{
      assert(Number.isFinite(r.observedTotal)&&Number.isFinite(r.priorMean));
      const groups=Object.values(r.coarseGroupContributions);
      assert(near(groups.reduce((s,g)=>s+g.current,0),r.observedTotal),'All observed categories accounted for');
      assert(near(groups.reduce((s,g)=>s+g.priorMean,0),r.priorMean),'All baseline categories accounted for');
      assert(near(groups.reduce((s,g)=>s+g.delta,0),r.observedTotal-r.priorMean),'All changes accounted for');
      const heat=r.coarseGroupContributions.HEAT_OR_HOT_WATER;
      assert(heat,'Heat channel absent');
      const nonHeat=removeGroup(r.observedTotal,r.priorMean,heat);
      assert(nonHeat.current>=0&&nonHeat.baseline>0);
      const snow=r.topPositiveDeltaCategories.find(x=>x.category==='Snow or Ice');
      assert(snow&&snow.current>=0&&snow.baselineMean>=0,'Snow or Ice category missing from inspected event');
      const withoutHeatAndSnow={
        current:nonHeat.current-snow.current,
        baseline:nonHeat.baseline-snow.baselineMean,
        difference:nonHeat.difference-snow.difference
      };
      assert(withoutHeatAndSnow.baseline>0&&withoutHeatAndSnow.current>=0);
      const all=r.observedTotal-r.priorMean;
      assert(near(all,heat.delta+nonHeat.difference),'exact additive 311 reconciliation');
      assert(near(nonHeat.difference,snow.difference+withoutHeatAndSnow.difference),'exact snow reporting reconciliation');
      return {date:r.date,official311Requests:r.observedTotal,
        comparatorMeanFromTwoEarlierSameWeekdays:r.priorMean,
        totalChange:all,totalChangePct:pct(all,r.priorMean),
        heatingAndHotWater:{
          value:heat.current,baselineMean:heat.priorMean,change:heat.delta},
        excludingHeatAndHotWater:{
          value:nonHeat.current,baselineMean:nonHeat.baseline,
          change:nonHeat.difference,changePct:pct(nonHeat.difference,nonHeat.baseline)},
        snowOrIce:{value:snow.current,baselineMean:snow.baselineMean,
          change:snow.difference},
        excludingHeatAndSnowOrIce:{
          value:withoutHeatAndSnow.current,baselineMean:withoutHeatAndSnow.baseline,
          change:withoutHeatAndSnow.difference,
          changePct:pct(withoutHeatAndSnow.difference,withoutHeatAndSnow.baseline)}
      };
    });
    episodes.push({name:spec.name,firstDay:rows[0],followingDay:rows[1],
      firstDayWithoutHeatingNegative:rows[0].excludingHeatAndHotWater.change<0,
      nextDaySnowReportsIncrease:rows[1].snowOrIce.change>0,
      nextDayWithoutHeatingAndSnowNegative:
        rows[1].excludingHeatAndSnowOrIce.change<0});
  }
  const bothEventNegative=episodes.every(x=>x.firstDayWithoutHeatingNegative);
  const bothSnowIncrease=episodes.every(x=>x.nextDaySnowReportsIncrease);
  const bothOtherNegative=episodes.every(x=>x.nextDayWithoutHeatingAndSnowNegative);
  const totalOpposite=(episodes[0].firstDay.totalChange>0&&
    episodes[1].firstDay.totalChange<0);
  return {
    contract:'MIHM-311-CHANNEL-SENSITIVITY-DIAGNOSTIC-2026-0.1',
    status:'RETROSPECTIVE_POST_INSPECTION_HYPOTHESIS_REFINEMENT',
    source:INPUT,fullCategoriesAccountedFor:true,
    baseline:'mean of two preceding same weekdays, not randomized/weather matched',
    observations:episodes,
    hypothesisChecks:{
      total311StormDaySignsContradict:totalOpposite,
      bothStormDaysNonHeatingReportsDecline:bothEventNegative,
      snowOrIceReportsIncreaseFollowingDayInBoth:bothSnowIncrease,
      removingHeatingAndSnowLeavesNegativeOtherCategoryDeltaOnFollowingDays:bothOtherNegative
    },
    inference:{
      revisedCandidate:'Observation channels of 311 are category-heterogeneous; apparent citywide opposite signs can arise from changing composition and temporal reporting.',
      allCategoriesSumExactly:true,
      dataChosenBeforeHypothesis:false,
      sourceAsOfHistoricalT0Verified:false,
      counterfactualWeatherAndPolicyMatched:false,
      canonicalMihmValidated:false,
      causalReportingDelayProven:false,
      futureIndependentTestNeeded:true,
      noDeploymentOrSfiAuthorityChange:true
    }
  };
}
function selfTest(){
  // Independent algebra check: a dominant category can flip the sign.
  const heat={current:125,priorMean:20,delta:105};
  const x=removeGroup(170,100,heat);
  assert.deepEqual(x,{current:45,baseline:80,difference:-35});
  assert.equal(pct(-35,80),-43.7);
  const original=JSON.parse(readFileSync(INPUT,'utf8'));
  const out=analyze(original);
  assert.equal(out.observations.length,2);
  assert.equal(out.hypothesisChecks.total311StormDaySignsContradict,true);
  assert.equal(out.hypothesisChecks.bothStormDaysNonHeatingReportsDecline,true);
  assert.equal(out.hypothesisChecks.snowOrIceReportsIncreaseFollowingDayInBoth,true);
  assert.equal(out.hypothesisChecks.removingHeatingAndSnowLeavesNegativeOtherCategoryDeltaOnFollowingDays,true);
  const changed=structuredClone(original);
  changed.results[0].coarseGroupContributions.OTHER.delta+=1;
  assert.throws(()=>analyze(changed),/All changes accounted for/);
  const missing=structuredClone(original);
  missing.results[2].topPositiveDeltaCategories=[];
  assert.throws(()=>analyze(missing),/Snow or Ice category missing/);
  const archived=JSON.parse(readFileSync(
    'docs/research/evidence/MIHM-311-CHANNEL-SENSITIVITY-2026-10-25.json','utf8'));
  assert.equal(archived.contract,out.contract);
  assert.equal(archived.findings.prospectiveMIHMAdvantageEstablished,false);
  for(let i=0;i<2;i++){
    const live=out.observations[i],fixture=archived.episodes[i];
    assert.equal(live.firstDay.date,fixture.event.date);
    assert.equal(live.firstDay.totalChange,fixture.event.total.delta);
    assert.equal(live.firstDay.excludingHeatAndHotWater.change,fixture.event.nonHeat.delta);
    assert.equal(live.followingDay.snowOrIce.change,fixture.following.snowIce.delta);
    assert.equal(live.followingDay.excludingHeatAndSnowOrIce.change,
      fixture.following.otherExcludingHeatAndSnow.delta);
  }
  console.log(JSON.stringify({
    status:'OBSERVED_311_CHANNEL_SENSITIVITY_QA_PASS',
    realArchivedSourceUsed:true,provenanceIndependence:false,
    episodeCount:2,causalCohortValidated:false}));
}
if(process.argv.includes('--self-test'))selfTest();
else if(process.argv.includes('--analyze')){
  const bytes=readFileSync(INPUT);
  assert(bytes.length<100000,'fixed small aggregated data research input');
  console.log(JSON.stringify({inputSHA256:createHash('sha256').update(bytes).digest('hex'),
    ...analyze(JSON.parse(bytes.toString('utf8')))},null,2));
}else throw Error('--self-test or --analyze only; no provider queries');
