
import test from 'node:test';
import assert from 'node:assert/strict';
import {runUniversalCycleContinuation} from './universalCycleContinuation';
import {runUniversalReturnPlanUpgrade} from './universalReturnPlanUpgrade';
import {runUniversalEmpiricalContinuation} from './universalEmpiricalContinuation';

const target='33bf9ac2-41ad-408f-bd75-b879ae6b442f';
type RecordRow=Record<string,any>;
// Transport double preserves query semantics over 600 genuinely distinct
// unrelated records. The assertion concerns target selection, not mock calls.
function primary(rows:RecordRow[]){
  return {from:()=> {
    const predicates:Array<(r:RecordRow)=>boolean>=[];
    let max=Infinity,single=false;
    const query:any={
      select:()=>query,
      eq:(key:string,value:unknown)=>{predicates.push(r=>r[key]===value);return query;},
      in:(key:string,values:unknown[])=>{predicates.push(r=>values.includes(r[key]));return query;},
      order:()=>query,limit:(n:number)=>{max=n;return query;},
      maybeSingle:()=>{single=true;return query;},
      then:(resolve:(r:unknown)=>unknown)=> {
        const data=rows.filter(r=>predicates.every(p=>p(r))).sort((a,b)=>b.sequence-a.sequence).slice(0,max);
        return Promise.resolve({error:null,data:single?data[0]??null:data}).then(resolve);
      },
    };
    return query;
  }};
}
function event(sequence:number,id:string,name:string,payload:RecordRow={}){
  return {sequence,event_id:'event-'+sequence,event_name:name,logbook_id:'universal-cycle:'+id,payload:{cycleId:id,...payload}};
}
function crowd(name:string){return Array.from({length:600},(_,i)=>event(100+i,'unrelated-'+i,name));}
test('targeted cognitive recovery includes a cycle older than 500 unrelated events',async()=>{
  const rows=[event(1,target,'SFI_UNIVERSAL_COGNITIVE_CHECKPOINT'),
    event(2,target,'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED',{completed:true}),
    ...crowd('SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED')];
  const result=await runUniversalCycleContinuation({cycleId:target,limit:1},{
    db:primary(rows) as any,
    continueCandidate:async track=>({cycleId:track.cycleId,state:'TEST_TARGET_SELECTED'}),
  });
  assert.equal(result.ok,true);assert.equal(result.processed,1);
  assert.equal((result.results[0] as any).cycleId,target);
});
test('targeted return-plan reader includes an old cycle and truthfully reports missing checkpoint',async()=>{
  const rows=[event(1,target,'SFI_UNIVERSAL_RETURN_PLAN_RECORDED',{plan:{acquisitionState:'CAPABILITY_RESOLUTION_REQUIRED'}}),
    ...crowd('SFI_UNIVERSAL_RETURN_PLAN_RECORDED')];
  const result=await runUniversalReturnPlanUpgrade({cycleId:target,limit:1},{db:primary(rows) as any});
  assert.equal(result.processed,1);
  assert.equal(result.results[0].cycleId,target);
  assert.equal(result.results[0].state,'RETURN_PLAN_CONTEXT_UNAVAILABLE');
});
test('targeted empirical reader includes an old RETURN without executing unrelated cycles',async()=>{
  const rows=[event(1,target,'SFI_UNIVERSAL_RETURN_RECORDED'),...crowd('SFI_UNIVERSAL_RETURN_RECORDED')];
  const result=await runUniversalEmpiricalContinuation({cycleId:target,limit:1},{
    db:primary(rows) as any,
    continueCycle:async cycleId=>({cycleId,state:'TEST_TARGET_SELECTED'}),
  });
  assert.equal(result.processed,1);
  assert.deepEqual(result.results,[{cycleId:target,state:'TEST_TARGET_SELECTED'}]);
});
