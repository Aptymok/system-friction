/**
 * Test-only child process for a restarted C07 mission worker.
 * It cannot reach a remote database and does not use any cloud credentials.
 * Reuses the existing deterministic temporal resolver, not a new agent.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { createKernelContext } from '../../src/lib/sfi/cognitive-runtime/createKernelContext';
import { TemporalResolverAgent } from '../../src/lib/sfi/cognitive-runtime/agents/temporalResolver';

const raw = new URL(process.env.SFI_RC_TEST_DATABASE_URL ?? '');
if (!['localhost','127.0.0.1','::1'].includes(raw.hostname)
    || raw.pathname !== '/sfi_rc_test' || raw.username !== 'postgres') {
  throw new Error('SFI_C07_CHILD_WORKER_DISPOSABLE_LOOPBACK_ONLY');
}
const mode=process.argv[2];
if (!['interrupt_after_append','resume'].includes(mode)) {
  throw new Error('SFI_C07_CHILD_WORKER_MODE_INVALID');
}
raw.pathname='/sfi_c07_missions_isolated';
const sql=postgres(raw.toString(), { max:1, connect_timeout:10 });
const expectedId=process.env.SFI_C07_ISOLATED_JOB_ID;
const expectedAgent='temporal_resolver';
const agentContract=readFileSync('src/lib/sfi/cognitive-runtime/agentExecutionMap.ts','utf8');
assert.match(agentContract, /temporal_resolver:[ ]*TemporalResolverAgent/);

const queryOne=async (statement,params=[])=>(await sql.unsafe(statement,params))[0]??null;

async function main(){
  const claimed=await queryOne(
    'select * from public.sfi_c07_claim_mission_v1($1,$2::integer)',
    ['isolated-process-'+mode,60]);
  assert.ok(claimed?.id,'independent worker must obtain a lease');
  assert.equal(claimed.id,expectedId);
  assert.equal(claimed.agent_id,expectedAgent);
  assert.equal(claimed.mission_id,'SFI-C06:temporal_resolver');
  const status=await queryOne(
    'select public.sfi_c07_reconcile_mission_v1($1::uuid,$2::uuid) as state',
    [claimed.id,claimed.lease_token]);
  if (mode==='resume') {
    assert.equal(status.state,'RECONCILED_COMPLETED');
    const row=await queryOne('select status,receipt_event_id,receipt_hash from public.sfi_c07_mission_jobs where id=$1::uuid',[claimed.id]);
    assert.equal(row.status,'COMPLETED');
    assert.equal(row.receipt_event_id,'isolated-child-receipt-1');
    assert.equal(row.receipt_hash,'isolated-child-hash');
    console.log(JSON.stringify({phase:'RESTARTED_PROCESS',reconciled:true,agentExecutions:0,jobId:claimed.id,attempts:claimed.attempts}));
    return;
  }
  assert.equal(status.state,'NO_RECEIPT');
  const ctx=createKernelContext(claimed.execution_id,'sfi-c07:'+claimed.execution_id,'SFI_C07_ISOLATED_RESTART');
  ctx.metadata={executionId:claimed.execution_id,missionId:claimed.mission_id,
    epistemicBoundary:'TEST_ONLY_NO_EVIDENCE_OR_EXTERNAL_RETURN'};
  const outcome=TemporalResolverAgent(ctx);
  assert.equal(outcome.metadata?.temporalResolver?.executed,true);
  assert.equal(outcome.metadata?.temporalResolver?.materialEvidenceResolved,0);
  await sql.unsafe(
    'insert into public.epistemic_events(event_id,event_name,logbook_id,payload,source,hash_self) values ($1,$2,$3,$4::text::jsonb,$5::text::jsonb,$6)',
    ['isolated-child-receipt-1','SFI_AGENT_EXECUTED','sfi-c07:'+claimed.execution_id,
      JSON.stringify({executionId:claimed.execution_id,metadata:{refs:{missionId:claimed.mission_id}}}),
      JSON.stringify({sourceId:claimed.agent_id,sourceType:'runtime'}),'isolated-child-hash']);
  // Intentionally abandon the lease after durable append, before completion.
  // The next process MUST reconcile this same receipt without executing.
  console.log(JSON.stringify({phase:'INTERRUPTED_AFTER_APPEND',persisted:true,
    completed:false,agentExecutions:1,jobId:claimed.id,attempts:claimed.attempts}));
}
try {await main()}catch(error){console.error(error);process.exitCode=1}
finally {await sql.end({timeout:3})}
