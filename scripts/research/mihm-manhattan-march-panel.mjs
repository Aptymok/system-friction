/**
 * MIHM Foundation: Manhattan 2026-03 daily development panel, four source snapshots.
 * Bounded calls for three sources and weekly DOT chunks; no raw personal/station/link records.
 * --self-test: offline tests + sanity checks against the previously saved week.
 * --collect: read-only bounded public aggregates, printed to CI logs; no DB writes.
 * DOT arithmetic mean and sample-weighted mean are different estimands, neither
 * assumed representative of city-wide movement. Historical T0 source vintage unknown.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const START='2026-03-01T00:00:00',END='2026-04-01T00:00:00';
const DAYS=Array.from({length:31},(_,i)=>{
  const day=String(i+1).padStart(2,'0');return '2026-03-'+day;
});
const FIXTURE_PATH='docs/research/evidence/MIHM-MANHATTAN-FOUR-SOURCE-2026-03-01.json';
const SOURCES=[
  {id:'311',api:'https://data.cityofnewyork.us/resource/erm2-nwe9.json',
   date:'created_date',borough:'borough',value:'count(*) as requests',
   additional:'',
   condition:"borough = 'MANHATTAN'",
   unit:'service requests'},
  {id:'FDNY',api:'https://data.cityofnewyork.us/resource/8m42-w767.json',
   date:'incident_datetime',borough:'incident_borough',value:'count(*) as dispatches',
   additional:'',
   condition:"incident_borough = 'MANHATTAN'",
   unit:'dispatched incidents'},
  {id:'MTA',api:'https://data.ny.gov/resource/5wq4-mkjj.json',
   date:'transit_timestamp',borough:'borough',value:'sum(ridership) as estimated_entries',
   additional:'',
   condition:"borough = 'Manhattan' AND transit_mode = 'subway'",
   unit:'estimated subway entries (no other modes)'},
  {id:'DOT',api:'https://data.cityofnewyork.us/resource/6a2s-2t65.json',
   date:'median_calculation_timestamp',borough:'borough',
   value:'avg(median_speed_fps) as mean_sample_speed_fps',
   additional:', sum(median_speed_fps * n_samples) / sum(n_samples) as weighted_speed_fps, count(*) as reader_rows, count(n_samples) as reader_rows_with_sample_counts, sum(n_samples) as total_samples',
   condition:"borough = 'Manhattan' AND median_speed_fps IS NOT NULL",
   unit:'fps: arithmetic sample mean; sample-weighted estimate unobserved'}
];
function query(spec,start=START,end=END){
  const u=new URL(spec.api);
  const items={
    '$select':'date_trunc_ymd('+spec.date+') as day, '+spec.value+spec.additional,
    '$where':spec.date+" >= '"+start+"' AND "+spec.date+" < '"+end+"' AND "+spec.condition,
    '$group':'day','$order':'day ASC','$limit':'64'};
  for(const [k,v] of Object.entries(items))u.searchParams.set(k,v);
  return u.toString();
}
function parse(spec,raw,admittedDays=DAYS){
  assert(Array.isArray(raw)&&raw.length<=64,'BOUNDED_AGGREGATE');
  const byDay=new Map();
  for(const row of raw){
    const day=String(row.day??'').slice(0,10);
    if(!admittedDays.includes(day))throw Error('DAY_OUTSIDE_DECLARED_DEVELOPMENT_WINDOW '+day);
    if(byDay.has(day))throw Error('DUPLICATE_DAY '+spec.id+' '+day);
    const name={311:'requests',FDNY:'dispatches',MTA:'estimated_entries',DOT:'mean_sample_speed_fps'}[spec.id];
    const main=Number(row[name]);
    if(!Number.isFinite(main)||main<0)throw Error('NONFINITE_MEASURE '+spec.id);
    const o={value:main};
    if(spec.id==='DOT'&&spec.sampleWeighted){
      const fields=['weighted_speed_fps','reader_rows','reader_rows_with_sample_counts','total_samples'];
      for(const field of fields){
        o[field]=Number(row[field]);
        if(!Number.isFinite(o[field])||o[field]<0)throw Error('INVALID_DOT_SAMPLE '+field+' '+day);
      }
      if(o.reader_rows_with_sample_counts>o.reader_rows)throw Error('DOT_SAMPLE_POPULATION_EXCEEDS_READINGS');
      if(o.total_samples<=0||o.reader_rows_with_sample_counts===0)throw Error('DOT_EMPTY_POSITIVE_SAMPLE_BASE');
      if(o.weighted_speed_fps<=0||o.value<=0)throw Error('DOT_UNUSABLE_SPEED');
    }
    byDay.set(day,o);
  }
  return {source:spec.id,byDay,days:byDay.size,missing:admittedDays.filter(d=>!byDay.has(d))};
}
function fixtureCheck(parts){
  const last=JSON.parse(readFileSync(FIXTURE_PATH,'utf8'));
  const changed=[];
  for(const day of DAYS.slice(0,7)){
    const prior=last.rows.find(r=>r.day===day);
    assert(prior,'Prior reference missing '+day);
    for(const spec of SOURCES){
      const value=parts.find(p=>p.source===spec.id)?.byDay.get(day)?.value;
      if(value===undefined)continue;
      const old=prior[spec.id];
      const delta=value-old;
      const tol=spec.id==='DOT'?0.000001:0;
      if(Math.abs(delta)>tol)changed.push({day,source:spec.id,oldValue:old,newValue:value,difference:delta});
    }
  }
  return changed;
}
async function boundedRead(spec,window){
  const sourceUrl=query(spec,window?.start??START,window?.end??END);
  const resp=await fetch(sourceUrl,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(spec.id==='DOT'?30000:45000)});
  if(!resp.ok)throw Error('HTTP_'+resp.status);
  const length=Number(resp.headers.get('content-length')??'0');
  if(length>260000)throw Error('SOURCE_OVER_BUDGET');
  const bytes=Buffer.from(await resp.arrayBuffer());
  if(bytes.length>260000)throw Error('SOURCE_OVER_BUDGET');
  const data=JSON.parse(bytes.toString('utf8'));
  return {...parse(spec,data,window?.days??DAYS),url:sourceUrl,rawSha256:createHash('sha256').update(bytes).digest('hex'),responseBytes:bytes.length};
}
async function readDotWeekly(spec){
  // Individual source snapshots; no weekly average is treated as a daily value.
  // Short windows keep the 331M-row DOT grouping within a bounded read budget.
  const chunks=[
    {start:'2026-03-01T00:00:00',end:'2026-03-08T00:00:00',days:DAYS.slice(0,7)},
    {start:'2026-03-08T00:00:00',end:'2026-03-15T00:00:00',days:DAYS.slice(7,14)},
    {start:'2026-03-15T00:00:00',end:'2026-03-22T00:00:00',days:DAYS.slice(14,21)},
    {start:'2026-03-22T00:00:00',end:'2026-03-29T00:00:00',days:DAYS.slice(21,28)},
    {start:'2026-03-29T00:00:00',end:'2026-04-01T00:00:00',days:DAYS.slice(28,31)},
  ];
  const byDay=new Map(),receipts=[];
  for(const window of chunks){
    // Bounded, provider-supported simple mean. Weighted aggregation already
    // timed out twice, on full month and on the first week; NOT silently imputed.
    const simple={...spec,additional:'',sampleWeighted:false};
    const part=await boundedRead(simple,window);
    receipts.push({days:window.days,sha256:part.rawSha256,bytes:part.responseBytes,url:part.url,missing:part.missing});
    for(const [day,value] of part.byDay){
      if(byDay.has(day))throw Error('DUPLICATE_DOT_ACROSS_CHUNKS');
      byDay.set(day,value);
    }
  }
  return {source:spec.id,byDay,days:byDay.size,missing:DAYS.filter(d=>!byDay.has(d)),
    receipts,rawSha256:null,responseBytes:receipts.reduce((n,r)=>n+r.bytes,0)};
}
function selfTest(){
  const sample=Array.from({length:31},(_,i)=>({day:DAYS[i]+'T00:00:00',requests:String(100+i)}));
  const p=parse(SOURCES[0],sample);
  assert.equal(p.days,31);assert.equal(p.missing.length,0);
  assert.equal(fixtureCheck([{source:'311',byDay:new Map(lastWeekRows().map(r=>[r.day,{value:r['311']}]))}]).length,0);
  const saved=JSON.parse(readFileSync('docs/research/evidence/MIHM-MANHATTAN-PARTIAL-MARCH-2026.json','utf8'));
  assert.equal(saved.admissibility.completeFourDomainPanel,false);
  assert.deepEqual(saved.rows.map(r=>r.day),DAYS,'Saved partial data has 31 non-imputed days');
  for(const r of saved.rows){
    assert(Number.isInteger(r.service311)&&r.service311>0);
    assert(Number.isInteger(r.fdnyCount)&&r.fdnyCount>0);
  }
  for(const old of lastWeekRows()){
    const now=saved.rows.find(r=>r.day===old.day);
    assert.equal(now.service311,old['311'],'Consistency with previously observed 311');
    assert.equal(now.fdnyCount,old.FDNY,'Consistency with previously observed FDNY');
  }
  assert.throws(()=>parse(SOURCES[0],[{day:'2026-07-01',requests:'3'}]),/DAY_OUTSIDE/);
  assert.throws(()=>parse(SOURCES[0],[sample[0],sample[0]]),/DUPLICATE/);
  assert.deepEqual(parse(SOURCES[0],sample.slice(0,7),DAYS.slice(0,7)).missing,[],
    'Seven-day partition contains no artificial missing month dates');
  assert.throws(()=>parse(SOURCES[0],[sample[8]],DAYS.slice(0,7)),/DAY_OUTSIDE/);

  assert.equal(parse({...SOURCES[3],sampleWeighted:false},
    [{day:DAYS[0],mean_sample_speed_fps:'9'}],DAYS.slice(0,1)).days,1);
  assert.throws(()=>parse({...SOURCES[3],sampleWeighted:true},[{day:DAYS[0],mean_sample_speed_fps:'9',
    weighted_speed_fps:'8',reader_rows:'40',reader_rows_with_sample_counts:'41',total_samples:'50'}]),/DOT_SAMPLE_POPULATION/);
  console.log(JSON.stringify({status:'OFFLINE_MARCH_AGGREGATE_TEST_PASS',externalRowsFetched:0,sourceVintagesVerified:false}));
}
function lastWeekRows(){
  return JSON.parse(readFileSync(FIXTURE_PATH,'utf8')).rows;
}
async function collect(){
  const parts=[],failures=[];
  for(const spec of SOURCES){
    try{parts.push(spec.id==='DOT'?await readDotWeekly(spec):await boundedRead(spec))}
    catch(e){failures.push({source:spec.id,error:String(e)})}
  }
  const complete=parts.length===4&&parts.every(p=>p.missing.length===0);
  const rows=complete?DAYS.map(day=>({
    day,
    service311:parts.find(p=>p.source==='311').byDay.get(day).value,
    fdnyCount:parts.find(p=>p.source==='FDNY').byDay.get(day).value,
    mtaEntries:parts.find(p=>p.source==='MTA').byDay.get(day).value,
    dotSpeed:parts.find(p=>p.source==='DOT').byDay.get(day).value,
    dotSampleWeightedSpeed:null,
    dotReaderRows:null,
    dotRowsWithSampleCount:null,
    dotSamples:null
  })): [];
  const delta={status:'NOT_MEASURED',
    reason:'DOT sample-weighted SoQL aggregation exceeded request timeout in two bounded attempts',
    unweightedSeriesRetained:true,representativeNetworkSpeed:false};
  const result={
    contract:'MIHM-MANHATTAN-FOUR-SOURCE-MARCH-2026-0.1',
    status:complete?'COMPLETE_UNWEIGHTED_OBSERVED_AGGREGATE':'INDETERMINATE_DO_NOT_CALIBRATE',
    window:[DAYS[0],DAYS.at(-1)],boundary:'MANHATTAN_SOURCE_BOROUGH',sourceVintage:'NOT_AS_OF_T0',
    sources:parts.map(p=>({id:p.source,days:p.days,missing:p.missing,sha256:p.rawSha256,
      bytes:p.responseBytes,url:p.url??null,chunks:p.receipts??null})),
    admittedPartialRows:DAYS.map(day=>({day,...Object.fromEntries(parts.filter(p=>p.byDay.has(day)).map(p=>[p.source,p.byDay.get(day)]))})),
    failures,sourceRevisionAgainstSavedWeek:complete?fixtureCheck(parts):[],
    rows,dotSamplingSensitivity:delta,
    limitations:[
      'DOT unweighted link-sample mean is NOT population representative; n_samples weighting was not successfully fetched',
      'Original as-of-T0 publication not verified',
      'MTA estimated entries are not a count of individual trips',
      'No learned causal relations or predictive skill are demonstrated by one month'
    ]
  };
  console.log(JSON.stringify(result,null,2));
}
if(process.argv.includes('--self-test'))selfTest();
else if(process.argv.includes('--collect'))await collect();
else throw Error('Use --self-test or explicit --collect');
