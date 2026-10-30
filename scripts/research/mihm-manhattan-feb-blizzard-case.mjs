/**
 * SFI MIHM Foundation: observed 2026-02-23 NYC blizzard policy/urban response.
 * A genuine externally attested event, not a validated MIHM mechanism.
 * Ex post case identification: selected AFTER inspecting the 365-day dataset.
 *
 * node scripts/research/mihm-manhattan-feb-blizzard-case.mjs --self-test
 * node scripts/research/mihm-manhattan-feb-blizzard-case.mjs --evaluate
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const FIXTURE='docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json';
const KEY=['cbdEntries','crzEntries','service311','fdnyCount'];
const BASE_START='2026-01-01',BASE_END='2026-02-21';
const PERIOD_START='2026-02-20',PERIOD_END='2026-03-03';
const DAY='2026-02-23';
const wd=date=>new Date(date+'T12:00:00Z').getUTCDay();
const median=arr=>{const a=arr.slice().sort((x,y)=>x-y);return a[Math.floor(a.length/2)]};
const round=n=>Math.round(n*10)/10;
const external=[
  {date:'2026-02-21',time:'',kind:'PUBLIC_FORECAST_AND_TRAVEL_ADVISORY',
    authority:'NYC Emergency Management',url:'https://www.nyc.gov/site/em/about/press-releases/20262102_pr_nycem-issues-hazardous-travel-advisory.page',
    epistemic:'OFFICIAL_DATED_PUBLIC_SOURCE'},
  {date:'2026-02-22',time:'21:00 America/New_York',kind:'TRAVEL_BAN_BEGINS',
    authority:'NYC Emergency Executive Order No. 3',
    url:'https://www.nyc.gov/mayors-office/news/2026/02/emergency-executive-order-no--3',
    epistemic:'OFFICIAL_ORDER_NOT_EXPERIMENTAL_TREATMENT_RANDOMIZATION'},
  {date:'2026-02-23',time:'12:00 America/New_York',kind:'TRAVEL_BAN_ENDS',
    authority:'NYC Mayor',url:'https://www.nyc.gov/mayors-office/news/2026/02/mayor-mamdani-announces-lift-of-travel-ban--nyc-public-schools-t',
    epistemic:'OFFICIAL_DATED_PUBLIC_SOURCE'},
  {date:'2026-02-24',time:'00:00 America/New_York',kind:'DECLARED_EMERGENCY_TERMINATION',
    authority:'NYC Emergency Executive Order No. 3.1',
    url:'https://www.nyc.gov/mayors-office/news/2026/02/emergency-executive-order-no--3-1',
    epistemic:'OFFICIAL_ORDER'}
];
function assess(fixture){
  assert.equal(fixture.contract,'MIHM-MANHATTAN-365D-RETROSPECTIVE-EVIDENCE-0.1');
  const all=fixture.rows;
  assert(all.length===365);
  for(const row of all){
    assert(/^\d{4}-\d{2}-\d{2}$/.test(row.day),'INVALID_DATE');
    for(const k of KEY)assert(Number.isSafeInteger(row[k])&&row[k]>0,'INVALID_EVENT_SOURCE_VALUE '+k);
  }
  const base=all.filter(r=>r.day>=BASE_START&&r.day<=BASE_END);
  assert(base.length===52,'52-day baseline window');
  const byDay=new Map(all.map(r=>[r.day,r]));
  const prior={};
  for(let w=0;w<7;w++){
    const matches=base.filter(r=>wd(r.day)===w);
    assert(matches.length>=7,'At least 7 historical weekday comparators');
    prior[w]=Object.fromEntries(KEY.map(k=>[k,median(matches.map(r=>r[k]))]));
  }
  const curve=all.filter(r=>r.day>=PERIOD_START&&r.day<=PERIOD_END).map(r=>({
    date:r.day,weekday:wd(r.day),observed:Object.fromEntries(KEY.map(k=>[k,r[k]])),
    weekdayBaselineMedian:Object.fromEntries(KEY.map(k=>[k,prior[wd(r.day)][k]])),
    deviationPct:Object.fromEntries(KEY.map(k=>[k,round(100*(r[k]/prior[wd(r.day)][k]-1))]))
  }));
  const shock=curve.find(r=>r.date===DAY),follow=curve.find(r=>r.date==='2026-02-24'),
    returnWindow=curve.find(r=>r.date==='2026-02-26');
  assert(shock&&follow&&returnWindow);
  return {
    contract:'MIHM-2026-FEBRUARY-BLIZZARD-MANHATTAN-CASE-0.1',
    scientificState:'RETROSPECTIVE_DESCRIPTIVE_POST_HOC_EVENT_SELECTION',
    externalEvent:'Severe NYC blizzard with citywide restrictions on non-essential vehicle travel',
    eventAuthorityChain:external,
    baseline:{
      method:'Median by same weekday over 2026-01-01 through 2026-02-21',
      includesOtherStormDays:true,nonrandomSelection:true,
      treatedAsCausalCounterfactual:false,calendarTimezone:'America/New_York',
      originalSourceVintagesVerified:false
    },
    observations:{
      dayOfMaxTrafficDecline:DAY,
      eventDay:shock,
      followingDay:follow,
      dayOfNearUsualLevels:returnWindow,
      timeline:curve
    },
    sources:{
      dailyObservedAggregate:'docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json',
      providerSnapshots:fixture.sourceReads.map(s=>({source:s.source,sha256:s.sourceResponseSha256}))
    },
    researchHypotheses:[
      {name:'Transport restriction/weather shock and sharp CBD entry decline',
        state:'CONSISTENT_IN_TIME_NOT_CAUSALLY_IDENTIFIED'},
      {name:'FDNY dispatch rate differs from urban movement pattern',
        state:'OBSERVED_DIVERGENCE_NO_VERIFIED_PROPAGATION'},
      {name:'Delayed 311 request pattern after restriction',
        state:'UNTESTED_REPORTING_LAG_OR_COMPOSITION_HYPOTHESIS'},
      {name:'Urban service/activity recovery by Feb 26',
        state:'DESCRIPTIVE_NEAR_BASELINE_NOT_INSTITUTIONAL_RETURN'}
    ],
    rivalExplanations:['Snow and policy order co-occur; cannot separate their effects',
      'School/business closures and calendar effects alter travel demand',
      '311 is complaint/request reporting, not true disruption incidence',
      'Dispatch count is not response time or actual resource availability',
      'Coverage/source revisions and original as-of knowledge are unknown',
      'Observed temporal sequence is insufficient for causal propagation or MIHM uniqueness'],
    prospectivePredictionActuallyIssued:false,canonicalMihmValidated:false,
    nextDiscriminatingTest:'Predeclare another externally dated perturbation, test same fixed baseline/lag metrics versus conventional event-study/synthetic-control and falsification dates without cherry-picking',
    externalActionTaken:'NONE',productionAndDatabaseChanges:'NONE'
  };
}
function selfTest(){
  const data=JSON.parse(readFileSync(FIXTURE,'utf8')),result=assess(data);
  assert.equal(result.observations.eventDay.observed.cbdEntries,72721);
  assert.equal(result.observations.eventDay.observed.fdnyCount,684);
  assert.equal(result.observations.eventDay.observed.service311,1844);
  assert.equal(result.observations.eventDay.deviationPct.cbdEntries,-84.8);
  assert.equal(result.observations.eventDay.deviationPct.fdnyCount,58.3);
  assert.equal(result.observations.dayOfNearUsualLevels.deviationPct.cbdEntries,-2.2);
  assert.equal(result.canonicalMihmValidated,false);
  const broken=structuredClone(data);broken.rows[145].fdnyCount=null;
  assert.throws(()=>assess(broken),/INVALID_EVENT_SOURCE_VALUE/);
  console.log(JSON.stringify({status:'OFFLINE_REAL_EVENT_RECONSTRUCTION_QA_PASS',
    sourceDays:data.rows.length,independentCausalIdentification:false}));
}
if(process.argv.includes('--self-test'))selfTest();
else if(process.argv.includes('--evaluate')){
  const data=JSON.parse(readFileSync(FIXTURE,'utf8'));
  console.log(JSON.stringify(assess(data),null,2));
}else throw Error('Use --self-test or --evaluate; no network/source writes');
