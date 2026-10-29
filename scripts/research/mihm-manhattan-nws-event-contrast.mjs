/**
 * SFI MIHM Foundation — 4 independent NWS-dated (not outcome-picked)
 * weather episodes, historical urban response and placebo window contrasts.
 * EXPLORATORY, retrospectively selected AFTER earlier full-year inspection.
 * No original T0 source-vintage evidence, causal effects, canonical MIHM or
 * research event independence should be inferred from this calculation.
 *
 * --self-test : offline unit guards against future data and causal promotion.
 * --evaluate  : real archived 365-day observations, no network or other writes.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const INPUT='docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json';
const VARS=['cbdEntries','crzEntries','fdnyCount','service311'];
const EVENTS=[
  {id:'NWS_2026_01_25_MAJOR_SNOW',anchor:'2026-01-25',
    class:'MAJOR_MANHATTAN_SNOW',centralParkSnowInches:11.4,
    weatherSource:'https://www.weather.gov/okx/20260125_26',
    note:'NYC winter storm Jan25-26, city advisories; do not infer same traffic restriction as Feb22'},
  {id:'NWS_2026_02_06_COLD_LIGHT_CITY_SNOW',anchor:'2026-02-06',
    class:'COLD_LIGHT_MANHATTAN_SNOW',centralParkSnowInches:0.1,
    weatherSource:'https://www.weather.gov/okx/20260206_08',
    note:'Heavier snow east of NYC; 0.1 in Central Park recorded Feb7, extreme cold across region'},
  {id:'NWS_2026_02_22_BLIZZARD_RESTRICTION',anchor:'2026-02-22',
    class:'MAJOR_SNOW_WITH_TRAVEL_RESTRICTION',centralParkSnowInches:19.7,
    weatherSource:'https://www.weather.gov/okx/20260222_23',
    policySource:'https://www.nyc.gov/content/dam/nycgov/mayors-office/downloads/pdf/executive-orders/2026/eeo-3.pdf',
    note:'Travel restriction 2026-02-22 21:00 to 2026-02-23 12:00 NYC local; confounded with intense snow'},
  {id:'NWS_2026_05_20_FLASH_FLOOD_SPATIAL_CHALLENGE',anchor:'2026-05-20',
    class:'NYC_METRO_FLOOD_PREDOMINANTLY_QUEENS_BROOKLYN',centralParkSnowInches:null,
    weatherSource:'https://www.weather.gov/okx/20260520',
    note:'Flash flooding reported particularly Brooklyn/Queens; Manhattan impact is NOT assumed'}
];
const dayMillis=86400000,epoch=d=>Date.parse(d+'T12:00:00Z');
const dist=(a,b)=>Math.round((epoch(a)-epoch(b))/dayMillis);
const weekday=d=>new Date(epoch(d)).getUTCDay();
const round=n=>Math.round(n*1000)/1000;
const med=a=>{assert(a.length>0);const b=[...a].sort((x,y)=>x-y);
  const j=Math.floor(b.length/2);return b.length%2?b[j]:(b[j-1]+b[j])/2;};
function validate(data){
  assert.equal(data.contract,'MIHM-MANHATTAN-365D-RETROSPECTIVE-EVIDENCE-0.1');
  assert.equal(data.dataAsOfOriginalDates,'NOT_VERIFIED');
  assert.equal(data.geographyCompatibility,'HETEROGENEOUS_BOROUGH_VS_NESTED_CBD');
  assert(data.rows.length===365);
  for(let i=0;i<data.rows.length;i++){
    const r=data.rows[i];
    assert.equal(r.day,new Date(epoch('2025-10-01')+i*dayMillis).toISOString().slice(0,10));
    for(const k of VARS)assert(Number.isSafeInteger(r[k])&&r[k]>0,'Missing/invalid source '+k+' '+r.day);
    assert(r.crzEntries<=r.cbdEntries,'Nested traffic provider scope violated');
  }
  assert(EVENTS.every(e=>data.rows.some(x=>x.day===e.anchor)));
}
function daily(rows,index){
  assert(index>=56&&index<rows.length,'56-day pre-event reference required');
  const r=rows[index],prior=rows.slice(index-56,index).filter(x=>weekday(x.day)===weekday(r.day));
  assert.equal(prior.length,8,'Exactly eight past same-weekday references');
  const reference=Object.fromEntries(VARS.map(k=>[k,med(prior.map(x=>x[k]))]));
  const pct=Object.fromEntries(VARS.map(k=>[k,round(100*(r[k]/reference[k]-1))]));
  return {
    day:r.day,
    actual:Object.fromEntries(VARS.map(k=>[k,r[k]])),
    prior56DaysSameWeekdayMedian:reference,
    deviationPct:pct,
    trafficEmergencyDivergence:round(Math.max(0,-pct.cbdEntries)*Math.max(0,pct.fdnyCount))
  };
}
function window(rows,anchor){
  const t=rows.findIndex(x=>x.day===anchor);
  assert(t>=56&&t+7<rows.length,'event controls require pre and post dates');
  const days=Array.from({length:3},(_,z)=>daily(rows,t+z));
  const chosen=days.reduce((a,b)=>b.trafficEmergencyDivergence>a.trafficEmergencyDivergence?b:a);
  const post=Array.from({length:8},(_,z)=>daily(rows,t+z));
  const returned=post.find(d=>Math.abs(d.deviationPct.cbdEntries)<=10&&
    Math.abs(d.deviationPct.fdnyCount)<=10);
  return {
    anchor,observations:days,
    strongestOppositeDirectionDay:chosen.day,
    strongestOppositeDirectionOffset:dist(chosen.day,anchor),
    jointDivergenceScore:chosen.trafficEmergencyDivergence,
    reporting311ChangeDay0Pct:days[0].deviationPct.service311,
    reporting311ChangeDay1Pct:days[1].deviationPct.service311,
    apparentProxyReturnDay:returned?.day??null,
    returnDaysSinceAnchor:returned?dist(returned.day,anchor):null,
    institutionalReturnConfirmed:false,
    actualCrossSystemPropagationIdentified:false
  };
}
function experiment(data){
  validate(data);const rows=data.rows;
  const admitted=rows.map(x=>x.day).filter(day=>{
    const i=rows.findIndex(r=>r.day===day);
    if(i<56||i+7>=rows.length)return false;
    // Exclude all 3-day placebo windows intersecting +-7 days of
    // any source-declared event, rather than hand-select quiet days.
    return EVENTS.every(e=>Array.from({length:3},(_,z)=>Math.abs(dist(
      rows[i+z].day,e.anchor))>7).every(Boolean));
  });
  const reference=admitted.map(d=>window(rows,d).jointDivergenceScore);
  assert(reference.length>=150);
  const controlsSorted=reference.slice().sort((a,b)=>a-b);
  const eventResults=EVENTS.map(e=>{
    const w=window(rows,e.anchor);
    const asLarge=reference.filter(x=>x>=w.jointDivergenceScore).length;
    const tail=(asLarge+1)/(reference.length+1);
    return {...e,...w,
      context:{
        comparator:'All eligible 3-day windows, minus event +/-7d buffers',
        placeboWindowCount:reference.length,
        fractionPlacebosAtLeastAsLarge:round(tail),
        percentileRankOfJointScore:round(100*(1-tail)),
        notEmpiricalRandomizationPValue:true
      }
    };
  });
  return {
    contract:'MIHM-MANHATTAN-NWS-EVENT-CONTRAST-0.1',
    evidenceState:'EXPLORATORY_POST_HOC_FULL_YEAR_ALREADY_CONSULTED',
    source:'NWS independent significant event chronology; some episodes geographically remote from Manhattan',
    providerDailyPanel:INPUT,
    sourceResponseFingerprints:data.sourceReads.map(r=>({source:r.source,sha256:r.sourceResponseSha256})),
    dayRange:[data.rows[0].day,data.rows.at(-1).day],
    eventSelection:'4 fixed NWS 2026 episode dates: Jan25, Feb6, Feb22, May20. Chosen before THIS calculation, not before inspecting full panel previously',
    priorReference:'Eight previous same weekdays within 56 days, strictly earlier than each evaluated day',
    placebo:{count:reference.length,selection:'All eligible windows with exclusion buffers',
      notIndependentRandomization:true,zeroScores:reference.filter(x=>x===0).length,
      scoreQ50:round(controlsSorted[Math.floor(reference.length*.5)]),
      scoreQ90:round(controlsSorted[Math.floor(reference.length*.9)]),
      scoreQ95:round(controlsSorted[Math.floor(reference.length*.95)]),
      scoreQ99:round(controlsSorted[Math.floor(reference.length*.99)])},
    events:eventResults,
    externalEvidenceClass:'NWS_PUBLIC_WEATHER_EVENTS',
    historicAsOfT0Availability:'NOT_VERIFIED',
    predictiveClaimsAllowed:false,
    canonicalMihmValidated:false,
    causalImpactIdentified:false,
    eventSelectionIsIndependentOfFullYearData:false,
    noProductionActions:true,
    scientificDisposition:'DESCRIPTIVE_REPLICATION_CHALLENGE_NEEDS_NEW_INDEPENDENT_EVENT_COHORT'
  };
}
function selfTest(){
  assert.equal(EVENTS.length,4);
  assert(new Set(EVENTS.map(e=>e.anchor)).size===4);
  const rs=Array.from({length:365},(_,i)=>({
    day:new Date(epoch('2025-10-01')+i*dayMillis).toISOString().slice(0,10),
    cbdEntries:400000+8000*(i%7),
    crzEntries:350000+7000*(i%7),
    service311:1600+30*(i%7),
    fdnyCount:400+5*(i%7)
  }));
  const input={contract:'MIHM-MANHATTAN-365D-RETROSPECTIVE-EVIDENCE-0.1',
    dataAsOfOriginalDates:'NOT_VERIFIED',
    geographyCompatibility:'HETEROGENEOUS_BOROUGH_VS_NESTED_CBD',
    sourceReads:[{source:'NYC311',sourceResponseSha256:'f'.repeat(64)},
      {source:'FDNY',sourceResponseSha256:'a'.repeat(64)},
      {source:'MTA_CBD_CRZ',sourceResponseSha256:'b'.repeat(64)}],
    rows:rs};
  const calc=experiment(input);
  assert.equal(calc.events.length,4);
  assert(calc.events.every(e=>e.jointDivergenceScore===0));
  assert(calc.events.every(e=>e.apparentProxyReturnDay===e.anchor));
  assert(calc.placebo.count>=150);
  const dateIndex=rs.findIndex(r=>r.day==='2026-02-23');
  const copy=structuredClone(rs);copy[dateIndex].fdnyCount+=300;
  // Future observations must not enter a previous day's baseline.
  assert.deepEqual(daily(rs,dateIndex-1),daily(copy,dateIndex-1));
  const miss=structuredClone(input);miss.rows[dateIndex].fdnyCount=null;
  assert.throws(()=>experiment(miss),/Missing\/invalid source/);
  const bad=structuredClone(input);bad.rows[dateIndex].crzEntries=900000;
  assert.throws(()=>experiment(bad),/Nested traffic/);
  // The archived observation is also checked on every subsequent CI run,
  // without reopening the official APIs or modifying results.
  const archived=JSON.parse(readFileSync(
    'docs/research/evidence/MIHM-MANHATTAN-FOUR-NWS-EVENT-CONTRAST-2026-10-25.json','utf8'));
  const observed=JSON.parse(readFileSync(INPUT,'utf8'));
  const real=experiment(observed);
  assert.equal(archived.contract,real.contract);
  assert.equal(archived.placebo.count,240);
  assert.deepEqual(archived.events.map(e=>e.id),EVENTS.map(e=>e.id));
  for(let i=0;i<real.events.length;i++){
    assert.equal(archived.events[i].jointDivergenceScore,real.events[i].jointDivergenceScore);
    assert.equal(archived.events[i].strongestOppositeDirectionDay,real.events[i].strongestOppositeDirectionDay);
    assert.equal(archived.events[i].apparentProxyReturnDay,real.events[i].apparentProxyReturnDay);
    assert.equal(archived.events[i].context.fractionPlacebosAtLeastAsLarge,
      real.events[i].context.fractionPlacebosAtLeastAsLarge);
  }
  assert.equal(real.events[0].apparentProxyReturnDay,null,
    'January response did not certify return within first seven days');
  assert(real.events[0].observations[0].deviationPct.service311>0&&
    real.events[2].observations[1].deviationPct.service311<0,
    '311 response is not a universal fixed storm signature');
  assert(archived.eventSelectionIsIndependentOfFullYearData===false,
    'Do not retroactively claim independent event selection');
  console.log(JSON.stringify({status:'NWS_FOUR_EVENT_SCIENCE_GUARDS_PASS',
    realWorldResultsTested:false,noFutureReferenceLeakage:true,
    independentHistoricalConfirmation:false}));
}
if(process.argv.includes('--self-test'))selfTest();
else if(process.argv.includes('--evaluate')){
  const b=readFileSync(INPUT);
  assert(b.length<230000,'Only the archived daily aggregated source panel');
  console.log(JSON.stringify({inputSHA256:createHash('sha256').update(b).digest('hex'),
    ...experiment(JSON.parse(b.toString('utf8')))},null,2));
}else throw Error('Explicit --self-test or --evaluate; no external data collection');
