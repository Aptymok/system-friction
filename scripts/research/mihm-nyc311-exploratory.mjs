/**
 * MIHM Foundation exploratory control, NYC 311, July 2025–June 2026.
 * This is NOT canonical MIHM, a causal graph, a prediction of physical incidents,
 * an independent validation or a preregistered prospective forecast.
 * Opt-in: --fetch, --file=/path/to/daily_totals.csv.gz, --self-test.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const REPO='buildwithsakthi/nyc-311-dashboard';
const COMMIT='18b0c1d0073046fa8270cd17caef39509596fac3';
const PATH='data/daily_totals.csv.gz';
const BLOB='2ba911001d0b17e3edc56b27384e395172fc6fb1';
const URL='https://raw.githubusercontent.com/'+REPO+'/'+COMMIT+'/'+PATH;
const BOROUGHS=['MANHATTAN','BRONX','BROOKLYN','QUEENS','STATEN ISLAND'];
const ALPHAS=[0.1,1,10,100,1000];
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
function digest(buf){return createHash('sha1').update(Buffer.from('blob '+buf.length+'\0')).update(buf).digest('hex');}
function parse(csv){
  const lines=csv.trim().replace(/\r/g,'').split('\n');
  assert.equal(lines.shift(),'day,borough,n');
  const byDay=new Map();
  for(const line of lines){
    const [d,b,n]=line.split(',');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(d)&&BOROUGHS.includes(b)&&/^\d+$/.test(n),'valid aggregate row');
    if(!byDay.has(d))byDay.set(d,new Map());
    assert(!byDay.get(d).has(b),'no duplicates');
    byDay.get(d).set(b,Number(n));
  }
  const days=[...byDay.keys()].sort();
  for(let i=0;i<days.length;i++){
    assert.equal(byDay.get(days[i]).size,5);
    if(i)assert.equal((Date.parse(days[i]+'T12:00:00Z')-Date.parse(days[i-1]+'T12:00:00Z'))/86400000,1,'daily coverage');
  }
  return {days,z:days.map(d=>BOROUGHS.map(b=>byDay.get(d).get(b)))};
}
function features(days,z){
  const R=[];
  for(let t=28;t<days.length;t++){
    const dow=new Date(days[t]+'T12:00:00Z').getUTCDay();
    const man=z.map(v=>v[0]);
    const x=[...Array.from({length:6},(_,i)=>Number(i===dow)),
      Math.log1p(man[t-1]),Math.log1p(man[t-7]),Math.log1p(man[t-14]),
      Math.log1p(avg(man.slice(t-7,t)))];
    const shock=[],self=Math.log((z[t-1][0]+1)/(z[t-8][0]+1));
    for(let j=1;j<5;j++){
      const v=z.map(row=>row[j]);
      x.push(Math.log1p(v[t-1]),Math.log1p(v[t-7]),Math.log1p(avg(v.slice(t-7,t))));
      shock.push(Math.log((v[t-1]+1)/(v[t-8]+1)));
    }
    const m=avg(shock),variance=avg(shock.map(q=>(q-m)**2));
    const rel=[...shock,m,Math.abs(m),variance,self*m,...shock.map(q=>self*q),
      Math.max(0,m-0.08),Math.max(0,-m-0.08)];
    assert.equal(x.length,22);assert.equal(rel.length,14);
    R.push({t,day:days[t],y:z[t][0],base:x,candidate:[...x,...rel]});
  }
  return R;
}
function solve(A,B){
  const n=B.length,M=A.map((r,i)=>[...r,B[i]]);
  for(let k=0;k<n;k++){
    let p=k;for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[p][k]))p=i;
    [M[k],M[p]]=[M[p],M[k]];
    const d=M[k][k];assert(Math.abs(d)>1e-12,'ridge');
    for(let j=k;j<=n;j++)M[k][j]/=d;
    for(let i=0;i<n;i++)if(i!==k){const f=M[i][k];for(let j=k;j<=n;j++)M[i][j]-=f*M[k][j];}
  }
  return M.map(r=>r[n]);
}
function fit(X,y,alpha){
  const n=X.length,p=X[0].length,mu=Array(p).fill(0),sd=Array(p).fill(0);
  for(const row of X)for(let j=0;j<p;j++)mu[j]+=row[j]/n;
  for(const row of X)for(let j=0;j<p;j++)sd[j]+=(row[j]-mu[j])**2/n;
  for(let j=0;j<p;j++)sd[j]=Math.sqrt(sd[j])||1;
  const log=y.map(Math.log1p),ym=avg(log),A=Array.from({length:p},()=>Array(p).fill(0)),B=Array(p).fill(0);
  for(let i=0;i<n;i++){
    const v=X[i].map((q,j)=>(q-mu[j])/sd[j]);
    for(let j=0;j<p;j++){B[j]+=v[j]*(log[i]-ym);for(let k=0;k<=j;k++)A[j][k]+=v[j]*v[k];}
  }
  for(let j=0;j<p;j++){A[j][j]+=alpha;for(let k=0;k<j;k++)A[k][j]=A[j][k];}
  return {beta:solve(A,B),mu,sd,ym};
}
function predict(mod,x){
  let y=mod.ym;
  for(let j=0;j<x.length;j++)y+=mod.beta[j]*(x[j]-mod.mu[j])/mod.sd[j];
  return Math.max(0,Math.expm1(Math.min(12,y)));
}
function metrics(y,p){
  const e=y.map((v,i)=>p[i]-v);
  return {MAE:avg(e.map(Math.abs)),RMSE:Math.sqrt(avg(e.map(q=>q*q))),bias:avg(e)};
}
function tuned(R,key){
  const train=R.filter(r=>r.t<250),val=R.filter(r=>r.t>=250&&r.t<290),held=R.filter(r=>r.t>=290);
  const tuning=ALPHAS.map(alpha=>{
    const mod=fit(train.map(r=>r[key]),train.map(r=>r.y),alpha);
    return {alpha,MAE:metrics(val.map(r=>r.y),val.map(r=>predict(mod,r[key]))).MAE};
  });
  const best=tuning.reduce((a,b)=>b.MAE<a.MAE?b:a);
  const model=fit([...train,...val].map(r=>r[key]),[...train,...val].map(r=>r.y),best.alpha);
  const pred=held.map(r=>predict(model,r[key]));
  return {alpha:best.alpha,tuning,metric:metrics(held.map(r=>r.y),pred),pred};
}
function boot(diff){
  let seed=123456789,rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const vals=[];
  for(let k=0;k<2000;k++){
    const sample=[];
    while(sample.length<diff.length){
      const start=Math.floor(rand()*(diff.length-6));
      for(let j=0;j<7&&sample.length<diff.length;j++)sample.push(diff[start+j]);
    }
    vals.push(avg(sample));
  }
  vals.sort((a,b)=>a-b);return [vals[49],vals[1949]];
}
function benchmark({days,z}){
  assert.equal(days[0],'2025-07-01');assert.equal(days.at(-1),'2026-06-30');assert.equal(days.length,365);
  const R=features(days,z),m0=tuned(R,'base'),m1=tuned(R,'candidate');
  const held=R.filter(r=>r.t>=290),actual=held.map(r=>r.y);
  const naive=metrics(actual,held.map(r=>z[r.t-7][0]));
  const diff=actual.map((v,i)=>Math.abs(m0.pred[i]-v)-Math.abs(m1.pred[i]-v));
  return {
    status:'EXPLORATORY_RETROSPECTIVE_NOT_PREREGISTERED',
    independentScientificValidation:false,canonicalMIHMValidated:false,causalClaim:false,
    target:'Next-day MANHATTAN 311 request count, not physical infrastructure incident',
    periods:{train:[days[28],days[249]],validation:[days[250],days[289]],test:[days[290],days[364]]},
    counts:{train:222,validation:40,test:75},features:{conventional:22,mihmInspired:36},
    weeklyNaive:naive,
    conventionalRidge:{alpha:m0.alpha,metrics:m0.metric,tuning:m0.tuning},
    mihmInspiredRidge:{alpha:m1.alpha,metrics:m1.metric,tuning:m1.tuning},
    MAE_Difference_M0minusCandidate:avg(diff),
    exploratoryBlockBootstrap95:boot(diff),
    candidateBetterDays:diff.filter(v=>v>0).length,
    candidateWorseDays:diff.filter(v=>v<0).length,
    limitations:[
      'Third-party aggregation is not independently re-extracted from NYC 311 official records',
      'This later-published source cannot establish historical as-of-T0 source availability',
      'The candidate is MIHM-inspired nonlinear interaction features, not canonical MIHM',
      'Borough covariates are not proof of causal links; MTA, climate and incidents are absent',
      'Exploratory research, not blinded preregistered held-out prediction',
      'Block bootstrap does not capture model-selection and source-vintage uncertainty'
    ]
  };
}
const args=process.argv.slice(2);
if(args.includes('--self-test')){
  const days=Array.from({length:365},(_,i)=>new Date(Date.parse('2025-07-01T12:00:00Z')+i*86400000).toISOString().slice(0,10));
  const z=days.map((_,t)=>BOROUGHS.map((__,j)=>250+j*45+(t%7)*20+t/5));
  const x=features(days,z),copy=structuredClone(z);copy[100][0]+=50000;
  assert.deepEqual(x[50].base,features(days,copy)[50].base,'T0 has no future information');
  const report=benchmark({days,z});
  assert.equal(report.counts.test,75);assert.equal(report.features.mihmInspired,36);
  assert(Number.isFinite(report.MAE_Difference_M0minusCandidate));
  console.log(JSON.stringify({syntheticSelfTest:'PASS',realWorldResult:false}));
}else{
  const option=args.find(x=>x.startsWith('--file='));
  let data;
  if(option)data=readFileSync(option.slice(7));
  else if(args.includes('--fetch')){
    const response=await fetch(URL,{signal:AbortSignal.timeout(15000)});
    assert(response.ok,'source retrieval');
    data=Buffer.from(await response.arrayBuffer());
    assert(data.length<=1048576,'bounded download');
  }else throw new Error('Use --self-test, --file=PATH or --fetch; network access is opt-in.');
  const blob=digest(data);
  assert.equal(blob,BLOB,'unexpected source revision: STOP');
  const observations=parse(gunzipSync(data).toString('utf8'));
  console.log(JSON.stringify({source:{repo:REPO,commit:COMMIT,path:PATH,blobSha:blob,rows:1825},...benchmark(observations)},null,2));
}
