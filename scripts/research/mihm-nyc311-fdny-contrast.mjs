/**
 * SFI MIHM Foundation, FDNY independent-outcome contrast (exploratory; NOT MIHM validation).
 * Incident dispatch counts are independent of NYC311 report counts, but they are NOT
 * proof of physical infrastructure failures, causality or system emergence.
 *
 * node scripts/research/mihm-nyc311-fdny-contrast.mjs --self-test
 * node scripts/research/mihm-nyc311-fdny-contrast.mjs --fetch
 *
 * CLI is read-only, never writes to database, cache, evidence or production.
 * External fetch is explicit. Outputs statistical metrics as JSON to stdout.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const BOROUGHS=['MANHATTAN','BRONX','BROOKLYN','QUEENS','STATEN ISLAND'];
const GITHUB_COMMIT='18b0c1d0073046fa8270cd17caef39509596fac3';
const NYC311_BLOB='2ba911001d0b17e3edc56b27384e395172fc6fb1';
const NYC311_URL='https://raw.githubusercontent.com/buildwithsakthi/nyc-311-dashboard/'+GITHUB_COMMIT+'/data/daily_totals.csv.gz';
const FDNY_ID='8m42-w767';
const FDNY_ORIGIN='https://data.cityofnewyork.us/resource/'+FDNY_ID+'.json';
const START='2025-07-01T00:00:00',END='2026-07-01T00:00:00',DATE_START='2025-07-01',DATE_END='2026-06-30';
const ALPHAS=[1,10,100,1000,10000];
const mean=v=>v.reduce((a,b)=>a+b,0)/v.length;
const sha256=v=>createHash('sha256').update(v).digest('hex');
const gitBlob=v=>createHash('sha1').update(Buffer.from('blob '+v.length+'\0')).update(v).digest('hex');

function parse311(csv){
  const lines=csv.trim().replace(/\r/g,'').split('\n');
  assert.equal(lines.shift(),'day,borough,n','311 columns must match pinned aggregate');
  const entries=new Map();
  for(const line of lines){
    const [day,bor,n]=line.split(',');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(day)&&BOROUGHS.includes(bor)&&/^\d+$/.test(n),'311 valid row');
    if(!entries.has(day))entries.set(day,new Map());
    assert(!entries.get(day).has(bor),'311 duplicate day-borough');
    entries.get(day).set(bor,Number(n));
  }
  const days=[...entries.keys()].sort();
  for(const day of days)assert.equal(entries.get(day).size,5,'311 missing borough/day');
  return {days,z:days.map(d=>BOROUGHS.map(b=>entries.get(d).get(b)))};
}
function normalizeBorough(b){
  const s=String(b??'').trim().toUpperCase();
  if(s==='RICHMOND / STATEN ISLAND'||s==='RICHMOND')return 'STATEN ISLAND';
  return s;
}
function parseFDNY(data,days){
  assert(Array.isArray(data),'FDNY SoQL response must be an array');
  const set=new Set(days),rows=new Map(days.map(d=>[d,new Map()]));
  for(const row of data){
    assert(row&&typeof row==='object'&&!Array.isArray(row),'FDNY typed aggregate row');
    const day=String(row.day??'').slice(0,10);
    const b=normalizeBorough(row.borough);
    if(!set.has(day))throw Error('FDNY_OUTSIDE_BOUNDARY:'+day);
    if(!BOROUGHS.includes(b))throw Error('FDNY_UNKNOWN_BOROUGH:'+String(row.borough));
    const n=Number(row.n);
    assert(Number.isInteger(n)&&n>0,'FDNY positive integer count');
    assert(!rows.get(day).has(b),'FDNY duplicate borough/day');
    rows.get(day).set(b,n);
  }
  const missing=[];
  const z=days.map(d=>BOROUGHS.map(b=>{
    if(!rows.get(d).has(b)){missing.push(d+':'+b);return null;}
    return rows.get(d).get(b);
  }));
  if(missing.length)throw Error('FDNY_MISSING_DAILY_OBSERVATIONS:'+missing.length+':'+missing.slice(0,5).join(';'));
  return {days,z,rows:data.length,dailyRange:[days[0],days.at(-1)]};
}
function buildUrl(){
  const url=new URL(FDNY_ORIGIN);
  url.searchParams.set('$select','date_trunc_ymd(incident_datetime) as day, incident_borough as borough, count(*) as n');
  url.searchParams.set('$where',"incident_datetime >= '"+START+"' AND incident_datetime < '"+END+"' AND incident_borough IS NOT NULL");
  url.searchParams.set('$group','day, borough');
  url.searchParams.set('$order','day ASC, borough ASC');
  url.searchParams.set('$limit','5000');
  return url.toString();
}
async function getLimited(url,limit=1048576,timeout=45000){
  const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(timeout)});
  if(!response.ok)throw Error('HTTP_SOURCE_FETCH_FAILED:'+response.status+':'+new URL(url).host);
  const len=Number(response.headers.get('content-length')??'0');
  if(len>limit)throw Error('SOURCE_TOO_LARGE_CONTENT_LENGTH:'+len);
  const data=Buffer.from(await response.arrayBuffer());
  if(data.length>limit)throw Error('SOURCE_TOO_LARGE:'+data.length);
  return data;
}
function rowsFromSources(fdny,service){
  const R=[];
  for(let t=28;t<fdny.days.length;t++){
    const dow=new Date(fdny.days[t]+'T12:00:00Z').getUTCDay();
    const same=fdny.z.map(r=>r[0]),x=service.z.map(r=>r[0]);
    const weekday=Array.from({length:6},(_,i)=>Number(dow===i));
    // M0: competent autoregressive ridge baseline, FDNY source history only.
    const basic=[...weekday,Math.log1p(same[t-1]),Math.log1p(same[t-7]),
      Math.log1p(same[t-14]),Math.log1p(mean(same.slice(t-7,t))),
      Math.log1p(mean(same.slice(t-14,t-7))),
      Math.log1p(mean(same.slice(t-28,t-14)))];
    // M1: same FDNY history, plus previous-day/week/trailing-week NYC311, all boroughs.
    const with311=[...basic];
    for(let b=0;b<5;b++){
      const src=service.z.map(r=>r[b]);
      with311.push(Math.log1p(src[t-1]),Math.log1p(src[t-7]),
        Math.log1p(mean(src.slice(t-7,t))));
    }
    // M2: MIHM-inspired *hypothesis*, not canonical MIHM or causally measured edges.
    // Include lagged co-movement/relative pressure and 311 change dispersion.
    const shock=[],d31=[];
    for(let b=0;b<5;b++){
      shock.push(Math.log((service.z[t-1][b]+1)/(service.z[t-8][b]+1)));
      d31.push(Math.log((service.z[t-1][b]+1)/(service.z[t-2][b]+1)));
    }
    const mn=mean(shock),dispersion=mean(shock.map(v=>(v-mn)**2));
    const fdnyShock=Math.log((same[t-1]+1)/(same[t-8]+1));
    const added=[...shock,mn,Math.abs(mn),dispersion,fdnyShock*mn,
      ...shock.map(v=>fdnyShock*v),...d31.slice(0,2),
      Math.max(0,mn-0.1),Math.max(0,-mn-0.1)];
    // All three alternatives must share the identical target date and published extract.
    R.push({t,day:fdny.days[t],y:same[t],M0:basic,M1:with311,M2:[...with311,...added]});
  }
  return R;
}
function solve(A,B){
  const n=B.length,M=A.map((r,i)=>[...r,B[i]]);
  for(let k=0;k<n;k++){
    let pivot=k;
    for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[pivot][k]))pivot=i;
    [M[k],M[pivot]]=[M[pivot],M[k]];
    const q=M[k][k];assert(Math.abs(q)>1e-11,'ridge solver singular');
    for(let j=k;j<=n;j++)M[k][j]/=q;
    for(let i=0;i<n;i++)if(i!==k){const v=M[i][k];for(let j=k;j<=n;j++)M[i][j]-=v*M[k][j];}
  }
  return M.map(r=>r[n]);
}
function fit(X,y,alpha){
  const n=X.length,p=X[0].length,mu=Array(p).fill(0),sd=Array(p).fill(0);
  for(const row of X)for(let j=0;j<p;j++)mu[j]+=row[j]/n;
  for(const row of X)for(let j=0;j<p;j++)sd[j]+=(row[j]-mu[j])**2/n;
  for(let j=0;j<p;j++)sd[j]=Math.sqrt(sd[j])||1;
  const logs=y.map(q=>Math.log1p(q)),ym=mean(logs);
  const A=Array.from({length:p},()=>Array(p).fill(0)),B=Array(p).fill(0);
  for(let i=0;i<n;i++){
    const norm=X[i].map((v,j)=>(v-mu[j])/sd[j]);
    for(let j=0;j<p;j++){B[j]+=norm[j]*(logs[i]-ym);for(let k=0;k<=j;k++)A[j][k]+=norm[j]*norm[k];}
  }
  for(let j=0;j<p;j++){A[j][j]+=alpha;for(let k=0;k<j;k++)A[k][j]=A[j][k];}
  return {mu,sd,ym,coef:solve(A,B)};
}
function predict(m,row){
  let r=m.ym;
  for(let j=0;j<row.length;j++)r+=m.coef[j]*(row[j]-m.mu[j])/m.sd[j];
  return Math.max(0,Math.expm1(Math.min(12,r)));
}
function measure(obs,pred){
  const diff=obs.map((v,i)=>pred[i]-v);
  return {MAE:mean(diff.map(Math.abs)),RMSE:Math.sqrt(mean(diff.map(v=>v*v))),bias:mean(diff)};
}
function tune(R,key){
  const train=R.filter(r=>r.t<250),valid=R.filter(r=>r.t>=250&&r.t<290);
  const test=R.filter(r=>r.t>=290);
  const val=ALPHAS.map(alpha=>{
    const m=fit(train.map(r=>r[key]),train.map(r=>r.y),alpha);
    return {alpha,MAE:measure(valid.map(r=>r.y),valid.map(r=>predict(m,r[key]))).MAE};
  });
  const best=val.reduce((a,b)=>b.MAE<a.MAE?b:a);
  const m=fit([...train,...valid].map(r=>r[key]),[...train,...valid].map(r=>r.y),best.alpha);
  const prediction=test.map(r=>predict(m,r[key]));
  return {alpha:best.alpha,validation:val,test:measure(test.map(r=>r.y),prediction),prediction};
}
function bootstrap(diffs){
  let seed=20261025;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const scores=[];
  for(let i=0;i<1000;i++){
    const sampled=[];
    while(sampled.length<diffs.length){
      const start=Math.floor(random()*(diffs.length-6));
      for(let j=0;j<7&&sampled.length<diffs.length;j++)sampled.push(diffs[start+j]);
    }
    scores.push(mean(sampled));
  }
  scores.sort((a,b)=>a-b);return [scores[24],scores[974]];
}
function execute(fdny,service){
  assert.deepEqual(fdny.days,service.days,'same complete daily clock');
  assert.equal(fdny.days.length,365);
  const R=rowsFromSources(fdny,service),testRows=R.filter(r=>r.t>=290);
  const models=Object.fromEntries(['M0','M1','M2'].map(k=>[k,tune(R,k)]));
  const naive=measure(testRows.map(r=>r.y),testRows.map(r=>fdny.z[r.t-7][0]));
  const contrast=(a,b)=>{
    const d=testRows.map((r,i)=>Math.abs(models[a].prediction[i]-r.y)-Math.abs(models[b].prediction[i]-r.y));
    return {meanMAEAdvantage:mean(d),blockBootstrap95:bootstrap(d),
      betterDaysForCandidate:d.filter(x=>x>0).length,worseDaysForCandidate:d.filter(x=>x<0).length};
  };
  return {
    status:'RETROSPECTIVE_EXPLORATORY_NOT_PREREGISTERED',
    independentOutcomeSource:'FDNY Fire Incident Dispatch Data 8m42-w767',
    target:'Next-day MANHATTAN FDNY Starfire dispatch count',
    notPhysicalFailurePrediction:true,causalClaim:false,canonicalMihmValidation:false,
    informationVintage:'UNKNOWN_AS_OF_EVENT_DAY; sources later published/updated',
    periods:{train:[fdny.days[28],fdny.days[249]],validation:[fdny.days[250],fdny.days[289]],test:[fdny.days[290],fdny.days[364]]},
    days:{train:222,validation:40,test:75},
    features:{M0:R[0].M0.length,M1:R[0].M1.length,M2:R[0].M2.length},
    seasonalNaive:naive,
    M0_FDNYHistory:{alpha:models.M0.alpha,metrics:models.M0.test,validation:models.M0.validation},
    M1_FDNYHistoryPlus311:{alpha:models.M1.alpha,metrics:models.M1.test,validation:models.M1.validation},
    M2_ExperimentalMIHMInspired:{alpha:models.M2.alpha,metrics:models.M2.test,validation:models.M2.validation},
    incremental311:contrast('M0','M1'),
    incrementalInteractions:contrast('M1','M2'),
    limitations:[
      'FDNY data updates annually; retrospective source vintage not established at each historical T0',
      'FDNY dispatched incidents do not verify physical infrastructure damage or crisis',
      'M2 represents only exploratory engineered interactions, not a complete MIHM implementation',
      'No independent prospective pre-registration, shock mechanism, causal graph or replication',
      'Bootstrap ignores source revisions, data/target search and model selection uncertainty',
      'Feature engineering and holdout choice are exploratory; apparent improvements need independent re-test'
    ]
  };
}
function selfTest(){
  const days=Array.from({length:365},(_,i)=>
    new Date(Date.parse(DATE_START+'T12:00:00Z')+i*86400000).toISOString().slice(0,10));
  const zFDNY=days.map((_,t)=>BOROUGHS.map((__,b)=>Math.round(70+b*10+(t%7)*7+t/22)));
  const z311=days.map((_,t)=>BOROUGHS.map((__,b)=>Math.round(140+b*20+(t%7)*15+t/9)));
  const before=rowsFromSources({days,z:zFDNY},{days,z:z311});
  const revised=structuredClone(zFDNY);
  revised[100][0]+=100000;
  const after=rowsFromSources({days,z:revised},{days,z:z311});
  assert.deepEqual(before.find(r=>r.t===100).M0,after.find(r=>r.t===100).M0,
    'event-day target must not affect same-day features');
  assert.deepEqual(before.find(r=>r.t===100).M2,after.find(r=>r.t===100).M2,
    'future outcomes cannot enter same-day features');
  assert.equal(before.length,337);
  assert.equal(normalizeBorough('RICHMOND / STATEN ISLAND'),'STATEN ISLAND');
  const fdnyExample=days.flatMap((d,i)=>BOROUGHS.map((b,j)=>({day:d+'T00:00:00',borough:b,n:String(zFDNY[i][j])})));
  assert.equal(parseFDNY(fdnyExample,days).rows,1825);
  assert.throws(()=>parseFDNY(fdnyExample.slice(1),days),/FDNY_MISSING/);
  const x=execute({days,z:zFDNY},{days,z:z311});
  assert.equal(x.days.test,75);
  assert(Number.isFinite(x.incrementalInteractions.meanMAEAdvantage));
  console.log(JSON.stringify({status:'SYNTHETIC_SELF_TEST_PASS',source:'CONTROLLED_SYNTHETIC_ONLY',realEvidence:false}));
}
const args=process.argv.slice(2);
if(args.includes('--self-test'))selfTest();
else if(args.includes('--fetch')){
  const raw311=await getLimited(NYC311_URL,1048576,20000);
  assert.equal(gitBlob(raw311),NYC311_BLOB,'NYC311 pinned blob mismatch — stop');
  const service=parse311(gunzipSync(raw311).toString('utf8'));
  const url=buildUrl();
  const rawFDNY=await getLimited(url,1048576,45000);
  const fdnyRows=JSON.parse(rawFDNY.toString('utf8'));
  assert(Array.isArray(fdnyRows)&&fdnyRows.length<=5000,'bounded FDNY response');
  const fdny=parseFDNY(fdnyRows,service.days);
  const report=execute(fdny,service);
  console.log(JSON.stringify({
    source:{
      fdnyDataset:'https://data.cityofnewyork.us/d/'+FDNY_ID,
      fdnyQueryUrl:url,fdnyRows:fdny.rows,
      fdnySha256:sha256(rawFDNY),
      fdnyAggregatedTotal:fdny.z.flat().reduce((a,b)=>a+b,0),
      nyc311Commit:GITHUB_COMMIT,nyc311GitBlob:NYC311_BLOB,
      n311Aggregates:service.days.length*5
    },...report
  },null,2));
}else throw new Error('Use --self-test or --fetch (external fetch only by explicit opt-in).');
