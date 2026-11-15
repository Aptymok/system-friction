/**
 * MIHM Foundation 365-day retrospective source collector.
 * One bounded source request each. Aggregates only. Explicit --collect.
 * Read-only; no system state, source rows, addresses or credentials.
 */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const BEGIN='2025-10-01',END='2026-10-01';
const DAYS=Array.from({length:365},(_,i)=>new Date(Date.parse(BEGIN+'T12:00:00Z')+i*86400000).toISOString().slice(0,10));
assert.equal(DAYS.at(-1),'2026-09-30');
const sources=[
 {id:'NYC311',endpoint:'https://data.cityofnewyork.us/resource/erm2-nwe9.json',
  q:{$select:'date_trunc_ymd(created_date) as day,count(*) as n',
    $where:"created_date >= '"+BEGIN+"T00:00:00' AND created_date < '"+END+"T00:00:00' AND borough = 'MANHATTAN'",
    $group:'day',$order:'day ASC',$limit:'400'}},
 {id:'FDNY',endpoint:'https://data.cityofnewyork.us/resource/8m42-w767.json',
  q:{$select:'date_trunc_ymd(incident_datetime) as day,count(*) as n',
    $where:"incident_datetime >= '"+BEGIN+"T00:00:00' AND incident_datetime < '"+END+"T00:00:00' AND incident_borough = 'MANHATTAN'",
    $group:'day',$order:'day ASC',$limit:'400'}},
 {id:'MTA_CBD_CRZ',endpoint:'https://data.ny.gov/resource/sayj-mze2.json',
  q:{$select:'date,mode,count',
    $where:"date >= '"+BEGIN+"T00:00:00' AND date < '"+END+"T00:00:00' AND mode IN ('CBD Entries','CRZ Entries')",
    $order:'date ASC,mode ASC',$limit:'800'}}
];
function urlOf(s){const u=new URL(s.endpoint);for(const [k,v] of Object.entries(s.q))u.searchParams.set(k,v);return u.toString()}
function parse(s,raw){
  assert(Array.isArray(raw)&&raw.length<=800,'source response bounded');
  const has=new Map();
  for(const row of raw){
    const day=String(s.id==='MTA_CBD_CRZ'?row.date:row.day).slice(0,10);
    if(!DAYS.includes(day))throw Error('OUT_OF_STUDY_DATE '+s.id+' '+day);
    const mode=s.id==='MTA_CBD_CRZ'?String(row.mode):s.id;
    if(s.id==='MTA_CBD_CRZ'&&!['CBD Entries','CRZ Entries'].includes(mode))
      throw Error('UNEXPECTED_MTA_MODE');
    const value=Number(s.id==='MTA_CBD_CRZ'?row.count:row.n);
    if(!Number.isSafeInteger(value)||value<=0)throw Error('INVALID_COUNT '+s.id+' '+day);
    const k=day+'|'+mode;if(has.has(k))throw Error('DUPLICATE '+k);
    has.set(k,value);
  }
  const keys=s.id==='MTA_CBD_CRZ'?['CBD Entries','CRZ Entries']:[s.id];
  const missing=[];
  for(const d of DAYS)for(const k of keys)if(!has.has(d+'|'+k))missing.push(d+':'+k);
  return {source:s.id,observed:has.size,missing,values:Object.fromEntries(has)};
}
async function readOnce(s){
  const url=urlOf(s),resp=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(60000)});
  if(!resp.ok)throw Error('SOURCE_HTTP_'+resp.status);
  const size=Number(resp.headers.get('content-length')??'0');if(size>262144)throw Error('SOURCE_BYTES_HEADER_LIMIT');
  const bytes=Buffer.from(await resp.arrayBuffer());if(bytes.length>262144)throw Error('SOURCE_BYTES_LIMIT');
  const parsed=parse(s,JSON.parse(bytes.toString('utf8')));
  return {...parsed,queryUrl:url,sourceResponseSha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
}
function trial(){
  assert.equal(DAYS.length,365);assert.equal(DAYS[0],'2025-10-01');assert.equal(DAYS.at(-1),'2026-09-30');
  for(const s of sources){
    assert(urlOf(s).includes('2025-10-01')&&urlOf(s).includes('2026-10-01'));
    const modes=s.id==='MTA_CBD_CRZ'?['CBD Entries','CRZ Entries']:[s.id];
    const rows=DAYS.flatMap(d=>modes.map(mode=>s.id==='MTA_CBD_CRZ'?
      {date:d+'T00:00:00',mode,count:'10'}:{day:d+'T00:00:00',n:'10'}));
    const p=parse(s,rows);assert.equal(p.missing.length,0);
    assert.throws(()=>parse(s,[rows[0],rows[0]]),/DUPLICATE/);
    assert.throws(()=>parse(s,[{...rows[0],...(s.id==='MTA_CBD_CRZ'?{date:'2026-10-03'}:{day:'2026-10-03'})}]),/OUT_OF_STUDY_DATE/);
  }
  console.log(JSON.stringify({status:'SYNTHETIC_365_DAY_BOUNDARY_PASS',externalData:false}));
}
async function collect(){
  const responses=[],failures=[];
  for(const s of sources){
    try{responses.push(await readOnce(s))}
    catch(e){failures.push({source:s.id,error:String(e)})}
  }
  const success=responses.length===sources.length&&responses.every(r=>r.missing.length===0);
  const sourceById=Object.fromEntries(responses.map(r=>[r.source,r]));
  const panel=success?DAYS.map(day=>({
    day,
    service311:sourceById.NYC311.values[day+'|NYC311'],
    fdnyCount:sourceById.FDNY.values[day+'|FDNY'],
    cbdEntries:sourceById.MTA_CBD_CRZ.values[day+'|CBD Entries'],
    crzEntries:sourceById.MTA_CBD_CRZ.values[day+'|CRZ Entries']
  })):[];
  console.log(JSON.stringify({
    contract:'MIHM-MANHATTAN-365D-RETROSPECTIVE-SOURCE-0.1',
    status:success?'COMPLETE_OBSERVED_PANEL':'INDETERMINATE_ABSTAIN',
    dataAsOf:'EXTRACTED_2026-10-25_OR_LATER_NOT_AS_OF_EACH_EVENT_DAY',
    geography:{service311:'Manhattan borough',fdnyCount:'Manhattan borough',
      cbdEntries:'CBD road entrance zone',crzEntries:'nested CRZ toll zone'},
    sourceReads:responses.map(({source,observed,missing,sourceResponseSha256,bytes,queryUrl})=>
      ({source,observed,missing,sourceResponseSha256,bytes,queryUrl})),
    failures,panel,notHistoricalProspectiveForecast:true,
    notCausalProof:true,
    scientificValue:success?'SOURCE_COVERAGE_ONLY_NO_MODEL_YET':'NO_SCIENTIFIC_COMPARISON'
  },null,2));
}
/**
 * Source-only MIHM P4 T0 snapshot. This REUSES the same official
 * source collector and URLs. It is never a forecast or a source-vintage
 * certificate. No DB writes, no personal records; the workflow owns scheduling.
 */
