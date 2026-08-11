import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createAdminClient, nowStamp } from './sfi-db-client.mjs';

const supabase=createAdminClient();
const cycleId=(process.env.SFI_FULL_CYCLE_ID??'').trim();
let query=supabase.from('sfi_operating_cycles')
  .select('id,cycle_code,title,status,metadata,started_at,updated_at,closed_at')
  .eq('status','CLOSED')
  .order('closed_at',{ascending:false})
  .limit(1);
if(cycleId)query=supabase.from('sfi_operating_cycles')
  .select('id,cycle_code,title,status,metadata,started_at,updated_at,closed_at')
  .eq('id',cycleId)
  .limit(1);
const result=await query.maybeSingle();
if(result.error||!result.data){
  console.error(JSON.stringify({ok:false,error:'full_cycle_proof_cycle_not_found',details:result.error?.message??null,cycleId:cycleId||null},null,2));
  process.exit(1);
}
const metadata=result.data.metadata&&typeof result.data.metadata==='object'&&!Array.isArray(result.data.metadata)?result.data.metadata:{};
const proof=metadata.fullCycleProof;
if(!proof||typeof proof!=='object'||Array.isArray(proof)||proof.complete!==true){
  console.error(JSON.stringify({ok:false,error:'cycle_does_not_contain_complete_full_cycle_proof',cycleId:result.data.id,cycleCode:result.data.cycle_code,status:result.data.status,proof:proof??null},null,2));
  process.exit(1);
}
const required=['evidence','studio','method_lab','field','cognitive_twin','institutional_cycle','readiness'];
const steps=Array.isArray(proof.steps)?proof.steps:[];
for(const id of required){
  const step=steps.find(item=>item&&typeof item==='object'&&item.id===id);
  if(!step||step.status!=='PASS'){
    console.error(JSON.stringify({ok:false,error:`full_cycle_proof_step_not_pass:${id}`,cycleId:result.data.id,step:step??null},null,2));
    process.exit(1);
  }
}
const receipt={
  contract:'SFI-FULL-CYCLE-PROOF-EXPORT-1.0',
  exportedAt:new Date().toISOString(),
  cycle:{id:result.data.id,cycleCode:result.data.cycle_code,title:result.data.title,status:result.data.status,startedAt:result.data.started_at,closedAt:result.data.closed_at},
  proof,
  boundary:'This file exports a proof receipt already persisted by the production SFI operating cycle. It does not create, modify or promote evidence.',
};
await mkdir(path.join('docs','db'),{recursive:true});
const target=path.join('docs','db',`SFI_FULL_CYCLE_PROOF_${nowStamp()}.json`);
await writeFile(target,JSON.stringify(receipt,null,2),'utf8');
console.log(JSON.stringify({ok:true,target,cycleId:result.data.id,cycleCode:result.data.cycle_code,steps:required},null,2));