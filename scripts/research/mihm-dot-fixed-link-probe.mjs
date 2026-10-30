/**
 * MIHM Manhattan research: opt-in, bounded DOT fixed-link acquisition preflight.
 *
 * This is LINK-LEVEL evidence only. Do not replace an all-Manhattan road metric
 * with a convenience sample or promote correlations as MIHM causal relations.
 *
 * --self-test : no network, synthetic guard tests.
 * --probe     : one bounded public DOT development-day link-ID sample, at most
 *               two deterministic link-specific 7-day source aggregates.
 * No database, raw incident/personal data, production write or as-of claim.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const API='https://data.cityofnewyork.us/resource/6a2s-2t65.json';
const SAMPLE_START='2026-03-02T00:00:00';
const SAMPLE_END='2026-03-03T00:00:00';
const WEEK_START='2026-03-01T00:00:00';
const WEEK_END='2026-03-08T00:00:00';
const DAYS=Array.from({length:7},(_,i)=>'2026-03-0'+(i+1));
const VERSION='MIHM-DOT-FIXED-LINK-DEV-PROBE-0.1';

function apiUrl(select,where,group=null,limit=64){
  const u=new URL(API);
  const parts={'$select':select,'$where':where,'$limit':String(limit)};
  if(group){parts.$group=group;parts.$order='day ASC';}
  for(const [k,v] of Object.entries(parts))u.searchParams.set(k,v);
  return u.toString();
}
function candidateUrl(){
  // Raw roadway-link speed measures only, no individual incident or location.
  // A first-page convenience sample, explicitly NONREPRESENTATIVE.
  return apiUrl(
    'sid,link_name,median_calculation_timestamp,median_speed_fps,n_samples',
    "borough = 'Manhattan' AND median_calculation_timestamp >= '"+SAMPLE_START+
    "' AND median_calculation_timestamp < '"+SAMPLE_END+
    "' AND median_speed_fps > 0 AND n_samples > 0",null,40);
}
function linkUrl(sid){
  assert(/^[0-9]{1,12}$/.test(String(sid)),'Numeric DOT SID required');
  return apiUrl(
    'date_trunc_ymd(median_calculation_timestamp) as day, count(*) as readings, '+
    'sum(n_samples) as samples, avg(median_speed_fps) as unweighted_fps, '+
    'sum(median_speed_fps * n_samples) / sum(n_samples) as sample_weighted_fps',
    "borough = 'Manhattan' AND sid = "+sid+
    " AND median_calculation_timestamp >= '"+WEEK_START+
    "' AND median_calculation_timestamp < '"+WEEK_END+
    "' AND median_speed_fps > 0 AND n_samples > 0",
    'day',16);
}
function selectLinks(rows){
  assert(Array.isArray(rows)&&rows.length<=40,'Unexpected source sample size');
  const valid=[];
  for(const row of rows){
    const sid=String(row.sid??''),v=Number(row.median_speed_fps),n=Number(row.n_samples);
    const d=String(row.median_calculation_timestamp??'').slice(0,10);
    if(!/^[0-9]{1,12}$/.test(sid)||!Number.isFinite(v)||v<=0||
       !Number.isFinite(n)||n<=0||d!=='2026-03-02')continue;
    valid.push({sid,linkName:String(row.link_name??'').slice(0,180)});
  }
  return [...new Map(valid.map(x=>[x.sid,x])).values()]
    .sort((a,b)=>Number(a.sid)-Number(b.sid)).slice(0,2);
}
function auditLink(rows,sid){
  assert(Array.isArray(rows)&&rows.length<=16,'Bounded aggregate response');
  const byDate=new Map();
  for(const r of rows){
    const day=String(r.day??'').slice(0,10);
    if(!DAYS.includes(day))throw Error('TIME_LEAK_OR_WRONG_DATE');
    if(byDate.has(day))throw Error('DUPLICATE_LINK_DAY');
    const n=Number(r.readings),sample=Number(r.samples),
      speed=Number(r.unweighted_fps),weighted=Number(r.sample_weighted_fps);
    if(!Number.isInteger(n)||n<=0||!Number.isFinite(sample)||sample<n||
       !Number.isFinite(speed)||speed<=0||!Number.isFinite(weighted)||weighted<=0)
      throw Error('INVALID_DOT_AGGREGATION');
    byDate.set(day,{readings:n,samples:sample,unweightedFps:speed,sampleWeightedFps:weighted});
  }
  return {sid,coveredDays:byDate.size,missingDays:DAYS.filter(d=>!byDate.has(d)),
    readings:[...byDate.values()].reduce((n,v)=>n+v.readings,0),
    observations:Object.fromEntries(byDate),spatialUnit:'FIXED_DOT_LINK_NOT_ALL_MANHATTAN',
    representativeManhattanSpeed:false};
}
async function bounded(url,ms){
  const resp=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(ms)});
  if(!resp.ok)throw Error('DOT_HTTP_'+resp.status);
  if(Number(resp.headers.get('content-length')??'0')>150000)throw Error('BYTES_BUDGET');
  const raw=Buffer.from(await resp.arrayBuffer());
  if(raw.length>150000)throw Error('BYTES_BUDGET');
  return {rows:JSON.parse(raw.toString('utf8')),
    sha256:createHash('sha256').update(raw).digest('hex'),
    bytes:raw.length};
}
function offline(){
  assert(candidateUrl().includes('2026-03-02'));
  assert(linkUrl(123).includes('sid+%3D+123'));
  assert.throws(()=>linkUrl('1 OR 1=1'),/SID/);
  const links=selectLinks([
    {sid:'132',link_name:'Test Road A',median_calculation_timestamp:'2026-03-02T11:00:00',
      median_speed_fps:'12',n_samples:'3'},
    {sid:'12',link_name:'Test Road B',median_calculation_timestamp:'2026-03-02T12:00:00',
      median_speed_fps:'10',n_samples:'2'},
    {sid:'12',link_name:'Test Road B',median_calculation_timestamp:'2026-03-02T13:00:00',
      median_speed_fps:'10',n_samples:'2'}]);
  assert.deepEqual(links.map(x=>x.sid),['12','132']);
  const x=auditLink([{day:'2026-03-02T00:00:00',readings:'3',samples:'12',
    unweighted_fps:'10',sample_weighted_fps:'11.5'}],'12');
  assert.equal(x.coveredDays,1);assert.equal(x.missingDays.length,6);
  assert(x.representativeManhattanSpeed===false);
  assert.throws(()=>auditLink([{day:'2026-07-02T00:00:00',readings:'3',samples:'12',
    unweighted_fps:'10',sample_weighted_fps:'11.5'}],'12'),/TIME_LEAK/);
  assert.throws(()=>auditLink([{day:'2026-03-02T00:00:00',readings:'3',samples:'1',
    unweighted_fps:'10',sample_weighted_fps:'11.5'}],'12'),/INVALID_DOT/);
  const evidence=JSON.parse(readFileSync(
    'docs/research/evidence/MIHM-MANHATTAN-DOT-SID4001-2026-03-01.json','utf8'));
  assert.equal(evidence.contract,'MIHM-MANHATTAN-DOT-FIXED-LINK-EVIDENCE-0.1');
  assert.equal(evidence.link.sid,'4001');
  assert.equal(evidence.daysCovered,7);
  assert.deepEqual(Object.keys(evidence.daily),DAYS);
  assert.equal(evidence.totalReadings,8533);
  assert.equal(evidence.limits.trueSpatialRepresentativeness,false);
  assert.equal(evidence.limits.predictiveSkillDemonstrated,false);
  assert.equal(evidence.limits.asOfT0Verified,false);
  assert(/^[a-f0-9]{64}$/.test(evidence.provenance.rawResponseSha256));
  const daily=Object.values(evidence.daily);
  assert.equal(daily.reduce((n,r)=>n+r.readings,0),evidence.totalReadings);
  for(const r of daily){
    assert(r.samples>=r.readings);
    assert(r.unweightedFps>0&&r.sampleWeightedFps>0);
  }
  console.log(JSON.stringify({status:'DOT_LINK_PROBE_OFFLINE_TEST_PASS',
    realSourceAccess:false,independentValidation:false}));
}
async function probe(){
  const out={protocol:VERSION,geography:'Manhattan-labelled DOT links',
    interval:[DAYS[0],DAYS.at(-1)],scientificStatus:'SOURCE_FEASIBILITY_ONLY',
    sampling:'FIRST_40_MATCHING_DEVELOPMENT_DAY_READINGS_NONPROBABILITY',
    observationVintage:'AS_OF_EVENT_DAY_UNKNOWN',
    crossDomainPanelAdmitted:false,results:[],errors:[]};
  let selected;
  try{
    const response=await bounded(candidateUrl(),22000);
    selected=selectLinks(response.rows);
    out.candidateRead={sha256:response.sha256,bytes:response.bytes,
      selectedCount:selected.length,matchingReadings:response.rows.length,
      sourceQuery:candidateUrl()};
  }catch(e){out.errors.push({phase:'CANDIDATE_SAMPLE',error:String(e)});
    out.status='INDETERMINATE';console.log(JSON.stringify(out,null,2));return;}
  for(const link of selected){
    try{
      const u=linkUrl(link.sid),response=await bounded(u,20000);
      out.results.push({...auditLink(response.rows,link.sid),linkName:link.linkName,
        responseSha256:response.sha256,queryUrl:u,responseBytes:response.bytes});
    }catch(e){out.errors.push({phase:'LINK_WEEK',sid:link.sid,error:String(e)})}
  }
  out.status=out.results.length&&out.errors.length===0?'LINK_LEVEL_OBSERVED':
    'INDETERMINATE';
  out.fourSourceMonthlyPanelReady=false;
  console.log(JSON.stringify(out,null,2));
}
if(process.argv.includes('--self-test'))offline();
else if(process.argv.includes('--probe'))await probe();
else throw Error('Use --self-test or explicit --probe');
