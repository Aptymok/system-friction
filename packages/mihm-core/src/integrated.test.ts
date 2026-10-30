import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from './index';
import { readFileSync } from 'node:fs';
const state=[{id:'a',C:.8,E:.4,L:.2,M:1},{id:'b',C:.6,E:.8,L:.5,M:1}];
const get=(name:string)=>{const f=(core as any)[name];assert.equal(typeof f,'function',name+' missing');return f;};
test('signed historical IHG is reproduced without clamping and invalid inputs abstain',()=>{
 const f=get('calculateMihmNodeState');const o=f(state);
 assert(Math.abs(o.ihg-.11)<1e-12);assert(Math.abs(o.ice-2/3)<1e-12);
 assert.equal(f([{id:'a',C:0,E:1,L:0,M:1}]).ihg,-1);
 assert.equal(f([]).ihg,null);assert.equal(f([{...state[0],C:null}]).ihg,null);
});
test('redistribution conserves operational load and rejects recipient overload',()=>{
 const f=get('simulateMihmRedistribution');const nodes=[{id:'a',capacity:10,load:12},{id:'b',capacity:10,load:5}];
 const o=f(nodes,[{from:'a',to:'b',amount:3}]);
 assert.equal(o.status,'SIMULATED');assert.equal(o.totalBefore,17);assert.equal(o.totalAfter,17);
 assert.equal(o.nodes[0].load,9);assert.equal(o.nodes[1].load,8);
 assert.equal(o.externalActionAuthorized,false);
 assert.equal(f(nodes,[{from:'a',to:'b',amount:6}]).status,'BLOCKED');
 assert.equal(f(nodes,[{from:'a',to:'b',amount:-1}]).status,'BLOCKED');
});
test('explicit linear dynamics project coupled states and prove only sufficient contraction',()=>{
 const f=get('projectMihmDynamics');const o=f({state:[2,0],transition:[[.5,0],[.25,.5]],forcing:[0,0],steps:2});
 assert.deepEqual(o.trajectory,[[2,0],[1,.5],[.5,.5]]);
 assert.equal(o.stability,'SUFFICIENT_CONTRACTION_OF_DECLARED_MODEL');
 assert.equal(o.realWorldHomeostasisEstablished,false);
 assert.equal(f({state:[1],transition:[[1.1]],forcing:[0],steps:1}).stability,'NOT_ESTABLISHED');
 assert.equal(f({state:[1],transition:[[NaN]],forcing:[0],steps:1}).status,'BLOCKED');
});
test('time-ordered forecast scoring compares real paired errors without cross-unit pooling',()=>{
 const f=get('compareMihmForecasts');const rows=[1,2,3].map((n)=>({id:String(n),unit:'requests/day',issuedAt:'2026-01-01T00:00:00Z',availableAt:'2026-01-01T00:00:00Z',targetAt:'2026-01-02T00:00:00Z',outcomeAvailableAt:'2026-01-03T00:00:00Z',observed:n,candidate:n+2,baseline:n+1}));
 const o=f(rows);assert.equal(o.n,3);assert.equal(o.candidateMAE,2);assert.equal(o.baselineMAE,1);assert.equal(o.relativeImprovement,-1);
 assert.equal(o.scientificValidation,false);
 assert.equal(f([{...rows[0],availableAt:'2026-01-04T00:00:00Z'}]).n,0);
 assert.equal(f([rows[0],{...rows[1],unit:'USD'}]).status,'BLOCKED');
});

test('bounded seeded uncertainty propagation is reproducible and preserves finite intervals',()=>{
 const f=get('sampleMihmUncertainty');const input={nodes:state,radius:.02,samples:100,seed:7};
 const a=f(input),b=f(input);assert.deepEqual(a,b);assert.equal(a.status,'SIMULATED');
 assert(a.ihg.min<=a.ihg.median&&a.ihg.median<=a.ihg.max);
 assert.equal(f({...input,samples:100001}).status,'BLOCKED');
});
test('pathology screening distinguishes measured capacity mismatch, fatigue and overload reachability',()=>{
 const f=get('screenMihmPathologies');
 const o=f({nodes:[{id:'a',capacity:5,declaredCapacity:10,load:8,previousCapacity:7,latency:4,previousLatency:2},{id:'b',capacity:10,declaredCapacity:10,load:2,previousCapacity:10,latency:1,previousLatency:1}],edges:[{from:'a',to:'b'}],limits:{phantomCapacityGap:2,latencyIncrease:1}});
 assert.deepEqual(o.phantomCapacity,['a']);assert.deepEqual(o.silentFatigue,['a']);assert.deepEqual(o.exposedRecipients,['b']);
 assert.equal(o.causalSepsisEstablished,false);
 assert.equal(f({nodes:[],edges:[],limits:{phantomCapacityGap:2,latencyIncrease:1}}).status,'BLOCKED');
});

