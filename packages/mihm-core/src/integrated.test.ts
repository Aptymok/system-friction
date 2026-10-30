import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from './index';
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
