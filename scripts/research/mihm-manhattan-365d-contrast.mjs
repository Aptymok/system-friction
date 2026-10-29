/**
 * MIHM Foundation 365-day Manhattan retrospective comparison:
 * M0 own-series log-ridge, M1 conventional multi-agency lagged log-ridge,
 * M2 exploratory lagged shock interactions, and a same-size OLD-SHOCK placebo.
 * M2 is NOT canonical MIHM; superior performance here would NOT establish it.
 *
 * node scripts/research/mihm-manhattan-365d-contrast.mjs --self-test
 * node scripts/research/mihm-manhattan-365d-contrast.mjs --evaluate
 * node scripts/research/mihm-manhattan-365d-contrast.mjs --evaluate-lag2
 * node scripts/research/mihm-manhattan-365d-contrast.mjs --verify-lag2-receipt
 * node scripts/research/mihm-manhattan-365d-contrast.mjs --asof-check path/to/frozen-receipts.json
 *
 * No source fetch, external action, database or publication. Data file must be
 * verified official daily aggregates and cannot represent prospective T0 vintage.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const PATH='docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json';
const KEYS=['service311','fdnyCount','cbdEntries'];
const ALPHAS=[1,10,100,1000];
const START='2025-10-01',STOP='2026-09-30';
const m=a=>a.reduce((s,v)=>s+v,0)/a.length;
const dateNum=d=>Date.parse(d+'T12:00:00Z');
const log=n=>Math.log1p(n);
const sum=a=>a.reduce((s,v)=>s+v,0);
function validate(data){
  assert.equal(data.contract,'MIHM-MANHATTAN-365D-RETROSPECTIVE-EVIDENCE-0.1');
  assert.equal(data.dataAsOfOriginalDates,'NOT_VERIFIED');
  assert.equal(data.geographyCompatibility,'HETEROGENEOUS_BOROUGH_VS_NESTED_CBD');
  assert(Array.isArray(data.rows)&&data.rows.length===365);
  for(const key of ['NYC311','FDNY','MTA_CBD_CRZ']){
    const src=data.sourceReads?.find(s=>s.source===key);
    assert(src&&/^[a-f0-9]{64}$/.test(src.sourceResponseSha256)&&
      src.missing.length===0,'source response fingerprint + coverage: '+key);
  }
  for(let i=0;i<365;i++){
    const row=data.rows[i];
    if(i>0)assert.equal(dateNum(row.day)-dateNum(data.rows[i-1].day),86400000);
    for(const key of [...KEYS,'crzEntries'])assert(Number.isSafeInteger(row[key])&&row[key]>0,
      'source count missing or invalid '+key+' '+i);
    assert(row.crzEntries<=row.cbdEntries,'CRZ nested inside CBD, never sum');
  }
  assert.equal(data.rows[0].day,START);assert.equal(data.rows.at(-1).day,STOP);
}
function design(rows,t,target,kind,lagShift=1){
  assert([1,2].includes(lagShift),'Lag shift must be exactly 1 or 2.');
  assert(t>=42&&t<rows.length);
  const l=(k,lag)=>log(rows[t-lag][k]);
  const avg=(k,n)=>log(m(rows.slice(t-n-lagShift+1,t-lagShift+1).map(r=>r[k])));
  const today=new Date(dateNum(rows[t].day)),dow=today.getUTCDay();
  const doy=Math.floor((dateNum(rows[t].day)-dateNum(rows[t].day.slice(0,4)+'-01-01'))/86400000);
  const ownShock=Math.log((rows[t-lagShift][target]+1)/(rows[t-lagShift-7][target]+1));
  const x=[...Array.from({length:6},(_,j)=>Number(dow===j)),
    Math.sin(2*Math.PI*doy/365.25),Math.cos(2*Math.PI*doy/365.25),
    l(target,lagShift),l(target,lagShift+6),l(target,lagShift+13),l(target,lagShift+27),
    avg(target,7),avg(target,28),ownShock,
    Math.log((rows[t-lagShift][target]+1)/(rows[t-lagShift-1][target]+1))];
  const others=KEYS.filter(k=>k!==target);
  if(kind!=='M0'){
    for(const k of others)x.push(l(k,lagShift),l(k,lagShift+6),l(k,lagShift+13),avg(k,7),avg(k,28));
  }
  if(kind==='M2'||kind==='PLACEBO'){
    for(const k of others){
      // PLACEBO preserves feature budget with a 28-day displaced historic
      // source shock, not information from the prediction date or the future.
      const a=kind==='M2'?lagShift:lagShift+27,b=a+7;
      const shock=Math.log((rows[t-a][k]+1)/(rows[t-b][k]+1));
      x.push(shock,Math.abs(shock),ownShock*shock);
    }
  }
  if(x.some(v=>!Number.isFinite(v)))throw Error('NONFINITE_DESIGN');
  return x;
}
function solve(A,B){
  const n=B.length,R=A.map((r,i)=>[...r,B[i]]);
  for(let k=0;k<n;k++){
    let best=k;
    for(let i=k+1;i<n;i++)if(Math.abs(R[i][k])>Math.abs(R[best][k]))best=i;
    [R[k],R[best]]=[R[best],R[k]];
    const pivot=R[k][k];
    if(Math.abs(pivot)<1e-11)throw Error('SINGULAR_RIDGE');
    for(let j=k;j<=n;j++)R[k][j]/=pivot;
    for(let i=0;i<n;i++)if(i!==k){
      const v=R[i][k];for(let j=k;j<=n;j++)R[i][j]-=v*R[k][j];
    }
  }
  return R.map(r=>r[n]);
}
function fit(X,Y,alpha){
  const n=X.length,p=X[0].length,mu=Array(p).fill(0),sd=Array(p).fill(0);
  for(const row of X)for(let j=0;j<p;j++)mu[j]+=row[j]/n;
  for(const row of X)for(let j=0;j<p;j++)sd[j]+=(row[j]-mu[j])**2/n;
  for(let j=0;j<p;j++)sd[j]=Math.sqrt(sd[j])||1;
  const yy=Y.map(log),my=m(yy),
    A=Array.from({length:p},()=>Array(p).fill(0)),B=Array(p).fill(0);
  for(let i=0;i<n;i++){
    const x=X[i].map((v,j)=>(v-mu[j])/sd[j]);
    for(let j=0;j<p;j++){
      B[j]+=x[j]*(yy[i]-my);
      for(let k=0;k<=j;k++)A[j][k]+=x[j]*x[k];
    }
  }
  for(let j=0;j<p;j++){
    A[j][j]+=alpha;for(let k=0;k<j;k++)A[k][j]=A[j][k];
  }
  return {mu,sd,my,coef:solve(A,B)};
}
function predict(f,x){
  let v=f.my;
  for(let i=0;i<x.length;i++)v+=f.coef[i]*(x[i]-f.mu[i])/f.sd[i];
  return Math.max(0,Math.expm1(Math.min(16,v)));
}
function loss(y,p){
  const d=y.map((v,i)=>p[i]-v);
  return {MAE:m(d.map(Math.abs)),RMSE:Math.sqrt(m(d.map(v=>v*v))),signedBias:m(d)};
}
function blockCI(d){
  let seed=20261025;
  const next=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
  const sample=[];
  for(let rep=0;rep<1200;rep++){
    const a=[];
    while(a.length<d.length){
      const k=Math.floor(next()*Math.max(1,d.length-6));
      for(let z=0;z<7&&a.length<d.length;z++)a.push(d[k+z]);
    }
    sample.push(m(a));
  }
  sample.sort((a,b)=>a-b);
  return [sample[29],sample[1169]];
}
function evaluateTarget(rows,target,lagShift=1){
  const all=rows.map((_,i)=>i).filter(i=>i>=42);
  const train=all.filter(i=>rows[i].day<='2026-04-30');
  const valid=all.filter(i=>rows[i].day>='2026-05-01'&&rows[i].day<='2026-06-30');
  const test=all.filter(i=>rows[i].day>='2026-07-01');
  assert(train.length>150&&valid.length===61&&test.length===92);
  const obs=test.map(i=>rows[i][target]);
  const models={};
  for(const kind of ['M0','M1','M2','PLACEBO']){
    const f=i=>design(rows,i,target,kind,lagShift);
    const possibilities=ALPHAS.map(alpha=>{
      const model=fit(train.map(f),train.map(i=>rows[i][target]),alpha);
      const pred=valid.map(i=>predict(model,f(i)));
      return {alpha,MAE:loss(valid.map(i=>rows[i][target]),pred).MAE};
    });
    const best=possibilities.reduce((a,b)=>b.MAE<a.MAE?b:a);
    const development=[...train,...valid];
    const model=fit(development.map(f),development.map(i=>rows[i][target]),best.alpha);
    const preds=test.map(i=>predict(model,f(i)));
    models[kind]={alpha:best.alpha,features:f(test[0]).length,
      validationMAE:best.MAE,pred:preds,test:loss(obs,preds)};
  }
  // Weekly naive is available to both policies; it uses target t-7.
  const naive=test.map(i=>rows[i-7][target]);
  function contrast(a,b){
    // Positive means b is better (smaller loss) than a.
    const d=obs.map((v,i)=>Math.abs(v-models[a].pred[i])-Math.abs(v-models[b].pred[i]));
    return {candidateMinusReferenceMAEGain:m(d),sevenDayBlockCI95:blockCI(d),
      candidateBetterDays:d.filter(x=>x>0).length,
      candidateWorseDays:d.filter(x=>x<0).length};
  }
  return {
    target,trainingDates:[rows[train[0]].day,rows[train.at(-1)].day],
    calibrationDates:[rows[valid[0]].day,rows[valid.at(-1)].day],
    evaluationDates:[rows[test[0]].day,rows[test.at(-1)].day],
    n:{train:train.length,calibration:valid.length,test:test.length},
    weeklyNaive:loss(obs,naive),
    models:Object.fromEntries(Object.entries(models).map(([k,x])=>[k,{
      selectedAlpha:x.alpha,featureCount:x.features,calibrationMAE:x.validationMAE,test:x.test}])),
    multiAgencyGainOverOwnHistory:contrast('M0','M1'),
    experimentalShockGainOverM1:contrast('M1','M2'),
    experimentalShockGainOverEqualSizePlacebo:contrast('PLACEBO','M2')
  };
}

/**
 * G2 temporal eligibility preflight only. The existing lag-1 design makes
 * true day-ahead forecasts incompatible with fully completed t-1 counts.
 * Same-day nowcasts and lag2-retrained day-ahead designs are separate
 * untrained research policies, not the original preregistered lag1 model.
 * Source receipts may satisfy clocks but never certify trained models. Does not fetch providers, fit models, verify a
 * trusted timestamp, or issue a forecast. Fail closed for *all* model variants
 * on each of the 35 prior days across all three data streams; the 35-day bound
 * includes the equal-feature placebo's displaced historic shock.
 *
 * A caller-asserted availability timestamp is NOT independent evidence. Even
 * a mechanically passing receipt remains unadmitted documentary material.
 */