test('finite forecast inputs and model coefficients cannot produce infinite published results',()=>{
 const row={id:'x',unit:'count',issuedAt:'2026-01-01T00:00:00Z',availableAt:'2026-01-01T00:00:00Z',targetAt:'2026-01-02T00:00:00Z',outcomeAvailableAt:'2026-01-03T00:00:00Z',observed:-1e308,candidate:1e308,baseline:0};
 assert.equal(get('compareMihmForecasts')([row]).status,'BLOCKED');
 assert.equal(get('projectMihmDynamics')({state:[0,0],transition:[[1e308,1e308],[0,0]],forcing:[0,0],steps:1}).status,'BLOCKED');
});

test('forecast scoring rejects future outcome receipts and nonexistent calendar dates',()=>{
 const f=get('compareMihmForecasts');const row={id:'x',unit:'count',issuedAt:'2026-02-28T00:00:00Z',availableAt:'2026-02-28T00:00:00Z',targetAt:'2026-03-01T00:00:00Z',outcomeAvailableAt:'2026-03-02T00:00:00Z',observed:1,candidate:2,baseline:1};
 assert.equal(f([row],'2026-03-01T12:00:00Z').n,0);
 assert.equal(f([{...row,issuedAt:'2026-02-30T00:00:00Z'}],'2026-03-03T00:00:00Z').n,0);
});

test('finite errors with unrepresentable error ratio leave relative improvement unknown',()=>{
 const o=get('compareMihmForecasts')([{id:'x',unit:'count',issuedAt:'2026-01-01T00:00:00Z',availableAt:'2026-01-01T00:00:00Z',targetAt:'2026-01-02T00:00:00Z',outcomeAvailableAt:'2026-01-03T00:00:00Z',observed:0,candidate:1e308,baseline:5e-324}]);
 assert.equal(o.relativeImprovement,null);
});

test('CRM uses source-defined mean R*K and missing redistribution stays unknown',()=>{
 const f=get('calculateMihmNodeState');const o=f([{id:'a',C:.8,E:.4,L:.2,M:1,R:.4,K:.5},{id:'b',C:.6,E:.8,L:.5,M:1,R:.6,K:.8}]);
 assert(Math.abs(o.crm-.34)<1e-12);
 assert.equal(f(state).crm,null);
 assert.equal(f([{...state[0],R:1.1,K:.5}]).crm,null);
});
test('v1.5 and v2 latency equations remain explicitly distinct',()=>{
 const f=get('calculateMihmNodeState');const n=[{id:'a',C:.8,E:.4,L:.5,M:0}];
 assert.equal(f(n,'LEGACY_V1_5').ihg,.2);
 assert.equal(f(n,'LEGACY_V2').ihg,0);
 assert.equal(f(n,'UNKNOWN').status,'BLOCKED');
});

test('original v1.5 node shape does not require a v2 M value',()=>{
 const f=get('calculateMihmNodeState');const nodes=[{id:'a',C:.8,E:.4,L:.5,R:.4,K:.5}];
 assert.equal(f(nodes,'LEGACY_V1_5').ihg,.2);
 assert.equal(f(nodes,'LEGACY_V2').status,'BLOCKED');
});


