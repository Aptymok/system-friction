/**
 * MIHM Foundation: administrative closure within 48/72 hours for HEAT/HOT WATER
 * NYC311 service requests. One bounded public aggregate read; no raw SRs.
 * Outcomes and threshold frozen in MIHM Foundation program BEFORE source read.
 * --self-test offline, --collect one explicit 25s/80KiB official read.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const API='https://data.cityofnewyork.us/resource/erm2-nwe9.json';
const STUDIES=[
  {id:'JAN_2026_MAJOR_SNOW',date:'2026-01-25',baseline:['2026-01-11','2026-01-18']},
  {id:'FEB_2026_BLIZZARD',date:'2026-02-23',baseline:['2026-02-09','2026-02-16']},
  {id:'DEC_2025_NOSNOW_CHRISTMAS',date:'2025-12-25',baseline:['2025-12-11','2025-12-18']}
];
const DAYS=[...new Set(STUDIES.flatMap(x=>[...x.baseline,x.date]))].sort();
const mean=x=>x.reduce((s,a)=>s+a,0)/x.length;
const pct=n=>Math.round(n*1000)/1000;
const weekday=d=>new Date(d+'T12:00:00Z').getUTCDay();
const next=d=>new Date(Date.parse(d+'T12:00:00Z')+86400000).toISOString().slice(0,10);
const int=(v,label)=>{const n=Number(v);assert(Number.isSafeInteger(n)&&n>=0,'BAD_INTEGER_COUNT '+label);return n};
function urlOf(){
  const u=new URL(API);
  const times=DAYS.map(d=>"(created_date >= '"+d+"T00:00:00' AND created_date < '"+next(d)+"T00:00:00')");
  const closedHours=h=>"sum(case(closed_date is not null AND closed_date >= created_date AND closed_date <= datetime_add_hh(created_date,"+h+"),1,true,0)) as closed"+h;
  for(const [k,v] of Object.entries({
    '$select':['date_trunc_ymd(created_date) as day','count(*) as created','count(closed_date) as everclosed',closedHours(48),closedHours(72)].join(','),
    '$where':"borough = 'MANHATTAN' AND complaint_type = 'HEAT/HOT WATER' AND ("+times.join(' OR ')+")",
    '$group':'day','$order':'day ASC','$limit':'16'
  }))u.searchParams.set(k,v);
  return u.toString();
}
function parse(data){
  assert(Array.isArray(data)&&data.length<=16,'UNBOUNDED_311_RESPONSE');
  const map=new Map();
  for(const item of data){
    const d=String(item.day??'').slice(0,10);
    assert(DAYS.includes(d),'DATE_OUTSIDE_FROZEN_COHORT '+d);
    assert(!map.has(d),'DUPLICATE_COHORT_DAY');
    const r={day:d,created:int(item.created,'created'),everClosed:int(item.everclosed,'everclosed'),
      closed48:int(item.closed48,'closed48'),closed72:int(item.closed72,'closed72')};
    assert(r.created>0,'ZERO_COHORT_DENOMINATOR');
    assert(r.closed48<=r.closed72&&r.closed72<=r.everClosed&&r.everClosed<=r.created,
      'OUTCOME_MONOTONICITY_OR_RIGHT_CENSORING');
    map.set(d,r);
  }
  assert.equal(map.size,DAYS.length,'INCOMPLETE_NINE_DATE_SOURCE_RESULT');
  for(const d of DAYS)assert(map.has(d),'MISSING_DAY '+d);
  return map;
}
function compare(records){
  assert(records.size===DAYS.length);
  const results=STUDIES.map(s=>{
    const event=records.get(s.date),refs=s.baseline.map(d=>records.get(d));
    const time=h=>{
      const key=h===48?'closed48':'closed72',ref=mean(refs.map(r=>r[key]/r.created));
      const rate=event[key]/event.created;
      return {withinHours:h,observedFraction:pct(rate),priorSameWeekdayMeanFraction:pct(ref),
        differencePercentagePoints:pct(100*(rate-ref)),eventClosed:event[key],eventCreated:event.created,
        referenceDates:s.baseline,referenceCreated:refs.map(r=>r.created),
        referenceClosed:refs.map(r=>r[key])};
    };
    const closed48=time(48),closed72=time(72);
    return {episode:s.id,eventDay:s.date,closed48,closed72,
      frozenSlowdownThresholdPP:-5,
      meetsFrozenSlowdownCriterion:closed48.differencePercentagePoints<=-5};
  });
  const both=results.slice(0,2).every(x=>x.meetsFrozenSlowdownCriterion);
  return {contract:'MIHM-311-WINTER-ADMIN-CLOSURE-2026-0.1',
    scientificState:'EXPLORATORY_RETROSPECTIVE_OPERATIONS_PROXY',
    sourceDefinition:'NYC311 complaint_type HEAT/HOT WATER exact, Manhattan created_date cohort',
    sourceRowsDownloaded:false,sourceTimeVintageAtOriginalT0:'NOT_VERIFIED',
    processOutcome:'administrative case closure <=48h or <=72h after created; NOT repair/heat restored, not physical RETURN',
    frozenHypothesis:'Both Jan25 and Feb23 snow dates slow exact HEAT/HOT WATER 48h closure by at least 5 percentage points vs previous 2 same weekdays',
    jointHypothesisSupportedOnThisDescriptiveEndpoint:both,
    holidayControl:results[2],episodes:results,
    testDisposition:both?'DESCRIPTIVE_SIGN_SUPPORT_ONLY_HOLIDAY_CONTROL_AND_MECHANISM_UNIDENTIFIED':
      'SIMPLE_BOTH_STORMS_SLOWDOWN_HYPOTHESIS_NOT_SUPPORTED',
    causalProof:false,prospectiveIndependentTest:false,canonicalMIHMValidated:false,
    noUserRecordsOrProductionWrites:true};
}
async function collect(){
  try{
    const url=urlOf(),resp=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(25000)});
    if(!resp.ok){
      const errorBody=(await resp.text()).slice(0,1600);
      throw Error('SOURCE_HTTP_'+resp.status+' '+errorBody);
    }
    if(Number(resp.headers.get('content-length')||0)>80000)throw Error('ANNOUNCED_DATA_TOO_LARGE');
    const bytes=Buffer.from(await resp.arrayBuffer());
    if(bytes.length>80000)throw Error('RESPONSE_TOO_LARGE');
    const records=parse(JSON.parse(bytes.toString('utf8')));
    console.log(JSON.stringify({...compare(records),provenance:{
      source:'https://data.cityofnewyork.us/d/erm2-nwe9',
      rawResponseSHA256:createHash('sha256').update(bytes).digest('hex'),
      bytes:bytes.length,queryUrl:url,readCount:1},
      sourceDailyAggregates:DAYS.map(day=>records.get(day))},null,2));
  }catch(e){console.log(JSON.stringify({contract:'MIHM-311-WINTER-ADMIN-CLOSURE-2026-0.1',
    scientificState:'SOURCE_ABORT_NO_COMPARISON',error:String(e),negativeResult:false,
    scientificHypothesisTested:false,requestRepeated:false,sourceRawRowsDownloaded:false},null,2))}
}
function selfTest(){
  assert.equal(DAYS.length,9);
  for(const ep of STUDIES)for(const d of ep.baseline)assert.equal(weekday(d),weekday(ep.date));
  const url=urlOf();
  assert(url.includes('2026-01-25')&&url.includes('2026-02-23')&&url.includes('2025-12-25'));
  assert(url.includes('HEAT%2FHOT+WATER')||url.includes('HEAT%2FHOT%20WATER'));
  assert(url.includes('datetime_add_hh'));assert(!url.includes('2026-09-30'));
  const mock=DAYS.map((day,i)=>({day:day+'T00:00:00',created:'200',
    everclosed:'160',closed48:String(100+i),closed72:'150'}));
  const out=compare(parse(mock));
  assert.equal(out.episodes.length,3);
  assert(out.episodes.every(e=>Number.isFinite(e.closed48.differencePercentagePoints)));
  const altered=structuredClone(mock);altered[0].closed72='12';
  assert.throws(()=>parse(altered),/OUTCOME_MONOTONICITY/);
  assert.throws(()=>parse(mock.slice(1)),/INCOMPLETE_NINE_DATE/);
  assert.throws(()=>parse([{...mock[0],day:'2026-10-02'}]),/DATE_OUTSIDE/);
  console.log(JSON.stringify({status:'MIHM_HEAT_CLOSURE_FROZEN_COHORT_QA_PASS',
    realSourceDataAccess:false,independentScientificEvidence:false,cohorts:9}));
}
if(process.argv.includes('--self-test'))selfTest();
else if(process.argv.includes('--collect'))await collect();
else throw Error('Use --self-test or explicit --collect; no recurring external fetch');
