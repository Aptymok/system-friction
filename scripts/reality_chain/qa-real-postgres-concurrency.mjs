/**
 * Two-session concurrency test against a disposable PostgreSQL 17 CI service.
 * A non-loopback or differently named database is rejected before SQL execution.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

const url = new URL(process.env.SFI_RC_TEST_DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
    url.pathname !== '/sfi_rc_test' || url.username !== 'postgres') {
  throw new Error('SFI_RC_ISOLATED_LOOPBACK_DATABASE_REQUIRED');
}
const credentials = url.toString();
const admin = postgres(credentials, { max: 2, connect_timeout: 10 });
const a = postgres(credentials, { max: 1, connect_timeout: 10 });
const b = postgres(credentials, { max: 1, connect_timeout: 10 });
const user = '00000000-0000-4000-8000-000000000001';
const tenant = '00000000-0000-4000-8000-000000000002';
const caseA = '00000000-0000-4000-8000-000000000003';
const caseB = '00000000-0000-4000-8000-000000000006';
const caseC = '00000000-0000-4000-8000-000000000009';
const migrations = [
  '20260816124000_sfi_case_platform_operational_v1.sql',
  '20260816132000_sfi_enterprise_assurance_graph_v1.sql',
  '20260816140000_sfi_case_governed_action_v1.sql',
  '20260909080500_sfi_case_object_atomic_writer_v1.sql',
  '20261023123624_reality_chain_closure_integrity.sql',
];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const close = (sql, id, rev) => sql.unsafe(
  'select public.sfi_close_case_atomic_v1($1::uuid,$2::uuid,$3::text,$4::bigint,$5::jsonb)',
  [id, user, 'OPEN', rev, JSON.stringify({ mode: 'ADMINISTRATIVE', reason: 'Isolated non-certified test closure' })],
);
const write = (sql, id, objectId) => sql.unsafe(
  'select public.sfi_record_case_object_atomic_v1($1::uuid,$2::uuid,$3::jsonb)',
  [id, user, JSON.stringify({
    id: objectId, kind: 'RECORD', epistemicRole: 'RECORD',
    canonicalRef: { id: 'isolated-record:' + objectId, version: '1', hash: 'test-' + objectId },
    payload: { source: 'ISOLATED_TEST', notEvidence: true },
  })],
);
const revision = async id => Number((await admin.unsafe(
  'select closure_revision from public.sfi_cases where id=$1::uuid', [id],
))[0].closure_revision);
const status = async id => (await admin.unsafe('select status from public.sfi_cases where id=$1::uuid', [id]))[0].status;
const count = async (table, id) => Number((await admin.unsafe(
  'select count(*)::int as n from public.' + table + ' where case_id=$1::uuid', [id],
))[0].n);
async function createCase(id) {
  await admin.unsafe(
    'insert into public.sfi_cases(id, owner_id, tenant_id, service_profile_id, subject, scope, system_boundary_ref, temporal_window) values ($1::uuid,$2::uuid,$3::uuid,' +
    "'CUSTOM_RESEARCH','SYSTEM','Isolated concurrency fixture'," +
    "'{\"id\":\"fixture\"}','{\"cutoff\":\"2026-10-24\"}')",
    [id, user, tenant],
  );
}
async function assertBlockedOnCaseRow(pid) {
  for (let i = 0; i < 40; i++) {
    const rows = await admin.unsafe(
      'select cardinality(pg_blocking_pids($1::int)) > 0 as blocked, wait_event_type from pg_stat_activity where pid=$1::int', [pid],
    );
    if (rows[0]?.blocked && rows[0]?.wait_event_type === 'Lock') return;
    await delay(50);
  }
  assert.fail('Second session must actually block on the first transaction');
}
async function assertRejected(promise, marker) {
  await assert.rejects(promise, error => String(error?.message ?? error).includes(marker));
}
try {
  await admin.unsafe(
    "create role anon; create role authenticated; create role service_role;" +
    "create schema auth; create table auth.users(id uuid primary key);" +
    "create function auth.uid() returns uuid language sql as $$ select '00000000-0000-4000-8000-000000000001'::uuid $$;",
  );
  for (const name of migrations) await admin.unsafe(readFileSync('supabase/migrations/' + name, 'utf8'));
  await admin.unsafe('insert into auth.users(id) values ($1::uuid)', [user]);
  await admin.unsafe('insert into public.sfi_tenants(id,tenant_key,name,created_by) values ($1::uuid,$2,$3,$4::uuid)',
    [tenant, 'rc-isolated', 'RC Isolated', user]);
  await createCase(caseA);
  await createCase(caseB);
  await createCase(caseC);

  // Session A holds a row lock through the canonical writer. Session B must
  // actually wait, then reject closure based on a now-stale revision.
  const before = await revision(caseA);
  await a.unsafe('begin');
  let aInTransaction = true;
  try {
    await write(a, caseA, '00000000-0000-4000-8000-000000000004');
    const bPid = Number((await b.unsafe('select pg_backend_pid() as pid'))[0].pid);
    const attempt = close(b, caseA, before).then(
      () => ({ accepted: true }),
      error => ({ accepted: false, message: String(error?.message ?? error) }),
    );
    await assertBlockedOnCaseRow(bPid);
    await a.unsafe('commit');
    aInTransaction = false;
    const answer = await attempt;
    assert.equal(answer.accepted, false);
    assert.match(answer.message, /SFI_CASE_TRANSITION_CONFLICT/);
  } finally {
    if (aInTransaction) await a.unsafe('rollback');
  }
  assert.equal(await status(caseA), 'OPEN');
  assert.equal(await count('sfi_case_objects', caseA), 1);
  assert.equal(await count('sfi_case_audit_events', caseA), 1);
  assert.ok((await revision(caseA)) > before);

  // Reverse ordering: closure commits before new object write.
  await close(b, caseB, await revision(caseB));
  assert.equal(await status(caseB), 'CLOSED');
  await assertRejected(write(a, caseB, '00000000-0000-4000-8000-000000000007'),
    'SFI_CASE_OBJECT_WRITE_FORBIDDEN');
  assert.equal(await count('sfi_case_objects', caseB), 0);
  assert.equal(await count('sfi_case_audit_events', caseB), 1);

  // Closure and audit must be rolled back atomically.
  const beforeC = await revision(caseC);
  await a.unsafe('begin');
  aInTransaction = true;
  try {
    await close(a, caseC, beforeC);
    await a.unsafe('rollback');
    aInTransaction = false;
  } finally {
    if (aInTransaction) await a.unsafe('rollback');
  }
  assert.equal(await status(caseC), 'OPEN');
  assert.equal(await revision(caseC), beforeC);
  assert.equal(await count('sfi_case_audit_events', caseC), 0);

  const acl = (await admin.unsafe(
    "select has_function_privilege('authenticated'," +
    "'public.sfi_close_case_atomic_v1(uuid,uuid,text,bigint,jsonb)','execute') as close_allowed," +
    "has_function_privilege('authenticated'," +
    "'public.sfi_record_case_object_atomic_v1(uuid,uuid,jsonb,text,jsonb)','execute') as write_allowed",
  ))[0];
  assert.equal(acl.close_allowed, false);
  assert.equal(acl.write_allowed, false);
  console.log('PASS REAL_POSTGRES_TWO_SESSIONS: lock, stale close, post-close rejection, audit rollback, RPC ACL');
} catch (error) {
  console.error('FAIL REAL_POSTGRES_TWO_SESSIONS:', error?.stack ?? error);
  process.exitCode = 1;
} finally {
  await Promise.all([a.end({ timeout: 3 }), b.end({ timeout: 3 }), admin.end({ timeout: 3 })]);
}