type ManhattanArchive = {
  contract: string; dataAsOfOriginalDates: string;
  sourceReads: Array<{source:string;sourceResponseSha256:string}>;
  rows: Array<{day:string;service311:number;fdnyCount:number;cbdEntries:number;crzEntries:number}>;
};
const archive = JSON.parse(readFileSync(
  'docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json', 'utf8'
)) as ManhattanArchive;
const calibrationInput=(metric:'service311'|'fdnyCount'|'cbdEntries'|'crzEntries')=>{
  const source=metric==='service311'?'NYC311':metric==='fdnyCount'?'FDNY':'MTA_CBD_CRZ';
  const digest=archive.sourceReads.find(item=>item.source===source)?.sourceResponseSha256;
  assert(digest,'Actual archived source fingerprint required for '+metric);
  const unit=metric==='service311'?'requests/day':metric==='fdnyCount'?'dispatches/day':'vehicle entries/day';
  return {
    boundary:metric==='cbdEntries'?'NYC CBD vehicle entries':
      metric==='crzEntries'?'NYC CRZ nested toll zone':'Manhattan borough',
    nodeRef:source, dimensionRef:metric, unit, sourceResponseSha256:digest,
    originalT0SourceAvailability:'NOT_VERIFIED' as const,
    trainThrough:'2026-04-30', validationThrough:'2026-06-30',
    rows:archive.rows.map(row=>({day:row.day,value:row[metric],state:'MEASURED' as const,unit})),
  };
};
test('MIHM P0 historical calibration reproduces four separate genuine archived series',()=>{
  assert.equal(archive.rows.length,365);
  assert.equal(archive.dataAsOfOriginalDates,'NOT_VERIFIED');
  const expected={
    service311:{threshold:728,validation:3},
    fdnyCount:{threshold:109,validation:10},
    cbdEntries:{threshold:92943,validation:3},
    crzEntries:{threshold:80164,validation:4},
  };
  for(const name of Object.keys(expected) as Array<keyof typeof expected>){
    const result=core.calibrateMihmHistoricalVariationEnvelope(calibrationInput(name));
    if(result.status!=='RETROSPECTIVE_DERIVED_ONLY')throw Error('Calibration abstained for '+name+':'+result.reason);
    assert.equal(result.threshold,expected[name].threshold,name);
    assert.equal(result.validationExceedances,expected[name].validation,name);
    assert.equal(result.nTrain,205);assert.equal(result.nValidation,61);
    assert.equal(result.nHistoricalAudit,92);
    assert.equal(result.canonicalPhiCalculated,false);
    assert.equal(result.homeostasisEstablished,false);
    assert.equal(result.externallyValidated,false);
    assert.equal(result.historicalAuditIndependentHoldout,false);
    assert.equal(result.productionPromotionAllowed,false);
    assert.equal(result.thresholdTunedOnValidationOrAudit,false);
    assert.equal(result.originalT0SourceAvailability,'NOT_VERIFIED');
  }
});
test('MIHM P0 fitting cannot leak validation or already-exposed audit outcomes into T0 threshold',()=>{
  const input=calibrationInput('service311'), before=core.calibrateMihmHistoricalVariationEnvelope(input);
  const changed={...input,rows:input.rows.map(row=>row.day>'2026-04-30'?{...row,value:row.value+1000000}:row)};
  const after=core.calibrateMihmHistoricalVariationEnvelope(changed);
  assert.equal(before.threshold,after.threshold);
  assert.equal(before.nTrain,after.nTrain);
  assert.notEqual(before.validationExceedances,after.validationExceedances);
});
test('MIHM P0 missing, synthetic, negative and mismatched-unit observations ABSTAIN (never impute zero)',()=>{
  const x=calibrationInput('fdnyCount');
  for(const changed of [
    {...x,rows:x.rows.map((r,i)=>i===12?{...r,value:null}:r)},
    {...x,rows:x.rows.map((r,i)=>i===12?{...r,value:0,state:'SIMULATED' as const}:r)},
    {...x,rows:x.rows.map((r,i)=>i===12?{...r,value:-1}:r)},
    {...x,rows:x.rows.map((r,i)=>i===12?{...r,unit:'USD'}:r)},
  ]) assert.equal(core.calibrateMihmHistoricalVariationEnvelope(changed).status,'ABSTAINED');
  const measuredZero={...x,rows:x.rows.map((r,i)=>i===12?{...r,value:0}:r)};
  assert.equal(core.calibrateMihmHistoricalVariationEnvelope(measuredZero).status,'RETROSPECTIVE_DERIVED_ONLY');
});
test('MIHM P0 duplicates, missing calendar dates and invalid calendar T0 all block',()=>{
  const x=calibrationInput('cbdEntries');
  assert.equal(core.calibrateMihmHistoricalVariationEnvelope({...x,rows:[...x.rows.slice(0,12),x.rows[11],...x.rows.slice(12)]}).status,'ABSTAINED');
  assert.equal(core.calibrateMihmHistoricalVariationEnvelope({...x,rows:x.rows.filter((_,i)=>i!==20)}).status,'ABSTAINED');
  assert.equal(core.calibrateMihmHistoricalVariationEnvelope({...x,trainThrough:'2026-02-30'}).status,'ABSTAINED');
  assert.equal(core.calibrateMihmHistoricalVariationEnvelope({...x,trainThrough:'2026-09-30'}).status,'ABSTAINED');
  assert.equal(core.calibrateMihmHistoricalVariationEnvelope({...x,validationThrough:'2026-12-31'}).status,'ABSTAINED');
});
test('MIHM P0 cannot assert original-source-vintage verification without independent evidence reference',()=>{
  const input=calibrationInput('service311');
  assert.equal(core.calibrateMihmHistoricalVariationEnvelope({...input,originalT0SourceAvailability:'DOCUMENTED'}).status,'ABSTAINED');
  const declared=core.calibrateMihmHistoricalVariationEnvelope({
    ...input,originalT0SourceAvailability:'DOCUMENTED',sourceAvailabilityEvidenceRef:'SOURCE_REVIEW_PENDING'
  });
  if(declared.status!=='RETROSPECTIVE_DERIVED_ONLY')throw Error('Unexpected abstention');
  assert.equal(declared.sourceAvailabilityIndependentlyVerifiedByThisCalculation,false);
  assert.equal(declared.prospectiveSkillEstablished,false);
});
test('MIHM P0 never combines incommensurable units, certifies causal propagation or modifies Phi',()=>{
  const results=[
    core.calibrateMihmHistoricalVariationEnvelope(calibrationInput('service311')),
    core.calibrateMihmHistoricalVariationEnvelope(calibrationInput('cbdEntries')),
  ];
  if(results[0].status!=='RETROSPECTIVE_DERIVED_ONLY'||results[1].status!=='RETROSPECTIVE_DERIVED_ONLY')throw Error('Unexpected abstention');
  assert.notEqual(results[0].unit,results[1].unit);
  assert.notEqual(results[0].threshold,results[1].threshold);
  assert(results.every(x=>x.canonicalPhiCalculated===false&&x.viabilityEstablished===false&&x.homeostasisEstablished===false));
});