function p4NycWindow(now=new Date()){
  // The source's created_date is a New York civil-day observation. Select
  // only days completed in NYC, even when the UTC date is already tomorrow.
  const nyParts=Object.fromEntries(
    new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
      year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now)
      .filter(p=>['year','month','day'].includes(p.type)).map(p=>[p.type,p.value]));
  const todayNy=`${nyParts.year}-${nyParts.month}-${nyParts.day}`;
  const dayMs=86400000;
  const runDay=Date.parse(todayNy+'T00:00:00Z');
  if(!Number.isFinite(runDay))throw Error('NYC_CALENDAR_DAY_NOT_RESOLVED');
  // Source extraction bound only, never a learned MIHM coefficient.
  const lookbackDays=14;
  const need=Array.from({length:lookbackDays},(_,i)=>
    new Date(runDay-(lookbackDays-i)*dayMs).toISOString().slice(0,10));
  const begin=need[0],end=todayNy;
  if(need.length!==lookbackDays||need.at(-1)>=end||
    need.some((d,i)=>i>0&&Date.parse(d+'T00:00:00Z')-
      Date.parse(need[i-1]+'T00:00:00Z')!==dayMs))
    throw Error('NYC_P4_WINDOW_VALIDATION_FAILED');
  return {begin,end,need,calendar:'America/New_York',lookbackDays};
}
async function collectP4Nyc(){
  const {begin,end,need,calendar,lookbackDays}=p4NycWindow();
  const trials=[
    {id:'NYC311',endpoint:'https://data.cityofnewyork.us/resource/erm2-nwe9.json',
      query:{$select:'date_trunc_ymd(created_date) as day,count(*) as n',
       $where:"created_date >= '"+begin+"T00:00:00' AND created_date < '"+end+"T00:00:00' AND borough = 'MANHATTAN'",
       $group:'day',$order:'day ASC',$limit:'20'}},
    {id:'MTA_CBD',endpoint:'https://data.ny.gov/resource/sayj-mze2.json',
      query:{$select:'date,mode,count',
       $where:"date >= '"+begin+"T00:00:00' AND date < '"+end+"T00:00:00' AND mode = 'CBD Entries'",
       $order:'date ASC',$limit:'20'}}
  ];
  const records=[],failures=[];
  for(const trial of trials){
    try{
      const u=new URL(trial.endpoint);
      for(const [key,value] of Object.entries(trial.query))u.searchParams.set(key,value);
      const fetchStartedAt=new Date().toISOString();
      const resp=await fetch(u,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(25000)});
      if(!resp.ok)throw Error('SOURCE_HTTP_'+resp.status);
      const bytes=Buffer.from(await resp.arrayBuffer());
      if(!bytes.length||bytes.length>70000)throw Error('BOUNDED_RESPONSE_BYTES_INVALID');
      const data=JSON.parse(bytes.toString('utf8'));
      if(!Array.isArray(data)||data.length>20)throw Error('UNEXPECTED_SOURCE_ARRAY');
      const values={},seen=new Set(),missingValues=[];
      for(const row of data){
        const day=String(trial.id==='NYC311'?row.day:row.date).slice(0,10);
        if(day<begin||day>=end||seen.has(day))throw Error('OUT_OF_RANGE_OR_DUPLICATE');
        if(trial.id==='MTA_CBD'&&row.mode!=='CBD Entries')throw Error('MODE_MISMATCH');
        seen.add(day);
        const rawValue=trial.id==='NYC311'?row.n:row.count;
        if(rawValue===null||rawValue===undefined||rawValue===''){
          missingValues.push(day);
          continue;
        }
        const value=Number(rawValue);
        if(!Number.isSafeInteger(value)||value<=0)throw Error('INVALID_AGGREGATE');
        values[day]=value;
      }
      const missing=need.filter(day=>!Object.hasOwn(values,day));
      const capturedAt=new Date().toISOString();
      records.push({
        sourceId:trial.id,queryUrl:u.toString(),sourceBodyUtf8:bytes.toString('utf8'),
        responseSha256:createHash('sha256').update(bytes).digest('hex'),
        bytes:bytes.length,fetchStartedAt,capturedAt,
        httpDateHeader:resp.headers.get('date'),unit:trial.id==='NYC311'?'service_request_records/day':'estimated_vehicle_entries/day',
        values,missing,missingValues,
        clockBoundary:'Available at fetch; not proof of original publication at each event date',
      });
    }catch(e){failures.push({source:trial.id,error:String(e)});}
  }
  // A late second publisher must never erase a first publisher's observed
  // response. Count complete sources separately; publish degradation as data.
  const completeSourceIds=records.filter(r=>r.missing.length===0&&r.missingValues.length===0)
    .map(r=>r.sourceId);
  const status=completeSourceIds.length===trials.length&&failures.length===0?
    'OBSERVED_SOURCE_SNAPSHOT_CANDIDATE':
    completeSourceIds.length>0?'PARTIAL_OBSERVED_SOURCE_SNAPSHOT':
      'BLOCKED_SOURCE_GAPS_OR_PROVIDER_UNAVAILABLE';
  const receipt={
    contract:'SFI-MIHM-P4-OFFICIAL-PUBLIC-SNAPSHOT-0.1',status,
    extractionPolicy:'LAST_14_COMPLETED_NEW_YORK_CIVIL_DAYS_NOT_A_CALIBRATED_THRESHOLD',
    civilDayTimezone:calendar,lookbackDays,
    studyWindow:{begin,end,requiredDays:need},records,failures,
    completeSourceIds,sourceCountExpected:trials.length,
    missingSourceIds:trials.map(t=>t.id).filter(id=>!completeSourceIds.includes(id)),
    prospectiveSourceAdmissibility:'REQUIRES_SEPARATE_T0_PROVIDER_VINTAGE_VERIFICATION',
    sourceOriginalReleaseTimesIndependentlyVerified:false,
    sourceResponsesCapturedAtFetch:true,
    prospectivePredictionIssued:false,
    externalOutcomeObserved:false,
    canonicalPhiChanged:false,
    productionMutation:false,
  };
  console.log('MIHM_P4_SOURCE_SNAPSHOT_JSON='+JSON.stringify(receipt));
  if(process.env.RUNNER_TEMP)writeFileSync(process.env.RUNNER_TEMP+'/mihm-p4-nyc-source.json',JSON.stringify(receipt,null,2)+'\n');
  // A complete single-source response is real source evidence, not a
  // complete paired forecast input. Only zero complete sources is fatal;
  // all degraded publishers remain visible in the persisted artifact.
  if(status==='BLOCKED_SOURCE_GAPS_OR_PROVIDER_UNAVAILABLE')process.exitCode=1;
}

if(process.argv.includes('--collect-p4-nyc'))await collectP4Nyc();
else if(process.argv.includes('--p4-window-check'))
  console.log(JSON.stringify({contract:'MIHM_P4_LIVE_CALENDAR_PREFLIGHT',
    window:p4NycWindow(),syntheticData:false,predictionIssued:false}));
else if(process.argv.includes('--self-test'))trial();
else if(process.argv.includes('--collect'))await collect();
else throw Error('Use --self-test or explicit --collect');
