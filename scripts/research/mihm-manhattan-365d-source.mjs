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
 * One-shot, source-only MIHM P4 T0 snapshot. This REUSES the same official
 * source collector and URLs. It is never a forecast or a source-vintage
 * certificate. No automatic scheduler, no DB writes, no personal records.
 */
async function collectP4Nyc(){
  const begin='2026-10-20',end='2026-10-30',need=['2026-10-21','2026-10-23','2026-10-28'];
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
      const values={},seen=new Set();
      for(const row of data){
        const day=String(trial.id==='NYC311'?row.day:row.date).slice(0,10);
        if(day<begin||day>=end||seen.has(day))throw Error('OUT_OF_RANGE_OR_DUPLICATE');
        if(trial.id==='MTA_CBD'&&row.mode!=='CBD Entries')throw Error('MODE_MISMATCH');
        const value=Number(trial.id==='NYC311'?row.n:row.count);
        if(!Number.isSafeInteger(value)||value<=0)throw Error('INVALID_AGGREGATE');
        seen.add(day);values[day]=value;
      }
      const missing=need.filter(day=>!seen.has(day));
      const capturedAt=new Date().toISOString();
      records.push({
        sourceId:trial.id,queryUrl:u.toString(),sourceBodyUtf8:bytes.toString('utf8'),
        responseSha256:createHash('sha256').update(bytes).digest('hex'),
        bytes:bytes.length,fetchStartedAt,capturedAt,
        httpDateHeader:resp.headers.get('date'),unit:trial.id==='NYC311'?'service_request_records/day':'estimated_vehicle_entries/day',
        values,missing,
        clockBoundary:'Available at fetch; not proof of original publication at each event date',
      });
    }catch(e){failures.push({source:trial.id,error:String(e)});}
  }
  const status=records.length===2&&failures.length===0&&records.every(r=>r.missing.length===0)?
    'OBSERVED_SOURCE_SNAPSHOT_CANDIDATE':'BLOCKED_SOURCE_GAPS_OR_PROVIDER_UNAVAILABLE';
  const receipt={
    contract:'SFI-MIHM-P4-OFFICIAL-PUBLIC-SNAPSHOT-0.1',status,
    studyWindow:{begin,end,requiredDays:need},records,failures,
    sourceOriginalReleaseTimesIndependentlyVerified:false,
    sourceResponsesCapturedAtFetch:true,
    prospectivePredictionIssued:false,
    externalOutcomeObserved:false,
    canonicalPhiChanged:false,
    productionMutation:false,
  };
  console.log('MIHM_P4_SOURCE_SNAPSHOT_JSON='+JSON.stringify(receipt));
  if(process.env.RUNNER_TEMP)writeFileSync(process.env.RUNNER_TEMP+'/mihm-p4-nyc-source.json',JSON.stringify(receipt,null,2)+'\n');
}

if(process.argv.includes('--collect-p4-nyc'))await collectP4Nyc();
else if(process.argv.includes('--self-test'))trial();
else if(process.argv.includes('--collect'))await collect();
else throw Error('Use --self-test or explicit --collect');
