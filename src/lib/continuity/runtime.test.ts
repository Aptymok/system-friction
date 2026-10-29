
import test from 'node:test';
import assert from 'node:assert/strict';
import * as runtime from './runtime';

const cycle='33bf9ac2-41ad-408f-bd75-b879ae6b442f';
const raw=()=>JSON.stringify({cycleId:cycle,startsAt:'2026-10-29T04:17:00Z',expiresAt:'2026-10-29T07:17:00Z'});
function fixture(){
  let time=Date.parse('2026-10-29T04:30:00Z');
  let mode='NORMAL',readable=true,closed=false,failStep='',finalized=true,reserveReadable=true;
  const claims=new Set<string>(),effects:string[]=[];
  const deps={
    now:()=>time,
    inspect:async()=>({ok:readable,mode,closed}),
    reserve:async(id:string)=>{if(!reserveReadable)return 'UNAVAILABLE';if(claims.has(id))return 'DUPLICATE';claims.add(id);return 'CLAIMED';},
    step:async(name:string,id:string)=>{effects.push(name+':'+id);return{ok:name!==failStep,processed:1};},
    finalize:async()=>finalized,
  };
  return {deps,claims,effects,setTime:(n:number)=>{time=n;},setMode:(s:string)=>{mode=s;},
    setReadable:(b:boolean)=>{readable=b;},setClosed:(b:boolean)=>{closed=b;},
    fail:(s:string)=>{failStep=s;},setFinalize:(b:boolean)=>{finalized=b;},
    setReserveReadable:(b:boolean)=>{reserveReadable=b;}};
}
async function run(f:ReturnType<typeof fixture>,override:Record<string,unknown>={}):Promise<any>{
  const execute=(runtime as any).runBoundedContinuityCycleTrial;
  assert.equal(typeof execute,'function','bounded existing-cycle execution is missing');
  return execute({raw:raw(),trigger:'github_actions_oidc',...override},f.deps);
}
test('disabled or invalid trial cannot reach primary storage or execution',async()=>{
  const f=fixture();f.setReadable(false);
  assert.equal((await run(f,{raw:undefined})).status,'CONTINUITY_TRIAL_DISABLED');
  assert.equal((await run(f,{raw:'bad'})).status,'CONTINUITY_TRIAL_INVALID');
  assert.equal(f.claims.size,0);assert.equal(f.effects.length,0);
});
test('an arbitrary requested cycle cannot expand the server-owned scope',async()=>{
  const f=fixture();
  assert.equal((await run(f,{requestedCycleId:'another-cycle'})).ok,false);
  assert.equal(f.claims.size,0);assert.equal(f.effects.length,0);
});
test('halted, recovery, unreadable or closed authority prevents reservation and effects',async()=>{
  for(const mode of ['EMERGENCY_HALT','RECOVERY','DEGRADED_SAFE','INVALID']){
    const f=fixture();f.setMode(mode);assert.equal((await run(f)).processed,0);assert.equal(f.claims.size,0);
  }
  const f=fixture();f.setReadable(false);assert.equal((await run(f)).ok,false);assert.equal(f.claims.size,0);
  const g=fixture();g.setClosed(true);assert.equal((await run(g)).status,'CONTINUITY_TRIAL_ALREADY_CLOSED');assert.equal(g.claims.size,0);
});
test('only four bounded existing cycle stages run, once per hourly slot',async()=>{
  const f=fixture();const a=await run(f);
  assert.equal(a.ok,true);assert.equal(a.processed,1);
  assert.deepEqual(f.effects,[
    'returnPlanUpgradeBefore:'+cycle,'universalCycleContinuation:'+cycle,
    'returnPlanUpgradeAfter:'+cycle,'universalEmpiricalContinuation:'+cycle]);
  const b=await run(f);
  assert.equal(b.status,'CONTINUITY_TRIAL_SLOT_ALREADY_RESERVED');assert.equal(b.processed,0);
  assert.equal(f.effects.length,4);
});
test('concurrent same-slot calls produce one reservation and one bounded sequence',async()=>{
  const f=fixture();const values=await Promise.all([run(f),run(f),run(f)]);
  assert.equal(values.filter(x=>x.processed===1).length,1);assert.equal(f.effects.length,4);
});
test('at most three slots execute and expiration cannot reset the budget',async()=>{
  const f=fixture();
  for(let i=0;i<3;i++){f.setTime(Date.parse('2026-10-29T04:30:00Z')+i*3600000);assert.equal((await run(f)).processed,1);}
  f.setTime(Date.parse('2026-10-29T07:17:00Z'));
  assert.equal((await run(f)).status,'CONTINUITY_TRIAL_EXPIRED');
  assert.equal(f.claims.size,3);assert.equal(f.effects.length,12);
});
test('a failed stage consumes its reservation and suppresses subsequent stages',async()=>{
  const f=fixture();f.fail('universalCycleContinuation');
  const a=await run(f);assert.equal(a.ok,false);
  assert.equal(f.effects.length,2);assert.equal((await run(f)).processed,0);
  assert.equal(f.effects.length,2);
});
test('unavailable primary reservation fails closed without continuation',async()=>{
  const f=fixture();f.setReserveReadable(false);assert.equal((await run(f)).ok,false);assert.equal(f.effects.length,0);
});
test('unconfirmed final receipt is never presented as completed',async()=>{
  const f=fixture();f.setFinalize(false);
  const a=await run(f);assert.equal(a.ok,false);assert.equal(a.status,'CONTINUITY_TRIAL_RECEIPT_NOT_CONFIRMED');
});
test('expiry during an execution stops later stages while preserving the spent slot',async()=>{
  const f=fixture();
  const step=f.deps.step;
  f.deps.step=async(name,id)=>{const r=await step(name,id);f.setTime(Date.parse('2026-10-29T07:17:00Z'));return r;};
  const a=await run(f);assert.equal(a.ok,false);assert.equal(f.effects.length,1);assert.equal(f.claims.size,1);
});

