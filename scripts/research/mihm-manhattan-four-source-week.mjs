// Public, aggregate-only four-domain Manhattan development-week join.
// Use --self-test offline or --collect for one explicitly authorized read.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const START='2026-03-01T00:00:00',END='2026-03-08T00:00:00';
const DAYS=Array.from({length:7},(_,i)=>'2026-03-0'+(i+1));
const SPECS=[
 {id:'311',api:'https://data.cityofnewyork.us/resource/erm2-nwe9.json',
  where:"created_date >= '"+START+"' AND created_date < '"+END+"' AND borough = 'MANHATTAN'",
  select:'date_trunc_ymd(created_date) as day,count(*) as value',
  group:'day',unit:'service_requests'},
 {id:'FDNY',api:'https://data.cityofnewyork.us/resource/8m42-w767.json',
  where:"incident_datetime >= '"+START+"' AND incident_datetime < '"+END+"' AND incident_borough = 'MANHATTAN'",
  select:'date_trunc_ymd(incident_datetime) as day,count(*) as value',
  group:'day',unit:'dispatch_events'},
 {id:'MTA',api:'https://data.ny.gov/resource/5wq4-mkjj.json',
  where:"transit_timestamp >= '"+START+"' AND transit_timestamp < '"+END+"' AND borough = 'Manhattan' AND transit_mode = 'subway'",
  select:'date_trunc_ymd(transit_timestamp) as day,sum(ridership) as value',
  group:'day',unit:'estimated_subway_entries'},
 {id:'DOT',api:'https://data.cityofnewyork.us/resource/6a2s-2t65.json',
  where:"median_calculation_timestamp >= '"+START+"' AND median_calculation_timestamp < '"+END+"' AND borough = 'Manhattan'",
  select:'date_trunc_ymd(median_calculation_timestamp) as day,avg(median_speed_fps) as value',
  group:'day',unit:'unweighted_sample_speed_fps'}
];
function query(x){
  const u=new URL(x.api);
  for(const [k,v] of Object.entries({'$select':x.select,'$where':x.where,
    '$group':x.group,'$order':'day ASC','$limit':'16'}))u.searchParams.set(k,v);
  return u.toString();
}
function normalize(x,raw){
  if(!Array.isArray(raw)||raw.length>16)throw Error('BOUNDED_AGGREGATE_ROWS');
  const values=new Map();
  for(const r of raw){
    const day=String(r.day??'').slice(0,10),v=Number(r.value);
    if(!DAYS.includes(day))throw Error('OUT_OF_TRAINING_WEEK');
    if(!Number.isFinite(v)||v<0)throw Error('INVALID_MEASUREMENT');
    if(values.has(day))throw Error('DUPLICATE_DAY');
    values.set(day,v);
  }
  return {source:x.id,unit:x.unit,values,
    missing:DAYS.filter(d=>!values.has(d))};
}
async function boundedRead(spec){
  const url=query(spec),response=await fetch(url,{signal:AbortSignal.timeout(35000),
    headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('HTTP_'+response.status);
  if(Number(response.headers.get('content-length')||0)>160000)throw Error('TOO_MANY_BYTES');
  const data=Buffer.from(await response.arrayBuffer());
  if(data.length>160000)throw Error('TOO_MANY_BYTES');
  const parsed=normalize(spec,JSON.parse(data.toString('utf8')));
  return {...parsed,sha256:createHash('sha256').update(data).digest('hex'),
    bytes:data.length};
}
function validate(source){
  assert.equal(normalize(source,[{day:'2026-03-01T00:00:00',value:'3'}]).missing.length,6);
  assert.throws(()=>normalize(source,[{day:'2026-09-01',value:'42'}]),/OUT_OF_TRAINING_WEEK/);
  assert.throws(()=>normalize(source,[{day:'2026-03-01',value:'NaN'}]),/INVALID_MEASUREMENT/);
  assert.throws(()=>normalize(source,[{day:'2026-03-01',value:'3'},{day:'2026-03-01',value:'4'}]),/DUPLICATE_DAY/);
}
if(process.argv.includes('--self-test')){
  for(const s of SPECS){validate(s);assert(query(s).includes('2026-03-01'))}
  const fixture=JSON.parse(readFileSync('docs/research/evidence/MIHM-MANHATTAN-FOUR-SOURCE-2026-03-01.json','utf8'));
  assert.equal(fixture.contract,'MIHM-MANHATTAN-FOUR-SOURCE-WEEK-0.1');
  assert.deepEqual(fixture.rows.map(r=>r.day),DAYS,'recorded source dates are consecutive');
  assert.equal(fixture.admissibility.predictiveValidation,'NOT_PERFORMED');
  for(const spec of SPECS){
    assert.equal(fixture.sourceResponses[spec.id].unit,spec.unit);
    assert(/^[a-f0-9]{64}$/.test(fixture.sourceResponses[spec.id].sha256));
    for(const row of fixture.rows)assert(Number.isFinite(row[spec.id])&&row[spec.id]>=0);
  }
  console.log(JSON.stringify({status:'SYNTHETIC_FOUR_SOURCE_JOIN_TEST_PASS',
    recordedAggregateDays:fixture.rows.length,independentPrediction:false}));
}else if(process.argv.includes('--collect')){
  const results=[];
  for(const spec of SPECS){
    try{results.push(await boundedRead(spec))}
    catch(e){results.push({source:spec.id,error:String(e),missing:DAYS})}
  }
  const ready=results.every(r=>r.values instanceof Map&&r.missing.length===0);
  const output={
    contract:'MIHM-MANHATTAN-FOUR-SOURCE-WEEK-0.1',
    scope:'Manhattan, March 1-7 2026',
    status:ready?'DAILY_AGGREGATE_PANEL_OBSERVED':'INDETERMINATE',
    sources:results.map(r=>({source:r.source,unit:r.unit||null,
      days:r.values?.size||0,missing:r.missing,sha256:r.sha256||null,error:r.error||null})),
    rows:ready?DAYS.map(day=>({day,...Object.fromEntries(results.map(r=>[r.source,r.values.get(day)]))})):[],
    sourceVintage:'HISTORICAL_AS_OF_T0_UNKNOWN',
    confidence:'NO_PREDICTIVE_VALIDATION',sourceRecordDownloaded:false
  };
  console.log(JSON.stringify(output,null,2));
}else throw Error('Use --self-test or explicit --collect');
