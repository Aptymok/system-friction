import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,existsSync } from 'node:fs';
import { resolve,dirname } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';

// Run the actual runtime and pure dependencies; replace only server I/O imports.
function moduleUrl(path) {
  let code=stripTypeScriptTypes(readFileSync(path,'utf8'));
  code=code.replace(/import ['"]server-only['"];?/g,'');
  code=code.replace(/from ['"]([^'"]+)['"]/g,(whole,id)=>{
    if(id.startsWith('.')) {
      const base=resolve(dirname(path),id);
      const file=id.endsWith('.ts')?base:existsSync(base+'.ts')?base+'.ts':resolve(base,'index.ts');
      return 'from '+JSON.stringify(moduleUrl(file));
    }
    if(id.startsWith('@/')) {
      const exports=id.includes('eventStore')?'export function appendEpistemicEvent(v){return globalThis.__mihmIO.append(v)}':
        id.includes('readBudget')?'export const SFI_SUPABASE_READ_BUDGET={}':
        'export function createServiceSupabaseClient(){return globalThis.__mihmIO.db}';
      return 'from '+JSON.stringify('data:text/javascript;base64,'+Buffer.from(exports).toString('base64'));
    }
    return whole;
  });
  return 'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
}
const runtime=await import(moduleUrl(resolve('src/lib/mihm/scientificMethodRuntime.ts')));
function run(attributes) {
  return runtime.executeScientificMethodsForNode({
    node:{nodeId:'system:sfi',attributes,lineage:[]},edges:[],history:[],
    reading:{methodCompetition:{candidates:[]}},
  });
}
test('existing scientific caller handles typed MIHM even without conventional candidates',()=>{
  const out=run({mihmTypedFieldAudit:{input:{}}});
  assert.equal(out.length,1);
  assert.equal(out[0].family,'MIHM_TYPED_FIELD');
  assert.equal(out[0].status,'ABSTAINED');
  assert.equal(out[0].result.audit,null);
  assert.equal(out[0].result.calibration.status,'NOT_CALIBRATED');
});
test('existing scientific caller does not invent MIHM observations for ordinary nodes',()=>{
  assert.deepEqual(run({}),[]);
});

function persistenceFixture(mode='normal') {
 let event=null;
 globalThis.__mihmIO={
  append:async input=>{event={epistemic_class:input.epistemicClass,event_id:input.eventId,event_name:input.eventName,logbook_id:input.logbookId,payload:JSON.parse(JSON.stringify(input.payload)),lineage:input.lineage};if(mode==='diverge')event.payload.nodeId='foreign';if(mode==='unsafe'){event.epistemic_class='observed';event.payload.observedClaim=true;}return{ok:true,data:event};},
  db:{from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:event,error:mode==='read-error'?{message:'unavailable'}:null})};return q;}}
 };
 return {nodeId:'case:real',actorId:'qa',trigger:'qa',executions:[{family:'MIHM_TYPED_FIELD',status:'ABSTAINED',executionLevel:'INSUFFICIENT',result:null,missing:['measurement'],limitations:['not validated'],evidenceRefs:['source:1'],historyEventIds:[],boundary:'derived'}]};
}
test('scientific persistence fails closed on an unreadable duplicate lookup',async()=>{
 const out=await runtime.persistScientificMethodExecutions(persistenceFixture('read-error'));
 assert.equal(out.ok,false);assert.equal(out.persisted,false);
});
test('scientific persistence verifies stored payload before reporting success',async()=>{
 const input=persistenceFixture();const out=await runtime.persistScientificMethodExecutions(input);
 assert.equal(out.ok,true);assert.equal(out.receiptReadBackConfirmed,true);
 const duplicate=await runtime.persistScientificMethodExecutions(input);
 assert.equal(duplicate.skipped,true);assert.equal(duplicate.receiptReadBackConfirmed,true);
});
test('an acknowledged but divergent scientific event is not confirmed',async()=>{
 const out=await runtime.persistScientificMethodExecutions(persistenceFixture('diverge'));
 assert.equal(out.ok,false);assert.equal(out.persisted,false);
});

test('persisted missing relation weights never become measured zeros in change-point screening',()=>{
 const out=runtime.executeScientificMethodsForNode({node:{nodeId:'a',attributes:{},lineage:[]},edges:[],reading:{methodCompetition:{candidates:[{family:'CHANGE_POINT',assumptionCheck:'OBSERVABLE'}]}},history:[1,2,3,4].map(i=>({eventId:String(i),occurredAt:`2026-01-0${i}T00:00:00Z`,lineage:[],snapshot:{relationTransitions:[{edgeId:'e',currentWeight:null}]}}))});
 assert.equal(out[0].status,'ABSTAINED');
});

test('readback cannot silently upgrade a derived result into an observed claim',async()=>{
 const out=await runtime.persistScientificMethodExecutions(persistenceFixture('unsafe'));
 assert.equal(out.ok,false);assert.equal(out.receiptReadBackConfirmed,false);
});
