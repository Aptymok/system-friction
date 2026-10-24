/**
 * C07 isolated 2-session PostgreSQL 17 verification.
 * No remote host, production schema, connected provider or paid executor.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

const env = process.env.SFI_RC_TEST_DATABASE_URL;
const base = new URL(env ?? '');
if (!['localhost','127.0.0.1','::1'].includes(base.hostname) ||
    base.pathname !== '/sfi_rc_test' || base.username !== 'postgres') {
  throw new Error('SFI_C07_DISPOSABLE_PG17_LOOPBACK_ONLY');
}
const isolation = 'sfi_c07_missions_isolated';
const control = new URL(base);
control.pathname = '/postgres';
const target = new URL(base);
target.pathname = '/' + isolation;
const controlDb = postgres(control.toString(), { max: 1, connect_timeout: 10 });
let db;
let a;
let b;
const tenant = '00000000-0000-4000-8000-000000000020';
const tenantOther = '00000000-0000-4000-8000-000000000021';
const actor = '00000000-0000-4000-8000-000000000022';
const digest = 'a'.repeat(64);
const fakePayload = { mission: 'SFI-C06:temporal_resolver', objective: 'Isolated dry-run only' };
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const queryOne = async (sql, stmt, params=[]) => (await sql.unsafe(stmt,params))[0] ?? null;
const enqueue = (key, t=tenant, d=digest, request=fakePayload) =>
  queryOne(db, 'select * from public.sfi_c07_enqueue_mission_v1($1::uuid,$2::uuid,$3,$4,$5,$6,$7::jsonb,$8::int)',
    [t, actor, 'SFI-C06:temporal_resolver', 'temporal_resolver', key, d, JSON.stringify(request), 2]);
const claim = (sql, worker) => queryOne(sql,
  'select * from public.sfi_c07_claim_mission_v1($1,$2::int)',[worker,60]);
const cancel = (id, t=tenant) => queryOne(db,
  'select public.sfi_c07_cancel_mission_v1($1::uuid,$2::uuid) as value',[id,t]);
const fail = (id, token, reason, delay=0) => queryOne(db,
  'select public.sfi_c07_fail_mission_v1($1::uuid,$2::uuid,$3,$4::int) as value',
  [id, token, reason, delay]);
const complete = (id, token, eventId, hash) => queryOne(db,
  'select public.sfi_c07_complete_mission_v1($1::uuid,$2::uuid,$3,$4) as value',
  [id, token, eventId, hash]);
const stored = id => queryOne(db,'select * from public.sfi_c07_mission_jobs where id=$1::uuid',[id]);
const addReceipt = (job, eventId) => db.unsafe(
  'insert into public.epistemic_events(event_id,event_name,logbook_id,payload,source,hash_self) values ($1,$2,$3,$4::jsonb,$5::jsonb,$6)',
  [eventId,'SFI_AGENT_EXECUTED','sfi-c07:' + job.execution_id,
  JSON.stringify({executionId:job.execution_id,metadata:{refs:{missionId:job.mission_id}}}),
  JSON.stringify({sourceId:job.agent_id,sourceType:'runtime'}),'isolated-event-hash']
);
async function test() {
  await controlDb.unsafe('create database ' + isolation);
  db=postgres(target.toString(),{max:2,connect_timeout:10});
  a=postgres(target.toString(),{max:1,connect_timeout:10});
  b=postgres(target.toString(),{max:1,connect_timeout:10});
  await db.unsafe('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.unsafe(`create table public.epistemic_events(
    event_id text not null primary key, event_name text not null, logbook_id text not null,
    payload jsonb not null, source jsonb not null, hash_self text not null
  )`);
  await db.unsafe(readFileSync('scripts/reality_chain/c07_governed_mission_queue_candidate.sql','utf8'));
  const acl=await queryOne(db,`select
    has_table_privilege('anon','public.sfi_c07_mission_jobs','select') as anon_table,
    has_function_privilege('authenticated','public.sfi_c07_claim_mission_v1(text,integer)','execute') as authenticated_claim,
    has_function_privilege('service_role','public.sfi_c07_claim_mission_v1(text,integer)','execute') as service_claim`);
  assert.equal(acl.anon_table,false);
  assert.equal(acl.authenticated_claim,false);
  assert.equal(acl.service_claim,true);
  assert.equal((await queryOne(db, 'select relrowsecurity as rls from pg_class where oid=$1::regclass',
    ['public.sfi_c07_mission_jobs'])).rls,true);

  // Concurrently inserting the same idempotency key never creates a second job.
  const [first,again]=await Promise.all([enqueue('same-client-attempt'),enqueue('same-client-attempt')]);
  assert.equal(first.id,again.id);
  assert.equal(first.execution_id,again.execution_id);
  assert.equal((await queryOne(db,'select count(*)::int as n from public.sfi_c07_mission_jobs')).n,1);
  await assert.rejects(enqueue('same-client-attempt',tenant,'b'.repeat(64)),
    /SFI_C07_IDEMPOTENCY_CONFLICT/);

  // Two independent connections race for a single job. A retains its row lock.
  await a.unsafe('begin');
  let open=true;
  let taken;
  try {
    taken=await claim(a,'worker-alpha');
    assert.equal(taken.id,first.id);
    assert.equal(taken.attempts,1);
    const other=await claim(b,'worker-beta');
    assert.equal(other,null,'SKIP LOCKED must not double-claim a leased row');
    await a.unsafe('commit');
    open=false;
  } finally {
    if(open) await a.unsafe('rollback');
  }
  assert.equal((await claim(b,'worker-beta')),null,'a current lease prevents replay');
  assert.equal((await queryOne(db,
    'select public.sfi_c07_renew_mission_v1($1::uuid,$2::uuid,$3::int) as value',
    [taken.id,taken.lease_token,60])).value,true);

  // A deliberate isolated expiry allows one bounded recovery with a NEW token.
  await db.unsafe('update public.sfi_c07_mission_jobs set lease_until=now()-interval \'1 second\' where id=$1::uuid',[taken.id]);
  const resumed=await claim(b,'worker-beta');
  assert.equal(resumed.id,taken.id);
  assert.equal(resumed.attempts,2);
  assert.notEqual(resumed.lease_token,taken.lease_token);
  assert.equal((await queryOne(db,
    'select public.sfi_c07_renew_mission_v1($1::uuid,$2::uuid,$3::int) as value',
    [taken.id,taken.lease_token,60])).value,false);
  assert.equal((await complete(resumed.id,taken.lease_token,'event-1','isolated-event-hash')).value,false,
    'stale workers cannot complete a reclaimed lease');

  // Completion cannot succeed with a fabricated or mismatched ledger receipt.
  assert.equal((await complete(resumed.id,resumed.lease_token,'event-1','isolated-event-hash')).value,false);
  await addReceipt(resumed,'event-1');
  assert.equal((await complete(resumed.id,resumed.lease_token,'event-1','wrong-hash')).value,false);
  assert.equal((await complete(resumed.id,resumed.lease_token,'event-1','isolated-event-hash')).value,true);
  assert.equal((await stored(resumed.id)).status,'COMPLETED');
  assert.equal((await complete(resumed.id,resumed.lease_token,'event-1','isolated-event-hash')).value,false);

  // Cancel an unclaimed job; a different tenant cannot cancel it.
  const queued=await enqueue('cancel-test');
  assert.equal((await cancel(queued.id,tenantOther)).value,'NOT_CANCELLABLE');
  assert.equal((await cancel(queued.id)).value,'CANCELLED');
  assert.equal((await stored(queued.id)).status,'CANCELLED');

  // A running job enters cancellation-requested and cannot acknowledge completion.
  const toCancel=await enqueue('cancel-running');
  const running=await claim(a,'worker-cancel');
  assert.equal(running.id,toCancel.id);
  assert.equal((await cancel(running.id)).value,'RUNNING');
  assert.equal((await complete(running.id,running.lease_token,'event-1','isolated-event-hash')).value,false);
  assert.equal((await fail(running.id,running.lease_token,'CANCELLED_BY_OPERATOR')).value,'CANCELLED');
  assert.equal((await stored(running.id)).status,'CANCELLED');

  // A failed worker may requeue only within max-attempts.
  const job=await enqueue('failure-retry');
  const one=await claim(a,'worker-retry');
  assert.equal(one.id,job.id);
  assert.equal((await fail(one.id,one.lease_token,'TRANSIENT_WORKER_FAILURE')).value,'QUEUED');
  const two=await claim(b,'worker-retry');
  assert.equal(two.id,job.id);
  assert.equal(two.attempts,2);
  assert.equal((await fail(two.id,two.lease_token,'TRANSIENT_WORKER_FAILURE')).value,'BLOCKED');
  assert.equal((await stored(two.id)).status,'BLOCKED');

  // Same idempotency key is unique per tenant; it does not merge tenants.
  const differentTenant=await enqueue('same-client-attempt',tenantOther);
  assert.notEqual(differentTenant.id,first.id);
  assert.equal(differentTenant.tenant_id,tenantOther);

  // An expired job cannot start.
  const expired=await enqueue('expiry-test');
  await db.unsafe('update public.sfi_c07_mission_jobs set expires_at=now()-interval \'1 second\' where id=$1::uuid',[expired.id]);
  const claimed=await claim(b,'worker-expires');
  assert.ok(!claimed || claimed.id!==expired.id);
  assert.equal((await stored(expired.id)).status,'BLOCKED');
  const total=(await queryOne(db,'select count(*)::int n from public.sfi_c07_mission_jobs')).n;
  console.log(JSON.stringify({
    pass:'C07_PG17_DURABLE_MISSION_QUEUE_TWO_SESSIONS',
    database:isolation, jobs:total, idempotency:true, twoSessionClaimExclusion:true,
    leaseExpiryRecovery:true, fencing:true, receiptIdentityEnforced:true,
    cancellation:true, retriesExhausted:true, tenantSeparation:true,
    rls:true, publicRpcExecuteDenied:true, actualAgentsExecuted:0,
    externalReturnObserved:false, productionDatabaseTouched:false,
  }));
}
try {
  await test();
} catch(err) {
  console.error('FAIL C07_PG17_DURABLE_MISSION_QUEUE_TWO_SESSIONS',err?.stack??err);
  process.exitCode=1;
} finally {
  await Promise.all([a?.end({timeout:3}),b?.end({timeout:3}),db?.end({timeout:3}),controlDb.end({timeout:3})].filter(Boolean));
}
