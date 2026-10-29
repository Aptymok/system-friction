/**
 * SFI MIHM Foundation — separately frozen same-calendar-day closure outcome,
 * NOT the prior unexecuted 48h closure outcome (Socrata no datetime_add_hh).
 * NYC311 HEAT/HOT WATER Manhattan nine date cohorts, by creation hour.
 * One bounded aggregate public GET only; no personal identifiers/records.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const API='https://data.cityofnewyork.us/resource/erm2-nwe9.json';
const ANNUAL='docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json';
const EPISODES=[
  {id:'JAN25_SNOW',date:'2026-01-25',controls:['2026-01-11','2026-01-18']},
  {id:'FEB23_SNOW_AND_TRAVEL_BAN',date:'2026-02-23',controls:['2026-02-09','2026-02-16']},
  {id:'DEC25_NOSNOW_HOLIDAY',date:'2025-12-25',controls:['2025-12-11','2025-12-18']}
];
const DAYS=[...new Set(EPISODES.flatMap(x=>[x.date,...x.controls]))].sort();
const avg=x=>x.reduce((a,b)=>a+b,0)/x.length;
const q=n=>Math.round(n*1000)/1000;
const next=d=>new Date(Date.parse(d+'T12:00:00Z')+86400000).toISOString().slice(0,10);
const integer=(v,n)=>{const x=Number(v);assert(Number.isSafeInteger(x)&&x>=0,'INVALID_INT '+n);return x};
function sourceUrl(){
  const u=new URL(API);
  const whereDates=DAYS.map(d=>"(created_date >= '"+d+"T00:00:00' AND created_date < '"+next(d)+"T00:00:00')");
  const select=[
    'date_trunc_ymd(created_date) as day','date_extract_hh(created_date) as hour',
    'count(*) as created','count(closed_date) as everclosed',
    'sum(case(closed_date is not null AND closed_date >= created_date AND date_trunc_ymd(closed_date) = date_trunc_ymd(created_date),1,true,0)) as closedsameday'
  ].join(',');
  for(const [k,v] of Object.entries({
    '$select':select,
    '$where':"borough = 'MANHATTAN' AND complaint_type = 'HEAT/HOT WATER' AND ("+whereDates.join(' OR ')+")",
    '$group':'day,hour','$order':'day ASC,hour ASC','$limit':'300'
  }))u.searchParams.set(k,v);
  return u.toString();
}
function readAggregate(raw,annual){
  assert(Array.isArray(raw)&&raw.length>0&&raw.length<=300,'EMPTY_OR_UNBOUNDED_PROVIDER_AGGREGATES');
  const records=new Map(DAYS.map(d=>[d,new Map()]));
  for(const x of raw){
    const day=String(x.day??'').slice(0,10),hour=integer(x.hour,'hour');
    assert(DAYS.includes(day),'DATE_OUTSIDE_PREDECLARED_COHORT');
    assert(hour>=0&&hour<=23,'INVALID_CREATED_HOUR');
    const created=integer(x.created,'created'),everClosed=integer(x.everclosed,'everClosed'),
      closedSameDay=integer(x.closedsameday,'closedSameDay');
    assert(created>0&&closedSameDay<=everClosed&&everClosed<=created,
      'CLOSURE_COUNT_INTEGRITY');
    const byHour=records.get(day);
    assert(!byHour.has(hour),'DUPLICATE_DAY_HOUR');
    byHour.set(hour,{created,everClosed,closedSameDay});
  }
  const annualMap=new Map(annual.rows.map(r=>[r.day,r.service311]));
  assert.equal(annual.rows.length,365);
  const daily=new Map();
  for(const day of DAYS){
    const hours=records.get(day);assert(hours.size>0,'MISSING_PROVIDER_DAY');
    const created=[...hours.values()].reduce((v,r)=>v+r.created,0);
    const closed=[...hours.values()].reduce((v,r)=>v+r.closedSameDay,0);
    const everClosed=[...hours.values()].reduce((v,r)=>v+r.everClosed,0);
    assert(created>0&&created<=annualMap.get(day),'HEAT_REQUESTS_EXCEED_311_TOTAL');
    daily.set(day,{day,created,closedSameDay:closed,everClosed,
      observedCreationHours:hours.size,byHour:hours});
  }
  return daily;
}
function compare(daily){
  const results=EPISODES.map(event=>{
    const target=daily.get(event.date),references=event.controls.map(d=>daily.get(d));
    const before=avg(references.map(r=>r.closedSameDay/r.created));
    const after=target.closedSameDay/target.created;
    // fixed equal hour weights over COMMON observed hours, not data-selected
    // weights; no extrapolation into missing individual hour support.
    const common=Array.from({length:24},(_,i)=>i).filter(hour=>
      [target,...references].every(r=>r.byHour.has(hour)));
    let adjusted=null;
    if(common.length>=12){
      const eventRate=avg(common.map(h=>{
        const x=target.byHour.get(h);return x.closedSameDay/x.created;
      }));
      const priorRate=avg(references.map(ref=>
        avg(common.map(h=>{const x=ref.byHour.get(h);return x.closedSameDay/x.created}))));
      adjusted={supportedHourCount:common.length,hoursWithoutCompleteSupport:24-common.length,
        equalHourWeightedDifferencePercentagePoints:q(100*(eventRate-priorRate))};
    }
    const rawDifferencePP=q(100*(after-before));
    return {event:event.id,date:event.date,
      sourceCreatedRequests:target.created,sourceClosedSameDay:target.closedSameDay,
      observedSameDayFraction:q(after),baselineMeanSameDayFraction:q(before),
      differencePercentagePoints:rawDifferencePP,predeclaredSlowdownThresholdPP:-5,
      meetsPredeclaredSlowdown:rawDifferencePP<=-5,
      baseline:event.controls.map(d=>{const r=daily.get(d);
        return {day:d,created:r.created,closedSameDay:r.closedSameDay,
          fraction:q(r.closedSameDay/r.created)};}),
      hourStandardizationSensitivity:adjusted};
  });
  const twoStorms=results.slice(0,2),both=twoStorms.every(r=>r.meetsPredeclaredSlowdown);
  return {
    contract:'MIHM-311-HEAT-SAME-CALENDAR-DAY-CLOSURE-0.1',
    evidenceClass:'EXPLORATORY_ADMINISTRATIVE_PROCESS_OUTCOME_NOT_PHYSICAL_SERVICE',
    original48HourHypothesisTested:false,
    snowStormsBothAtLeastFivePPSlowdown:both,
    conclusion:both?'BOTH_STORM_EPISODES_RAW_DESCRIPTIVE_SLOWDOWN':
      'UNIVERSAL_FIVE_PP_SAME_DAY_SLOWDOWN_NOT_SUPPORTED',
    outcomes:results,
    publicTemporalProvenanceAtOriginalEventTime:'NOT_VERIFIED',
    observationalConfounders:['Creation-hour mixture','Snow severity','Travel restriction','Christmas/staffing calendar',
      'Administrative closure workflow','Data-vintage revisions'],
    causalAttribution:false,independentProspectiveVerification:false,
    canonicalMIHMImprovement:false,institutionalReturn:false
  };
}
function selfTest(){
  assert.equal(DAYS.length,9);
  const source=sourceUrl();
  assert(source.includes('date_extract_hh')&&source.includes('date_trunc_ymd'));
  assert(!source.includes('datetime_add_hh'));
  const annual=JSON.parse(readFileSync(ANNUAL,'utf8'));
  const mock=DAYS.flatMap(day=>Array.from({length:24},(_,hour)=>({
    day:day+'T00:00:00',hour:String(hour),created:'2',
    everclosed:'2',closedsameday:hour<12?'1':'0'
  })));
  const res=compare(readAggregate(mock,annual));
  assert.equal(res.outcomes.length,3);
  assert(res.outcomes.every(e=>e.hourStandardizationSensitivity.supportedHourCount===24));
  assert(res.original48HourHypothesisTested===false);
  const dropped=mock.filter(x=>!(x.day.startsWith(DAYS[0])&&x.hour==='0'));
  assert.equal(compare(readAggregate(dropped,annual)).outcomes.length,3);
  const error=structuredClone(mock);error[0].closedsameday='3';
  assert.throws(()=>readAggregate(error,annual),/CLOSURE_COUNT_INTEGRITY/);
  const duplicate=[...mock,mock[0]];
  assert.throws(()=>readAggregate(duplicate,annual),/DUPLICATE_DAY_HOUR/);
  const missing=mock.filter(x=>!x.day.startsWith(DAYS[0]));
  assert.throws(()=>readAggregate(missing,annual),/MISSING_PROVIDER_DAY/);
  const observed=JSON.parse(readFileSync(
    'docs/research/evidence/MIHM-311-HEAT-SAME-DAY-CLOSURE-STORM-HOLIDAY-2026.json','utf8'));
  assert.equal(observed.original48HourHypothesisTested,false);
  assert.equal(observed.observedSourceGroups,215);
  assert(/^[a-f0-9]{64}$/.test(observed.sourceRead.sha256));
  assert.equal(observed.sourceDailyHourAggregates.length,9);
  const aggregateRows=observed.sourceDailyHourAggregates.flatMap(day=>
    Object.entries(day.byHour).map(([hour,v])=>({
      day:day.day+'T00:00:00',hour,created:v.created,
      everclosed:v.everClosed,closedsameday:v.closedSameDay})));
  assert.equal(aggregateRows.length,observed.observedSourceGroups);
  const replay=compare(readAggregate(aggregateRows,annual));
  assert.deepEqual(replay.outcomes,observed.outcomes,'Original source receipt faithfully recalculates');
  assert.equal(replay.snowStormsBothAtLeastFivePPSlowdown,false);
  assert(replay.outcomes[0].differencePercentagePoints>-5);
  assert(replay.outcomes[1].differencePercentagePoints<-5);
  assert(!replay.outcomes[2].meetsPredeclaredSlowdown);
  console.log(JSON.stringify({status:'SAME_DAY_311_HEAT_OUTCOME_QA_PASS',
    sourceAggregatesNotFetched:true,archivedRealSourceDays:9,archivedGroups:215,
    rawSnowstormHypothesisPassed:false}));
}
async function collect(){
  try{
    const u=sourceUrl();
    const response=await fetch(u,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(25000)});
    if(!response.ok)throw Error('SOURCE_HTTP_'+response.status+' '+(await response.text()).slice(0,1000));
    if(Number(response.headers.get('content-length')||0)>80000)throw Error('SOURCE_HEADER_TOO_LARGE');
    const b=Buffer.from(await response.arrayBuffer());
    if(b.length>80000)throw Error('SOURCE_RESPONSE_TOO_LARGE');
    const raw=JSON.parse(b.toString('utf8'));
    const annual=JSON.parse(readFileSync(ANNUAL,'utf8'));
    const parsed=readAggregate(raw,annual);
    console.log(JSON.stringify({
      ...compare(parsed),
      observedSourceGroups:raw.length,
      sourceDailyHourAggregates:DAYS.map(day=>{const r=parsed.get(day);return {
        day,created:r.created,closedSameDay:r.closedSameDay,everClosed:r.everClosed,
        byHour:Object.fromEntries(r.byHour)};}),
      sourceRead:{url:u,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),
        official:'https://data.cityofnewyork.us/d/erm2-nwe9',reads:1}
    },null,2));
  }catch(e){
    console.log(JSON.stringify({contract:'MIHM-311-HEAT-SAME-CALENDAR-DAY-CLOSURE-0.1',
      state:'SOURCE_ABSTAIN_NOT_A_SCIENTIFIC_RESULT',error:String(e),
      providerQueryCount:1,claimOfEffect:false},null,2));
  }
}
if(process.argv.includes('--self-test'))selfTest();
else if(process.argv.includes('--collect'))await collect();
else throw Error('Explicit --self-test or --collect only');