function parseCanonicalUtcDay(day){
  if(typeof day!=='string'||!/^\d{4}-\d\d-\d\d$/.test(day))return NaN;
  const ms=Date.parse(day+'T00:00:00Z');
  if(!Number.isFinite(ms))return NaN;
  return new Date(ms).toISOString().slice(0,10)===day?ms:NaN;
}
function newYorkLocalClockUtc(day,hour){
  // Derive local wall-clock midnight/noon independently. Days with a DST
  // switch can be 23 or 25 hours; "midnight + 12 elapsed hours" is not noon.
  // At 00:00/12:00, America/New_York is either UTC-04 or UTC-05.
  const wallHour=String(hour).padStart(2,'0');
  const partsAt=ms=>Object.fromEntries(
    new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',
      month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',
      hourCycle:'h23'}).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
  for(const offsetHours of [4,5]){
    const ms=Date.parse(day+'T'+wallHour+':00:00Z')+offsetHours*3600000;
    const p=partsAt(ms);
    if(p.year+'-'+p.month+'-'+p.day===day&&p.hour===wallHour&&p.minute==='00')return ms;
  }
  return NaN;
}
function newYorkLocalDayStartUtc(day){
  return newYorkLocalClockUtc(day,0);
}
function assessAsOfReadiness(input){
  const problems=[];
  const issueAt=typeof input?.issueAt==='string'?input.issueAt:'';
  const targetDay=typeof input?.targetDay==='string'?input.targetDay:'';
  const forecastMode=input?.forecastMode;
  const featurePolicy=input?.featurePolicy;
  if(!['DAY_AHEAD','SAME_DAY_NOWCAST'].includes(forecastMode))problems.push('FORECAST_MODE_NOT_EXPLICIT');
  if(forecastMode==='DAY_AHEAD'&&featurePolicy!=='LAG2_RETRAIN_REQUIRED')
    problems.push('DAY_AHEAD_LAG1_FEATURE_POLICY_FORBIDDEN');
  if(forecastMode==='SAME_DAY_NOWCAST'&&featurePolicy!=='LAG1_ARCHIVED_RESEARCH')
    problems.push('NOWCAST_FEATURE_POLICY_INCONSISTENT');
  const minimumLag=forecastMode==='DAY_AHEAD'&&featurePolicy==='LAG2_RETRAIN_REQUIRED'?2:1;
  const maximumLag=minimumLag+34;
  const hasExplicitZone=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(issueAt);
  const issueMs=hasExplicitZone?Date.parse(issueAt):NaN;
  const targetMs=parseCanonicalUtcDay(targetDay);
  const localDayStartMs=Number.isFinite(targetMs)?newYorkLocalDayStartUtc(targetDay):NaN;
  const localNoonMs=Number.isFinite(targetMs)?newYorkLocalClockUtc(targetDay,12):NaN;
  if(!Number.isFinite(issueMs)||!Number.isFinite(targetMs)||
      !Number.isFinite(localDayStartMs)||!Number.isFinite(localNoonMs)){
    problems.push('INVALID_ISSUE_OR_TARGET_TIME');
  }else if(forecastMode==='DAY_AHEAD'&&issueMs>=localDayStartMs){
    problems.push('DAY_AHEAD_ISSUED_AFTER_TARGET_LOCAL_START');
  }else if(forecastMode==='SAME_DAY_NOWCAST'&&
      (issueMs<localDayStartMs||issueMs>=localNoonMs)){
    problems.push('NOWCAST_OUTSIDE_TARGET_LOCAL_MORNING_WINDOW');
  }
  const entries=Array.isArray(input?.receipts)?input.receipts:[];
  const byKey=new Map();
  for(const v of entries){
    const d=parseCanonicalUtcDay(v?.day);
    if(!KEYS.includes(v?.series)||!Number.isFinite(d)||!Number.isFinite(targetMs)||
      d>targetMs-minimumLag*86400000||d<targetMs-maximumLag*86400000){
      problems.push('UNEXPECTED_OR_FUTURE_RECEIPT:'+String(v?.series)+'|'+String(v?.day));
      continue;
    }
    const key=(v?.series??'')+'|'+(v?.day??'');
    if(byKey.has(key)){problems.push('DUPLICATE_RECEIPT:'+key);continue;}
    byKey.set(key,v);
  }
  if(Number.isFinite(targetMs)){
    for(const series of KEYS){
      for(let lag=minimumLag;lag<=maximumLag;lag++){
        const day=new Date(targetMs-lag*86400000).toISOString().slice(0,10);
        const item=byKey.get(series+'|'+day);
        if(!item){problems.push('MISSING_DAY_RECEIPT:'+series+'|'+day);continue;}
        if(!Number.isSafeInteger(item.value)||item.value<0)problems.push('INVALID_OBSERVATION:'+series+'|'+day);
        if(!/^[a-f0-9]{64}$/.test(item.sourceResponseSha256??''))problems.push('MISSING_SOURCE_RESPONSE_DIGEST:'+series+'|'+day);
        const validTimestamp=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(v);
        const seenMs=validTimestamp(item.capturedAt)?Date.parse(item.capturedAt):NaN;
        const availableMs=validTimestamp(item.firstAvailableAt)?Date.parse(item.firstAvailableAt):NaN;
        // A daily total cannot exist before the following NYC-local midnight,
        // including the correct DST boundary. This is only a lower bound.
        const nextDay=new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10);
        const minimumCompleteDailyMs=newYorkLocalDayStartUtc(nextDay);
        if(Number.isFinite(availableMs)&&availableMs<minimumCompleteDailyMs)
          problems.push('DAILY_TOTAL_CANNOT_PRECEDE_DAY_COMPLETION:'+series+'|'+day);
        if(!Number.isFinite(seenMs)||!Number.isFinite(availableMs)){
          problems.push('UNKNOWN_FIRST_AVAILABLE_OR_CAPTURE_TIME:'+series+'|'+day);
        }else if(seenMs>issueMs||availableMs>issueMs||availableMs>seenMs){
          problems.push('NOT_AVAILABLE_AT_ISSUE:'+series+'|'+day);
        }
      }
    }
  }
  return {
    status:problems.length?'ABSTAIN':'TEMPORAL_CONSISTENCY_PASS_ONLY',
    epistemicClass:'DECLARED_RECEIPT_TIMES_NOT_CANONICALLY_VERIFIED',
    forecastMode,
    featurePolicy,
    minimumLag,
    maximumLag,
    modelFittedForPolicy:false,
    targetLocalDayStartAt:Number.isFinite(localDayStartMs)?new Date(localDayStartMs).toISOString():null,
    targetLocalNoonAt:Number.isFinite(localNoonMs)?new Date(localNoonMs).toISOString():null,
    forecastKindEligible:forecastMode==='DAY_AHEAD'&&!problems.length?'DAY_AHEAD_DOCUMENTARY_CONSISTENCY_ONLY':
      forecastMode==='SAME_DAY_NOWCAST'&&!problems.length?'NOWCAST_DOCUMENTARY_CONSISTENCY_ONLY':'ABSTAIN',
    requiredDailyReceipts:35*KEYS.length,
    providedDailyReceipts:entries.length,
    problemCount:problems.length,
    problems:problems.slice(0,18),
    sourceProvenanceIndependentlyVerified:false,
    mayPublishForecast:false,
    canonicalMIHMValidated:false,
    returnObserved:false,
  };
}

