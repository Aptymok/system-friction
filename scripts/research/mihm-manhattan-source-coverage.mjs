// Development-only coverage probe. Aggregate-only, no raw incidents or stations.
const windowStart='2026-03-01T00:00:00', windowEnd='2026-03-08T00:00:00';
const jobs=[
 {id:'MTA',host:'https://data.ny.gov/resource/5wq4-mkjj.json',
  date:'transit_timestamp',measure:'sum(ridership) as total_entries',
  group:'date_trunc_ymd(transit_timestamp),borough,transit_mode',
  select:'date_trunc_ymd(transit_timestamp) as day,borough,transit_mode,sum(ridership) as total_entries,count(*) as observations',
  filter:" AND transit_mode = 'subway'",limit:500},
 {id:'DOT',host:'https://data.cityofnewyork.us/resource/6a2s-2t65.json',
  date:'median_calculation_timestamp',measure:'avg(median_speed_fps) as sample_mean_fps',
  group:'date_trunc_ymd(median_calculation_timestamp),borough',
  select:'date_trunc_ymd(median_calculation_timestamp) as day,borough,avg(median_speed_fps) as sample_mean_fps,count(*) as observations',
  filter:'',limit:500}
];
function urlOf(job){
  const u=new URL(job.host);
  for(const [k,v] of Object.entries({
    '$select':job.select,
    '$where':job.date+" >= '"+windowStart+"' AND "+job.date+" < '"+windowEnd+"' AND borough = 'Manhattan'"+job.filter,
    '$group':job.group,'$order':'day ASC','$limit':String(job.limit)
  }))u.searchParams.set(k,v);
  return u.toString();
}
function audit(job,rows){
  if(!Array.isArray(rows)||rows.length>job.limit)throw Error('INVALID_AGGREGATION');
  const dates=[...new Set(rows.map(r=>String(r.day).slice(0,10)))].sort();
  if(dates.some(d=>d<'2026-03-01'||d>'2026-03-07'))throw Error('OUTSIDE_TRAINING_WINDOW');
  const invalid=rows.filter(r=>!Number.isFinite(Number(job.id==='MTA'?r.total_entries:r.sample_mean_fps)));
  return {source:job.id,scope:'MANHATTAN_DEVELOPMENT_ONLY',
    days:dates.length,aggregateRows:rows.length,
    missingDays:Array.from({length:7},(_,i)=>'2026-03-0'+(i+1)).filter(d=>!dates.includes(d)),
    invalidValues:invalid.length,sourceVintage:'UNVERIFIED',
    hasRawSourceRows:false,validation:'SCHEMA_AND_COVERAGE_ONLY'};
}
function test(){
  for(const j of jobs){const u=urlOf(j);if(!u.includes('2026-03-01'))throw Error('DATE_FILTER');}
  const example=[{day:'2026-03-01T00:00:00',total_entries:'50'}];
  if(audit(jobs[0],example).missingDays.length!==6)throw Error('MISSINGNESS_FAIL');
  if(audit(jobs[1],[{day:'2026-03-01T00:00:00',sample_mean_fps:'12'}]).invalidValues!==0)throw Error('UNIT_FAIL');
  console.log(JSON.stringify({status:'OFFLINE_COVERAGE_TEST_PASS',externalEvidence:false}));
}
async function probe(){
  const results=[];
  for(const j of jobs){
    try{
      const u=urlOf(j);
      const r=await fetch(u,{signal:AbortSignal.timeout(30000)});
      if(!r.ok)throw Error('HTTP_'+r.status);
      const data=await r.text();
      if(data.length>200000)throw Error('RESPONSE_TOO_LARGE');
      results.push(audit(j,JSON.parse(data)));
    }catch(e){results.push({source:j.id,status:'INDETERMINATE',error:String(e)})}
  }
  console.log(JSON.stringify({scope:'2026-03-01/07',mode:'READ_ONLY_AGGREGATE_PROBE',results},null,2));
}
if(process.argv.includes('--self-test'))test();
else if(process.argv.includes('--probe'))await probe();
else throw Error('Explicit --self-test or --probe only');
