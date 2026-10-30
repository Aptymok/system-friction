/**
 * MIHM Foundation — CALIBRATED MULTIPLEX, four Manhattan observable domains.
 * This is a laboratory comparator, NOT canonical MIHM and NOT causal inference.
 * Every feature at date T uses only observations from dates preceding T.
 *
 * JSON input contract:
 * {
 *  "contract":"MIHM-MANHATTAN-PANEL-0.1",
 *  "boundary":"MANHATTAN",
 *  "timezone":"America/New_York",
 *  "sources":{
 *    "NYC311":{"sha256":"...","spatiallyAdmitted":true},
 *    "FDNY":{"sha256":"...","spatiallyAdmitted":true},
 *    "MTA":{"sha256":"...","spatiallyAdmitted":true},
 *    "DOT":{"sha256":"...","spatiallyAdmitted":true,
 *       "crosswalkEvidence":"audited-link-map"}
 *  },
 *  "rows":[{"day":"2025-07-01","service311":2000,"fdnyCount":400,
 *    "fdnyResponse":320,"mtaEntries":500000,"dotSpeed":15}, ...],
 *  "edges":[{"from":"mtaEntries","to":"dotSpeed","lagDays":1,
 *    "mechanism":"declared transfer/substitution hypothesis",
 *    "evidenceRef":"independent:research-protocol", "state":"HYPOTHESIS"}]
 * }
 *
 * --self-test: deterministic synthetic no external data, no claims.
 * --file=...: bounded read of externally admitted non-identifying aggregates.
 * No database, deployed service, canonical Phi, costs or remote fetches.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const SOURCES=['NYC311','FDNY','MTA','DOT'];
const METRICS=['service311','fdnyCount','fdnyResponse','mtaEntries','dotSpeed'];
const TARGETS=['service311','fdnyResponse','mtaEntries','dotSpeed'];
const ALPHAS=[10,100,1000];
const WINDOWS=[7,14];
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const epoch=d=>Date.parse(d+'T12:00:00Z');
const sha=v=>createHash('sha256').update(v).digest('hex');

function verify(p){
  assert.equal(p.contract,'MIHM-MANHATTAN-PANEL-0.1');
  assert.equal(p.boundary,'MANHATTAN');
  assert.equal(p.timezone,'America/New_York');
  for(const name of SOURCES){
    const s=p.sources?.[name];
    assert(s&&typeof s.sha256==='string'&&s.sha256.trim().length>=8,
      'Missing independent source fingerprint: '+name);
    assert.equal(s.spatiallyAdmitted,true,'Spatial crosswalk not admitted: '+name);
  }
  assert(typeof p.sources.DOT.crosswalkEvidence==='string'&&
    p.sources.DOT.crosswalkEvidence.trim().length>=8,
    'Road links cannot silently be treated as Manhattan');
  assert.equal(p.sources.MTA.modeFilter,'subway',
    'MTA subway entries must exclude tram and railway rows');
  assert.equal(p.sources.DOT.speedUnit,'fps',
    'DOT speeds must retain original feet-per-second units');
  assert(typeof p.sources.DOT.samplingPolicy==='string'&&
    p.sources.DOT.samplingPolicy.trim().length>=12,
    'DOT road-link sampling/aggregation policy must be declared');
  assert(Array.isArray(p.rows)&&p.rows.length>=360&&p.rows.length<=700,
    'Expected 360–700 complete local daily aggregate rows');
  for(let i=0;i<p.rows.length;i++){
    const row=p.rows[i];
    assert(/^\d{4}-\d{2}-\d{2}$/.test(row.day),'valid date');
    if(i)assert.equal(epoch(row.day)-epoch(p.rows[i-1].day),86400000,'contiguous calendar days');
    for(const k of METRICS)assert(Number.isFinite(row[k])&&row[k]>=0,'missing/invalid '+k+' on '+row.day);
    for(const k of ['fdnyResponse','dotSpeed'])assert(row[k]>0,'positive '+k);
  }
  assert.equal(p.rows[0].day,'2025-07-01');
  assert(p.rows.at(-1).day>='2026-09-30',
    'Temporal audit Jul–Sep 2026 unavailable; no certification');
  for(const e of p.edges??[]){
    assert(METRICS.includes(e.from)&&TARGETS.includes(e.to)&&e.from!==e.to);
    assert(Number.isInteger(e.lagDays)&&e.lagDays>=1&&e.lagDays<=7);
    assert(typeof e.mechanism==='string'&&e.mechanism.length>=10);
    assert(typeof e.evidenceRef==='string'&&e.evidenceRef.length>=8);
    assert.equal(e.state,'HYPOTHESIS','Edges remain research hypotheses');
  }
  assert(new Set((p.edges??[]).map(e=>[e.from,e.to,e.lagDays].join('|'))).size===(p.edges??[]).length);
}
function rowFeatures(rows,t,target,win,mode,edges){
  const src=k=>Math.log1p(rows[t-1][k]);
  const avgLag=k=>Math.log1p(mean(rows.slice(t-win,t).map(row=>row[k])));
  const dow=new Date(epoch(rows[t].day)).getUTCDay();
  const out=[...Array.from({length:6},(_,i)=>Number(dow===i)),
    src(target),Math.log1p(rows[t-7][target]),avgLag(target),
    Math.log1p(rows[t-14][target])];
  if(mode!=='M0'){
    for(const k of METRICS.filter(k=>k!==target)){
      out.push(src(k),Math.log1p(rows[t-7][k]),avgLag(k));
    }
  }
  if(mode==='M2'){
    for(const edge of edges.filter(e=>e.to===target)){
      const q=edge.from,lag=edge.lagDays;
      // Historical shift aligned before T, NEVER T outcome.
      const at=t-lag,prev=t-lag-7;
      assert(at<t && prev>=0);
      const shock=Math.log((rows[at][q]+1)/(rows[prev][q]+1));
      const ownLag=Math.log1p(rows[t-1][target]);
      out.push(shock,Math.abs(shock),shock*ownLag);
    }
  }
  return out;
}
function solve(A,b){
  const n=b.length,M=A.map((r,i)=>[...r,b[i]]);
  for(let k=0;k<n;k++){
    let q=k;
    for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[q][k]))q=i;
    [M[k],M[q]]=[M[q],M[k]];
    const pivot=M[k][k];assert(Math.abs(pivot)>1e-12,'singular ridge');
    for(let j=k;j<=n;j++)M[k][j]/=pivot;
    for(let i=0;i<n;i++)if(i!==k){
      const fact=M[i][k];for(let j=k;j<=n;j++)M[i][j]-=fact*M[k][j];
    }
  }
  return M.map(r=>r[n]);
}
function fit(X,y,alpha){
  const n=X.length,p=X[0].length,mu=Array(p).fill(0),sd=Array(p).fill(0);
  for(const row of X)for(let j=0;j<p;j++)mu[j]+=row[j]/n;
  for(const row of X)for(let j=0;j<p;j++)sd[j]+=(row[j]-mu[j])**2/n;
  for(let j=0;j<p;j++)sd[j]=Math.sqrt(sd[j])||1;
  const log=y.map(v=>Math.log1p(v)),avgY=mean(log);
  const A=Array.from({length:p},()=>Array(p).fill(0)),B=Array(p).fill(0);
  for(let i=0;i<n;i++){
    const row=X[i].map((v,j)=>(v-mu[j])/sd[j]);
    for(let j=0;j<p;j++){
      B[j]+=row[j]*(log[i]-avgY);
      for(let k=0;k<=j;k++)A[j][k]+=row[j]*row[k];
    }
  }
  for(let j=0;j<p;j++){A[j][j]+=alpha;for(let k=0;k<j;k++)A[k][j]=A[j][k];}
  return {mu,sd,coef:solve(A,B),avgY};
}
function predict(m,x){
  let z=m.avgY;
  for(let j=0;j<x.length;j++)z+=m.coef[j]*(x[j]-m.mu[j])/m.sd[j];
  return Math.max(0,Math.expm1(Math.min(15,z)));
}
function score(truth,pred){
  const diff=truth.map((v,i)=>pred[i]-v);
  return {mae:mean(diff.map(Math.abs)),rmse:Math.sqrt(mean(diff.map(v=>v*v))),
    bias:mean(diff)};
}
function calibrate(rows,target,mode,edges){
  const train=rows.map((_,i)=>i).filter(t=>t>=28&&rows[t].day<='2026-04-30');
  const validation=rows.map((_,i)=>i).filter(t=>rows[t].day>='2026-05-01'&&rows[t].day<='2026-06-30');
  const holdout=rows.map((_,i)=>i).filter(t=>rows[t].day>='2026-07-01'&&rows[t].day<='2026-09-30');
  assert(train.length>=250&&validation.length>=30&&holdout.length===92,
    'Fixed nonempty periods for honest exploratory forward block');
  const configurations=[];
  for(const win of WINDOWS)for(const alpha of ALPHAS){
    const f=i=>rowFeatures(rows,i,target,win,mode,edges);
    const model=fit(train.map(f),train.map(i=>rows[i][target]),alpha);
    const pred=validation.map(i=>predict(model,f(i)));
    configurations.push({window:win,alpha,validationMAE:score(validation.map(i=>rows[i][target]),pred).mae});
  }
  const best=configurations.reduce((a,b)=>b.validationMAE<a.validationMAE?b:a);
  const f=i=>rowFeatures(rows,i,target,best.window,mode,edges);
  const eligible=[...train,...validation];
  const model=fit(eligible.map(f),eligible.map(i=>rows[i][target]),best.alpha);
  const predicted=holdout.map(i=>predict(model,f(i)));
  return {mode,selected:{window:best.window,alpha:best.alpha},
    validationMAE:best.validationMAE,
    outcome:score(holdout.map(i=>rows[i][target]),predicted),prediction:predicted,
    comparisonTargets:holdout.map(i=>rows[i][target]),n:{train:train.length,calibration:validation.length,holdout:holdout.length}};
}
function trial(p){
  verify(p);
  const result={contract:'MIHM-MANHATTAN-MULTIPLEX-CALIBRATION-0.1',
    status:'EXPLORATORY_VINTAGE_UNKNOWN_NOT_INDEPENDENTLY_VALIDATED',
    studyBoundary:'Manhattan, four separate observed systems and four targets',
    timeWindows:{train:'2025-07-29 through 2026-04-30',calibration:'2026-05-01 through 2026-06-30',
      audit:'2026-07-01 through 2026-09-30'},
    hypothesesAreNotObservedCausalEdges:true,canonicalMihmValidation:false,
    targets:[],decision:'NO_GENERAL_MIHM_SUPERIORITY_CLAIM'};
  for(const target of TARGETS){
    const own=calibrate(p.rows,target,'M0',p.edges??[]);
    const multi=calibrate(p.rows,target,'M1',p.edges??[]);
    const incoming=(p.edges??[]).filter(e=>e.to===target);
    const experimental=incoming.length?calibrate(p.rows,target,'M2',p.edges):null;
    // Negative control: preserve feature budget and temporal lag but substitute
    // a different non-target input. This tests specificity of *declared* links
    // rather than interpreting any additional input as evidence of a mechanism.
    const placeboEdges=incoming.map(e=>{
      const alternatives=METRICS.filter(k=>k!==target&&k!==e.from);
      assert(alternatives.length>0,'No eligible placebo source');
      return {...e,from:alternatives[0],state:'PLACEBO',evidenceRef:'placebo:no-observed-mechanism'};
    });
    const placebo=incoming.length?calibrate(p.rows,target,'M2',placeboEdges):null;
    const compare=(reference,candidate)=>{
      const gain=reference.outcome.mae-candidate.outcome.mae;
      return {MAEGain:gain,percentGain:reference.outcome.mae===0?null:100*gain/reference.outcome.mae,
        worseRMSE:candidate.outcome.rmse>reference.outcome.rmse};
    };
    result.targets.push({target,n:own.n,M0:{chosen:own.selected,metrics:own.outcome},
      M1:{chosen:multi.selected,metrics:multi.outcome,vsM0:compare(own,multi)},
      M2:experimental?{chosen:experimental.selected,metrics:experimental.outcome,
        vsM1:compare(multi,experimental),hypotheses:incoming.map(e=>e.evidenceRef),
        placebo:{metrics:placebo.outcome,vsPlacebo:compare(placebo,experimental),
          control:'MATCHED_LAG_OTHER_SOURCE_NO_OBSERVED_MECHANISM'}}:
        {status:'ABSTAIN_NO_PREDECLARED_TYPED_EDGE'}});
  }
  return result;
}
function selfTest(){
  const start=epoch('2025-07-01'),end=epoch('2026-09-30'),rows=[];
  for(let d=start,i=0;d<=end;d+=86400000,i++){
    const wd=i%7,season=Math.sin(i/17),service311=1700+100*wd+50*season+i*0.5;
    const fdnyCount=350+10*wd+15*season+i/15;
    const fdnyResponse=320+wd+3*season+Math.max(0,fdnyCount-400)*0.18;
    const mtaEntries=450000+9000*wd+13000*season+i*100;
    const dotSpeed=16-0.0000009*(mtaEntries-450000)+0.7*Math.cos(i/10);
    rows.push({day:new Date(d).toISOString().slice(0,10),
      service311,fdnyCount,fdnyResponse,mtaEntries,dotSpeed});
  }
  const p={contract:'MIHM-MANHATTAN-PANEL-0.1',boundary:'MANHATTAN',timezone:'America/New_York',
    sources:Object.fromEntries(SOURCES.map(s=>[s,{sha256:'synthetic:'+s,spatiallyAdmitted:true,
      crosswalkEvidence:'synthetic-crosswalk-only',
      modeFilter:s==='MTA'?'subway':undefined,
      speedUnit:s==='DOT'?'fps':undefined,
      samplingPolicy:s==='DOT'?'synthetic per-link samples only':undefined}])),
    rows,edges:[{from:'mtaEntries',to:'dotSpeed',lagDays:1,
      mechanism:'synthetic station to road substitution hypothesis',evidenceRef:'synthetic:declared',
      state:'HYPOTHESIS'}]};
  const out=trial(p);
  assert.equal(out.targets.length,4);
  assert.equal(out.targets[0].n.holdout,92);
  assert.equal(out.targets[0].M2.status,'ABSTAIN_NO_PREDECLARED_TYPED_EDGE');
  assert(Number.isFinite(out.targets[3].M2.metrics.mae));
  assert(Number.isFinite(out.targets[3].M2.placebo.metrics.mae),
    'A typed-edge candidate must face an equal-complexity negative control');
  assert.equal(out.targets[3].M2.placebo.control,'MATCHED_LAG_OTHER_SOURCE_NO_OBSERVED_MECHANISM');
  const alt=structuredClone(p);
  // The same-day target is never an input to that day's features.
  const targetDay=rows.findIndex(r=>r.day==='2026-08-01');
  alt.rows[targetDay].dotSpeed+=10000;
  for(const mode of ['M0','M1','M2'])assert.deepEqual(
    rowFeatures(p.rows,targetDay,'dotSpeed',7,mode,p.edges),
    rowFeatures(alt.rows,targetDay,'dotSpeed',7,mode,p.edges));
  alt.sources.DOT.spatiallyAdmitted=false;
  assert.throws(()=>trial(alt),/Spatial crosswalk not admitted/);
  alt.sources.DOT.spatiallyAdmitted=true;
  delete alt.sources.DOT.crosswalkEvidence;
  assert.throws(()=>trial(alt),/Road links cannot silently/);
  alt.sources.DOT.crosswalkEvidence='synthetic-crosswalk-only';
  alt.sources.MTA.modeFilter='all';
  assert.throws(()=>trial(alt),/must exclude tram/);
  alt.sources.MTA.modeFilter='subway';
  alt.sources.DOT.speedUnit='mph';
  assert.throws(()=>trial(alt),/feet-per-second/);
  console.log(JSON.stringify({status:'SYNTHETIC_CALIBRATION_PASS',targets:TARGETS.length,
    prospectiveScientificEvidence:false,adaptiveCalibrationPerformed:true,
    causalClaim:false}));
}
const args=process.argv.slice(2);
if(args.includes('--self-test'))selfTest();
else {
  const path=args.find(x=>x.startsWith('--file='));
  if(!path)throw Error('Use --self-test or --file=PATH; no automatic raw source fetching');
  const raw=readFileSync(path.slice('--file='.length));
  assert(raw.length<=1000000,'Bounded aggregate panel file');
  const parsed=JSON.parse(raw.toString('utf8'));
  console.log(JSON.stringify({panelSha256:sha(raw),...trial(parsed)},null,2));
}