function study(data){
  validate(data);
  return {
    status:'OBSERVED_HISTORICAL_RETROSPECTIVE_NOT_PROSPECTIVE',
    claim:'NO_INFERRED_CAUSAL_LINK_OR_CANONICAL_MIHM',
    boundary:'Manhattan borough (311 and FDNY) vs nested CBD (road entries)',
    covariateAvailabilityAtHistoricT0:'NOT_VERIFIED',
    preregistration:'INTERNAL_PROTOCOL_FROZEN_PRE_COLLECTION_NOT_INDEPENDENT',
    allTargetsReported:true,
    methodology:'log-count ridge, train-only scaling, independent per-model validation alpha, fixed July-September evaluation',
    sourceProvenance:data.sourceReads.map(({source,sourceResponseSha256})=>({source,sourceResponseSha256})),
    results:KEYS.map(k=>evaluateTarget(data.rows,k))
  };
}

function studyLag2(data){
  validate(data);
  return {
    status:'POSTHOC_RETROSPECTIVE_G2B_LAG2_RETRAIN_NOT_PROSPECTIVE',
    claim:'NO_CANONICAL_MIHM_OR_DAYAHEAD_VALIDATION',
    modelVariant:'SEPARATE_G2B_LAG2_RETROSPECTIVE',
    inputAvailabilityAtHistoricT0:'NOT_VERIFIED',
    reference:'Original G2 preregistration unchanged. The feature policy has changed; re-fit all four models, including equal-budget placebo, with the same dev/validation/test dates.',
    geographicBoundary:'NYC311 and FDNY Manhattan borough; CBD entries nested geography; no causal attribution',
    noForecastIssued:true,
    mayPublishScienceValidation:false,
    outputHeldOutRetrospectively:true,
    results:KEYS.map(k=>evaluateTarget(data.rows,k,2)),
  };
}
function selfTest(){
  const rows=Array.from({length:365},(_,i)=>{
    const t=dateNum(START)+i*86400000,day=new Date(t).toISOString().slice(0,10);
    return {day,service311:1600+(i%7)*85+Math.floor(i/17),
      fdnyCount:360+(i%7)*8+Math.floor(i/30),
      cbdEntries:450000+(i%7)*12000+i*45,
      crzEntries:400000+(i%7)*9000+i*35};
  });
  const fake={contract:'MIHM-MANHATTAN-365D-RETROSPECTIVE-EVIDENCE-0.1',
    dataAsOfOriginalDates:'NOT_VERIFIED',
    geographyCompatibility:'HETEROGENEOUS_BOROUGH_VS_NESTED_CBD',
    sourceReads:['NYC311','FDNY','MTA_CBD_CRZ'].map(source=>({source,sourceResponseSha256:'a'.repeat(64),missing:[]})),
    rows};
  const o=study(fake);assert.equal(o.results.length,3);
  for(const r of o.results){
    assert.equal(r.n.test,92);assert.equal(r.n.calibration,61);
    assert(Number.isFinite(r.models.M2.test.MAE));
    assert.equal(r.models.M2.featureCount,r.models.PLACEBO.featureCount);
  }
  const copy=structuredClone(rows);copy[250].fdnyCount+=1000000;
  for(const kind of ['M0','M1','M2','PLACEBO'])assert.deepEqual(
    design(rows,250,'fdnyCount',kind),design(copy,250,'fdnyCount',kind),
    'same-day target is not visible in same-day features');
  // G2B is a separate post-hoc reconstruction. No target t or t-1 count
  // may affect any candidate's feature vector for target day t.
  const lag2=studyLag2(fake);
  assert.equal(lag2.results.length,3);
  assert.equal(lag2.noForecastIssued,true);
  for(const r of lag2.results){
    assert.equal(r.n.test,92);
    assert.equal(r.models.M2.featureCount,r.models.PLACEBO.featureCount);
    for(const model of Object.values(r.models))assert(Number.isFinite(model.test.MAE));
  }
  const late=structuredClone(rows);
  late[249].fdnyCount+=987654;
  late[249].service311+=123456;
  late[249].cbdEntries+=456789;
  for(const k of KEYS)for(const kind of ['M0','M1','M2','PLACEBO']){
    assert.deepEqual(design(rows,250,k,kind,2),design(late,250,k,kind,2),
      'lag-2 experimental design cannot use the preceding day t-1');
  }
  assert.notDeepEqual(design(rows,250,'service311','M2',1),
    design(rows,250,'service311','M2',2),
    'lag-1 and lag-2 experiment variants must be distinct');
  const bad=structuredClone(fake);bad.rows[42].crzEntries=bad.rows[42].cbdEntries+1;
  assert.throws(()=>study(bad),/CRZ nested/);
  // Explicitly refuse retrospective cohorts as real-time predictors.
  const issueAt='2026-11-02T09:00:00Z',targetDay='2026-11-02';
  const base={forecastMode:'SAME_DAY_NOWCAST',featurePolicy:'LAG1_ARCHIVED_RESEARCH',issueAt,targetDay};
  const complete=[];
  for(const series of KEYS)for(let lag=1;lag<=35;lag++){
    const day=new Date(Date.parse(targetDay+'T00:00:00Z')-lag*86400000).toISOString().slice(0,10);
    const nextDay=new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10);
    const availableAt=new Date(newYorkLocalDayStartUtc(nextDay)).toISOString();
    complete.push({series,day,value:0,sourceResponseSha256:'b'.repeat(64),
      firstAvailableAt:availableAt,capturedAt:'2026-11-02T08:00:00Z'});
  }
  assert.equal(newYorkLocalClockUtc('2026-11-01',12),Date.parse('2026-11-01T17:00:00Z'));
  assert.equal(newYorkLocalClockUtc('2026-03-08',12),Date.parse('2026-03-08T16:00:00Z'));
  // Fall-back has 13 elapsed hours from midnight to noon, spring-forward 11.
  const fallMorning=assessAsOfReadiness({...base,targetDay:'2026-11-01',
    issueAt:'2026-11-01T16:30:00Z',receipts:[]});
  assert(!fallMorning.problems.includes('NOWCAST_OUTSIDE_TARGET_LOCAL_MORNING_WINDOW'));
  const fallAfternoon=assessAsOfReadiness({...base,targetDay:'2026-11-01',
    issueAt:'2026-11-01T17:00:00Z',receipts:[]});
  assert(fallAfternoon.problems.includes('NOWCAST_OUTSIDE_TARGET_LOCAL_MORNING_WINDOW'));
  const springMorning=assessAsOfReadiness({...base,targetDay:'2026-03-08',
    issueAt:'2026-03-08T15:30:00Z',receipts:[]});
  assert(!springMorning.problems.includes('NOWCAST_OUTSIDE_TARGET_LOCAL_MORNING_WINDOW'));
  const springAfternoon=assessAsOfReadiness({...base,targetDay:'2026-03-08',
    issueAt:'2026-03-08T16:30:00Z',receipts:[]});
  assert(springAfternoon.problems.includes('NOWCAST_OUTSIDE_TARGET_LOCAL_MORNING_WINDOW'));
  const mechanicallyComplete=assessAsOfReadiness({...base,receipts:complete});
  // Day-ahead would have to be issued before NYC midnight of target day;
  // complete t-1 aggregates cannot be available prior to that same midnight.
  const dayAhead=assessAsOfReadiness({...base,forecastMode:'DAY_AHEAD',receipts:complete});
  assert.equal(dayAhead.status,'ABSTAIN');
  assert(dayAhead.problems.includes('DAY_AHEAD_ISSUED_AFTER_TARGET_LOCAL_START'));
  assert(dayAhead.problems.includes('DAY_AHEAD_LAG1_FEATURE_POLICY_FORBIDDEN'));
  // A distinct lag-2 design could be temporally eligible before target-day
  // midnight, but must be retrained and registered before any real forecast.
  const dayAheadIssue='2026-11-01T21:00:00Z';
  const dayAheadReceipts=[];
  for(const series of KEYS)for(let lag=2;lag<=36;lag++){
    const day=new Date(Date.parse(targetDay+'T00:00:00Z')-lag*86400000).toISOString().slice(0,10);
    const nextDay=new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10);
    dayAheadReceipts.push({series,day,value:0,sourceResponseSha256:'c'.repeat(64),
      firstAvailableAt:new Date(newYorkLocalDayStartUtc(nextDay)).toISOString(),
      capturedAt:'2026-11-01T20:00:00Z'});
  }
  const lag2Check=assessAsOfReadiness({forecastMode:'DAY_AHEAD',
    featurePolicy:'LAG2_RETRAIN_REQUIRED',issueAt:dayAheadIssue,targetDay,
    receipts:dayAheadReceipts});
  assert.equal(lag2Check.status,'TEMPORAL_CONSISTENCY_PASS_ONLY');

  // The day-ahead policy must never accept unvalidated lag-1 observations.
  // Previously a stray lag-1 row bypassed the 2..36 validation loop.
  assert(Number.isNaN(parseCanonicalUtcDay('2026-02-30')));
  assert(Number.isNaN(parseCanonicalUtcDay('2026-11-31')));
  assert.equal(parseCanonicalUtcDay('2026-03-20'),Date.parse('2026-03-20T00:00:00Z'));
  const nonexistent=structuredClone(dayAheadReceipts);
  nonexistent.push({series:'fdnyCount',day:'2026-10-32',value:null,
    sourceResponseSha256:'',firstAvailableAt:'2027-01-01T00:00:00Z'});
  assert.equal(assessAsOfReadiness({forecastMode:'DAY_AHEAD',
    featurePolicy:'LAG2_RETRAIN_REQUIRED',issueAt:dayAheadIssue,targetDay,
    receipts:nonexistent}).status,'ABSTAIN');
  assert.equal(assessAsOfReadiness({...base,targetDay:'2026-02-30',
    receipts:complete}).status,'ABSTAIN');

  // Regression for the original reviewer counterexample: JS Date.parse
  // normalized nonexistent Feb 30 into March, leaving an unchecked extra.
  const marchTarget='2026-03-20',marchIssue='2026-03-19T21:00:00Z';
  const marchReceipts=[];
  for(const series of KEYS)for(let lag=2;lag<=36;lag++){
    const day=new Date(Date.parse(marchTarget+'T00:00:00Z')-lag*86400000)
      .toISOString().slice(0,10);
    const nextDay=new Date(Date.parse(day+'T00:00:00Z')+86400000)
      .toISOString().slice(0,10);
    marchReceipts.push({series,day,value:0,sourceResponseSha256:'d'.repeat(64),
      firstAvailableAt:new Date(newYorkLocalDayStartUtc(nextDay)).toISOString(),
      capturedAt:'2026-03-19T20:00:00Z'});
  }
  const marchBase={forecastMode:'DAY_AHEAD',featurePolicy:'LAG2_RETRAIN_REQUIRED',
    issueAt:marchIssue,targetDay:marchTarget};
  assert.equal(assessAsOfReadiness({...marchBase,receipts:marchReceipts}).status,
    'TEMPORAL_CONSISTENCY_PASS_ONLY');
  marchReceipts.push({series:'fdnyCount',day:'2026-02-30',value:null,
    sourceResponseSha256:'',firstAvailableAt:'2027-01-01T00:00:00Z'});
  assert.equal(assessAsOfReadiness({...marchBase,receipts:marchReceipts}).status,'ABSTAIN');

  const strayLag1=structuredClone(dayAheadReceipts);
  strayLag1.push({series:'fdnyCount',day:'2026-11-01',value:null,
    sourceResponseSha256:'',firstAvailableAt:'2027-01-01T00:00:00Z'});
  const leak=assessAsOfReadiness({forecastMode:'DAY_AHEAD',
    featurePolicy:'LAG2_RETRAIN_REQUIRED',issueAt:dayAheadIssue,targetDay,
    receipts:strayLag1});
  assert.equal(leak.status,'ABSTAIN');
  assert(leak.problems.includes('UNEXPECTED_OR_FUTURE_RECEIPT:fdnyCount|2026-11-01'));
  // Even a superficially well-formed lag-1 row is disallowed by policy.
  const plausibleStray=structuredClone(dayAheadReceipts);
  plausibleStray.push({series:'service311',day:'2026-11-01',value:100,
    sourceResponseSha256:'c'.repeat(64),
    firstAvailableAt:'2026-11-01T20:00:00Z',capturedAt:'2026-11-01T20:00:00Z'});
  assert.equal(assessAsOfReadiness({forecastMode:'DAY_AHEAD',
    featurePolicy:'LAG2_RETRAIN_REQUIRED',issueAt:dayAheadIssue,targetDay,
    receipts:plausibleStray}).status,'ABSTAIN');

  assert.equal(lag2Check.modelFittedForPolicy,false);
  assert.equal(lag2Check.mayPublishForecast,false);
  assert.equal(assessAsOfReadiness({forecastMode:'DAY_AHEAD',
    featurePolicy:'LAG1_ARCHIVED_RESEARCH',issueAt:dayAheadIssue,targetDay,
    receipts:complete}).status,'ABSTAIN');
  assert.equal(newYorkLocalDayStartUtc('2026-11-01'),Date.parse('2026-11-01T04:00:00Z'));
  assert.equal(newYorkLocalDayStartUtc('2026-11-02'),Date.parse('2026-11-02T05:00:00Z'));
  assert.equal(mechanicallyComplete.status,'TEMPORAL_CONSISTENCY_PASS_ONLY');
  assert.equal(mechanicallyComplete.forecastKindEligible,'NOWCAST_DOCUMENTARY_CONSISTENCY_ONLY');
  assert.equal(assessAsOfReadiness({issueAt,targetDay,receipts:complete}).status,'ABSTAIN');
  assert.equal(mechanicallyComplete.sourceProvenanceIndependentlyVerified,false);
  assert.equal(mechanicallyComplete.mayPublishForecast,false);
  assert.equal(assessAsOfReadiness({...base,receipts:[]}).status,'ABSTAIN');
  const stale=structuredClone(complete);
  stale.find(x=>x.series==='fdnyCount').capturedAt='2026-11-03T00:00:00Z';
  assert.equal(assessAsOfReadiness({...base,receipts:stale}).status,'ABSTAIN');
  const missing=structuredClone(complete);missing.pop();
  assert.equal(assessAsOfReadiness({...base,receipts:missing}).status,'ABSTAIN');
  const unknown=structuredClone(complete);delete unknown[0].firstAvailableAt;
  assert.equal(assessAsOfReadiness({...base,receipts:unknown}).status,'ABSTAIN');
  const invalid=structuredClone(complete);invalid[0].value=null;
  assert.equal(assessAsOfReadiness({...base,receipts:invalid}).status,'ABSTAIN');
  const futureDay=structuredClone(complete);
  futureDay.push({...complete[0],day:targetDay});
  assert.equal(assessAsOfReadiness({...base,receipts:futureDay}).status,'ABSTAIN');
  const timezoneLess=structuredClone(complete);
  timezoneLess[0].capturedAt='2026-11-02';
  assert.equal(assessAsOfReadiness({...base,receipts:timezoneLess}).status,'ABSTAIN');
  // A provider's later revised history cannot be silently backfilled.
  assert.equal(assessAsOfReadiness({...base,issueAt:'2026-11-03T00:00:00Z',receipts:complete}).status,'ABSTAIN');
  const impossible=structuredClone(complete);impossible[0].firstAvailableAt='2026-10-01T00:00:00Z';
  assert.equal(assessAsOfReadiness({...base,receipts:impossible}).status,'ABSTAIN');
  console.log(JSON.stringify({status:'SYNTHETIC_MULTISYSTEM_MODEL_QA_PASS',
    targets:KEYS.length,testDays:92,actualScientificEvidence:false}));
}
if(process.argv.includes('--self-test'))selfTest();
else if(process.argv.includes('--asof-check')){
  // Input must be a frozen receipt JSON file produced BEFORE the target day.
  const i=process.argv.indexOf('--asof-check');
  const filename=process.argv[i+1];
  if(!filename||filename.startsWith('--'))throw Error('G2_ASOF_RECEIPT_FILE_REQUIRED');
  const raw=readFileSync(filename);
  assert(raw.length<300000,'bounded G2 receipt fixture');
  const result=assessAsOfReadiness(JSON.parse(raw.toString('utf8')));
  console.log(JSON.stringify({receiptFileSHA256:createHash('sha256').update(raw).digest('hex'),...result},null,2));
  if(result.status==='ABSTAIN')process.exitCode=2;
}
else if(process.argv.includes('--verify-lag2-receipt')){
  // Audit the committed negative result against the exact archived bytes and
  // re-fit all competitor models. No provider calls and no forward forecasts.
  const raw=readFileSync(PATH);
  assert(raw.length<250000,'bounded historical data fixture');
  const sourceHash=createHash('sha256').update(raw).digest('hex');
  const receipt=JSON.parse(readFileSync(
    'docs/research/evidence/MIHM-MANHATTAN-G2B-LAG2-RETROSPECTIVE-2026-10-28.json','utf8'));
  assert.equal(receipt.source.archiveSHA256,sourceHash);
  assert.equal(receipt.design.sampleSizes.test,92);
  assert.equal(receipt.result.winsM2,0);
  assert.equal(receipt.result.status,'NOT_SUPPORTED_BY_THIS_RETROSPECTIVE_VARIANT');
  const actual=studyLag2(JSON.parse(raw.toString('utf8')));
  assert.equal(actual.status,'POSTHOC_RETROSPECTIVE_G2B_LAG2_RETRAIN_NOT_PROSPECTIVE');
  for(const target of actual.results){
    const recorded=receipt.targets.find(x=>x.target===target.target);
    assert(recorded,'missing archived target '+target.target);
    assert.equal(target.n.test,recorded.nTest);
    for(const model of ['M0','M1','M2','PLACEBO']){
      assert(Math.abs(target.models[model].test.MAE-recorded.MAE[model])<1e-8,
        'G2B negative study drift: '+target.target+' '+model);
    }
    assert(Math.abs(target.weeklyNaive.MAE-recorded.MAE.lag7)<1e-8);
    const winner=Object.entries(target.models).sort((a,b)=>a[1].test.MAE-b[1].test.MAE)[0][0];
    assert.equal(winner,recorded.winner);
    assert.notEqual(winner,'M2');
  }
  console.log(JSON.stringify({
    status:'REPRODUCED_POSTHOC_LAG2_NEGATIVE_RESULT_NOT_SCIENTIFIC_VALIDATION',
    sourceFixtureSHA256:sourceHash,nTargets:actual.results.length,
    testDaysPerTarget:92,MIHMInspiredWins:0,forecastIssued:false,
    realWorldReturnObserved:false
  }));
}
else if(process.argv.includes('--evaluate-lag2')){
  const raw=readFileSync(PATH);
  assert(raw.length<250000,'bounded historical aggregate research fixture');
  console.log(JSON.stringify({sourceFixtureSHA256:createHash('sha256').update(raw).digest('hex'),
    ...studyLag2(JSON.parse(raw.toString('utf8')))},null,2));
}
else if(process.argv.includes('--evaluate')){
  const raw=readFileSync(PATH);
  assert(raw.length<250000,'bounded official aggregate research fixture');
  console.log(JSON.stringify({sourceFixtureSHA256:createHash('sha256').update(raw).digest('hex'),
    ...study(JSON.parse(raw.toString('utf8')))},null,2));
}else throw Error('Use --self-test or --evaluate; source gathering is a separate explicit act');
