/**
 * MIHM F2: load / response / conditional recovery pilot (EXPLORATORY).
 *  - Source: official NYC FDNY 8m42-w767, aggregated daily and borough only.
 *  - Outcome: Manhattan next-day mean *valid* first-unit response time (seconds).
 *  - Features: prior FDNY dispatch load and prior FDNY measured response, NEVER t outcome.
 *  - This is NOT canonical MIHM, causal identification, service-level certification,
 *    real-time prospective as-of-event prediction or a registered scientific test.
 * Usage:
 *   node scripts/research/mihm-fdny-capacity-contrast.mjs --self-test
 *   node scripts/research/mihm-fdny-capacity-contrast.mjs --fetch
 * No network access in self-test. --fetch does two bounded Socrata aggregate reads.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const BOROUGHS=['MANHATTAN','BRONX','BROOKLYN','QUEENS','STATEN ISLAND'];
const ENDPOINT='https://data.cityofnewyork.us/resource/8m42-w767.json';
const WHERE="incident_datetime >= '2025-07-01T00:00:00' AND incident_datetime < '2026-07-01T00:00:00' AND incident_borough IS NOT NULL";
const ALPHAS=[1,10,100,1000,10000], avg=a=>a.reduce((s,v)=>s+v,0)/a.length;
const sha=s=>createHash('sha256').update(s).digest('hex');

function urlFor(valid){
  const u=new URL(ENDPOINT);
  u.searchParams.set('$select', 'date_trunc_ymd(incident_datetime) as day, incident_borough as borough, count(*) as n'+
    (valid?', avg(incident_response_seconds_qy) as response_sec':''));
  const clause=valid?" AND valid_incident_rspns_time_indc = 'Y' AND incident_response_seconds_qy >= 60 AND incident_response_seconds_qy <= 7200":'';
  u.searchParams.set('$where',WHERE+clause);
  u.searchParams.set('$group','day, borough');
  u.searchParams.set('$order','day ASC, borough ASC');
  u.searchParams.set('$limit','5000');
  return u.toString();
}
function dates(){
  return Array.from({length:365},(_,i)=>new Date(Date.parse('2025-07-01T12:00:00Z')+i*86400000).toISOString().slice(0,10));
}
function normalize(x){
  const b=String(x||'').trim().toUpperCase();
  return b==='RICHMOND' || b==='RICHMOND / STATEN ISLAND'?'STATEN ISLAND':b;
}
function parseAggregates(raw,expected,valid){
  assert(Array.isArray(raw)&&raw.length<=5000,'bounded source rows');
  const m=new Map(expected.map(d=>[d,new Map()]));
  for(const row of raw){
    const day=String(row.day||'').slice(0,10),bor=normalize(row.borough);
    assert(m.has(day),'no dates outside fixed boundary');
    assert(BOROUGHS.includes(bor),'unknown borough');
    assert(!m.get(day).has(bor),'no duplicated day/b');
    const n=Number(row.n),secs=Number(row.response_sec);
    assert(Number.isInteger(n)&&n>0,'positive observations');
    if(valid)assert(Number.isFinite(secs)&&secs>=60&&secs<=7200,'response units and eligibility');
    m.get(day).set(bor,{n,secs:valid?secs:null});
  }
  const missing=[];
  const values=expected.map(d=>BOROUGHS.map(b=>{
    const row=m.get(d).get(b);
    if(!row){missing.push(d+':'+b);return null;}
    return row;
  }));
  if(missing.length)throw Error('INSUFFICIENT_SOURCE_COVERAGE missing '+missing.length+' '+missing.slice(0,3).join(','));
  return values;
}
function quantile(sorted,p){const idx=Math.floor((sorted.length-1)*p);return sorted[idx];}
function rows(days,counts,eligible){
  const load=counts.map(a=>a[0].n),y=eligible.map(a=>a[0].secs);
  const TRAIN_CUTOFF=250, p90=quantile([...load.slice(0,TRAIN_CUTOFF)].sort((a,b)=>a-b),0.9);
  assert(p90>0);
  const records=[];
  for(let t=28;t<365;t++){
    const d=new Date(days[t]+'T12:00:00Z').getUTCDay();
    const weekday=Array.from({length:6},(_,i)=>Number(d===i));
    const core=[...weekday,Math.log1p(y[t-1]),Math.log1p(y[t-7]),Math.log1p(y[t-14]),
      Math.log1p(avg(y.slice(t-7,t))),Math.log1p(load[t-1]),Math.log1p(load[t-7]),
      Math.log1p(avg(load.slice(t-7,t)))];
    // M0 is the competent conventional candidate with matched FDNY measurements
    // and ordinary flexible lag differences, rather than a deliberately weak baseline.
    const prev=Math.log1p(load[t-1]), prior=Math.log1p(load[t-7]);
    const m0=[...core,prev*prev,prev-prior,(prev-prior)**2,
      Math.log1p(y[t-1])*prev,Math.log1p(y[t-7])*prior];
    const stress=k=>Math.max(0,(load[k]-p90)/p90);
    const s1=stress(t-1),s2=stress(t-2),s7=avg(Array.from({length:7},(_,i)=>stress(t-1-i)));
    // F2 operational hypothesis: predeclared volume pressure, cumulative exposure and
    // stress release add task-relevant information to a matched nonlinear time-series model.
    const f2=[s1,s7,Math.max(0,s2-s1),s1*Math.log1p(y[t-1])];
    records.push({t,day:days[t],y:y[t],m0,m1:[...m0,...f2],stress:s1});
  }
  return {records,p90,eligibleFraction:counts.map((r,i)=>eligible[i][0].n/r[0].n)};
}
function solve(A,B){
  const n=B.length,R=A.map((r,i)=>[...r,B[i]]);
  for(let k=0;k<n;k++){
    let p=k;for(let i=k+1;i<n;i++)if(Math.abs(R[i][k])>Math.abs(R[p][k]))p=i;
    [R[k],R[p]]=[R[p],R[k]];const v=R[k][k];assert(Math.abs(v)>1e-10,'ridge invertible');
    for(let j=k;j<=n;j++)R[k][j]/=v;
    for(let i=0;i<n;i++)if(i!==k){const c=R[i][k];for(let j=k;j<=n;j++)R[i][j]-=c*R[k][j];}
  }
  return R.map(a=>a[n]);
}
function fit(X,Y,alpha){
  const n=X.length,p=X[0].length,mu=Array(p).fill(0),sd=Array(p).fill(0);
  for(const x of X)for(let j=0;j<p;j++)mu[j]+=x[j]/n;
  for(const x of X)for(let j=0;j<p;j++)sd[j]+=(x[j]-mu[j])**2/n;
  for(let j=0;j<p;j++)sd[j]=Math.sqrt(sd[j])||1;
  const yy=Y.map(Math.log1p),ym=avg(yy),A=Array.from({length:p},()=>Array(p).fill(0)),B=Array(p).fill(0);
  for(let i=0;i<n;i++){
    const x=X[i].map((v,j)=>(v-mu[j])/sd[j]);
    for(let j=0;j<p;j++){B[j]+=x[j]*(yy[i]-ym);for(let k=0;k<=j;k++)A[j][k]+=x[j]*x[k];}
  }
  for(let j=0;j<p;j++){A[j][j]+=alpha;for(let k=0;k<j;k++)A[k][j]=A[j][k];}
  return {beta:solve(A,B),mu,sd,ym};
}
function predict(f,x){
  let result=f.ym;for(let i=0;i<x.length;i++)result+=f.beta[i]*(x[i]-f.mu[i])/f.sd[i];
  return Math.max(0,Math.expm1(Math.min(12,result)));
}
function scores(Y,pred){
  const e=Y.map((v,i)=>pred[i]-v);
  return {mae:avg(e.map(Math.abs)),rmse:Math.sqrt(avg(e.map(v=>v*v))),bias:avg(e)};
}
function trainModel(R,k){
  const train=R.filter(r=>r.t<250),validation=R.filter(r=>r.t>=250&&r.t<290),held=R.filter(r=>r.t>=290);
  const tuning=ALPHAS.map(alpha=>{
    const f=fit(train.map(r=>r[k]),train.map(r=>r.y),alpha);
    return {alpha,mae:scores(validation.map(r=>r.y),validation.map(r=>predict(f,r[k]))).mae};
  });
  const chosen=tuning.reduce((a,b)=>b.mae<a.mae?b:a);
  const observed=[...train,...validation],f=fit(observed.map(r=>r[k]),observed.map(r=>r.y),chosen.alpha);
  const pred=held.map(r=>predict(f,r[k]));
  return {selectedAlpha:chosen.alpha,validation:tuning,pred,metrics:scores(held.map(r=>r.y),pred)};
}
function bootstrap(d){
  let seed=20261025;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const arr=[];
  for(let rep=0;rep<1500;rep++){
    const s=[];while(s.length<d.length){const st=Math.floor(random()*(d.length-6));
      for(let j=0;j<7&&s.length<d.length;j++)s.push(d[st+j]);}
    arr.push(avg(s));
  }
  arr.sort((a,b)=>a-b);return [arr[37],arr[1462]];
}
function run(days,counts,eligible){
  const {records,p90,eligibleFraction}=rows(days,counts,eligible);
  if(eligibleFraction.some(v=>v<0.3||v>1))throw Error('INSUFFICIENT_VALID_RESPONSE_COVERAGE');
  const m0=trainModel(records,'m0'),m1=trainModel(records,'m1');
  const held=records.filter(r=>r.t>=290),diff=held.map((r,i)=>Math.abs(m0.pred[i]-r.y)-Math.abs(m1.pred[i]-r.y));
  const naive=scores(held.map(r=>r.y),held.map(r=>eligible[r.t-7][0].secs));
  return {
    status:'F2_RETROSPECTIVE_EXPLORATORY_NOT_VALIDATED',
    endpoint:'Next-day Manhattan mean valid fire first-unit response, seconds',
    window:{train:[days[28],days[249]],validation:[days[250],days[289]],test:[days[290],days[364]]},
    N:{train:222,validation:40,test:75},trainingThresholdDispatchesP90:p90,
    responseEligibilityManhattan:{min:Math.min(...eligibleFraction),mean:avg(eligibleFraction)},
    featureCounts:{conventional:records[0].m0.length,candidate:records[0].m1.length},
    naive,nonlinearConventional:{alpha:m0.selectedAlpha,...m0.metrics},
    proposedLoadConstraint:{alpha:m1.selectedAlpha,...m1.metrics},
    marginalAdvantageSecondsMAE:avg(diff),conditionalBlockBootstrap95:bootstrap(diff),
    candidateBetterDays:diff.filter(v=>v>0).length,candidateWorseDays:diff.filter(v=>v<0).length,
    limitations:[
      'Response eligibility restricts target and may induce nonrandom censoring',
      'Training-defined 90th percentile is a research stress flag, not a certified FDNY service threshold',
      'Dispatch load correlation alone cannot establish measured resource constraints or causality',
      'F2 load-threshold feature set is NOT MIHM canon and does not establish observed homeostasis',
      'All source rows were published or revised after the original event dates; not prospective historical prediction',
      'Exploratory selected study; interval not adjusted for model search or source revisions'
    ]
  };
}
async function fetchBounded(url){
  const resp=await fetch(url,{signal:AbortSignal.timeout(45000),headers:{Accept:'application/json'}});
  if(!resp.ok)throw Error('SOURCE_HTTP_'+resp.status);
  const announced=Number(resp.headers.get('content-length')||'0');
  if(announced>1048576)throw Error('SOURCE_BYTES_BUDGET');
  const body=Buffer.from(await resp.arrayBuffer());
  if(body.length>1048576)throw Error('SOURCE_BYTES_BUDGET');
  const raw=JSON.parse(body.toString('utf8'));
  return {raw,sha256:sha(body),bytes:body.length,url};
}
function selfTest(){
  const days=dates();
  const counts=days.map((_,t)=>BOROUGHS.map((__,i)=>({n:Math.round(70+i*15+(t%7)*4+t/10),secs:null})));
  const eligible=days.map((_,t)=>BOROUGHS.map((__,i)=>({n:Math.round(counts[t][i].n*.8),secs:Math.round(330+i*5+t/12+(t%7)*4)})));
  const first=rows(days,counts,eligible).records;
  const changed=structuredClone(eligible);changed[100][0].secs+=50000;
  assert.deepEqual(first.find(r=>r.t===100).m1,rows(days,counts,changed).records.find(r=>r.t===100).m1,'no same-date leakage');
  const original=run(days,counts,eligible);assert.equal(original.N.test,75);assert(Number.isFinite(original.marginalAdvantageSecondsMAE));
  const aggregated=days.flatMap((day,t)=>BOROUGHS.map((borough,i)=>({day:day+'T00:00:00',borough,n:String(counts[t][i].n)})));
  assert.equal(parseAggregates(aggregated,days,false).length,365);
  assert.throws(()=>parseAggregates(aggregated.slice(1),days,false),/INSUFFICIENT_SOURCE_COVERAGE/);
  console.log(JSON.stringify({status:'SYNTHETIC_SELF_TEST_PASS',f2ScientificValidation:false}));
}
const args=process.argv.slice(2);
if(args.includes('--self-test'))selfTest();
else if(args.includes('--fetch')){
  const days=dates(),c=await fetchBounded(urlFor(false)),v=await fetchBounded(urlFor(true));
  const counts=parseAggregates(c.raw,days,false),valid=parseAggregates(v.raw,days,true);
  const result=run(days,counts,valid);
  console.log(JSON.stringify({
    source:{fdny:'https://data.cityofnewyork.us/d/8m42-w767',
      total:{sha256:c.sha256,bytes:c.bytes,aggregates:c.raw.length,url:c.url},
      valid:{sha256:v.sha256,bytes:v.bytes,aggregates:v.raw.length,url:v.url},
      totalDispatches:counts.flat().reduce((s,r)=>s+r.n,0),
      eligibleResponseDispatches:valid.flat().reduce((s,r)=>s+r.n,0)},
    ...result},null,2));
}else throw Error('Use --self-test or explicit --fetch');