test('authority reads crossing the grant end cannot start an effect',async()=>{
  const f=fixture();let reads=0;const original=f.deps.inspect;
  f.deps.inspect=async()=>{const value=await original();if(++reads===2)f.setTime(Date.parse('2026-10-29T07:17:00Z'));return value;};
  const a=await run(f);assert.equal(a.ok,false);assert.equal(f.effects.length,0);
});
test('initial authority read crossing the slot cannot consume the old slot',async()=>{
  const f=fixture();const original=f.deps.inspect;
  f.deps.inspect=async()=>{const value=await original();f.setTime(Date.parse('2026-10-29T05:17:00Z'));return value;};
  assert.equal((await run(f)).processed,0);assert.equal(f.claims.size,0);assert.equal(f.effects.length,0);
});

import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
test('real hourly receipt validator accepts executed, duplicate, closed and expired trial envelopes',async()=>{
  const workflow=readFileSync('.github/workflows/sfi-continuity-hourly.yml','utf8');
  const marker='python - "$response_file" "$CYCLE_ID" "$TARGET_SOURCE" <<\'PY\'';
  const start=workflow.indexOf(marker);
  assert(start>=0,'actual receipt parser must be available');
  const rest=workflow.slice(start+marker.length);
  const end=rest.indexOf('\n          PY');
  assert(end>=0);
  const parser=rest.slice(0,end).split('\n').map(line=>line.startsWith('          ')?line.slice(10):line).join('\n');
  const f=fixture();const outputs=[await run(f),await run(f)];
  const closed=fixture();closed.setClosed(true);outputs.push(await run(closed));
  const expired=fixture();expired.setTime(Date.parse('2026-10-29T07:17:00Z'));outputs.push(await run(expired));
  const directory=mkdtempSync(join(tmpdir(),'sfi-trial-receipt-'));
  try{
    for(const output of outputs){
      const file=join(directory,'receipt.json');
      // The route attaches the existing canonical readTargetCycleProof result.
      writeFileSync(file,JSON.stringify({...output,targetCycleState:{ok:true,cycleId:cycle,eventCount:24,state:'AWAITING_RETURN'}}));
      const checked=spawnSync('python3',['-',file,cycle,'workflow_dispatch'],{input:parser,encoding:'utf8'});
      assert.equal(checked.status,0,output.status+': '+checked.stderr);
    }
  }finally{rmSync(directory,{recursive:true,force:true});}
});
