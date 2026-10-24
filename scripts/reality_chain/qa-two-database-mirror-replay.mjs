/**
 * Replay test of the repository's REAL Neon mirror receiver against two
 * isolated PostgreSQL 17 databases inside the disposable CI service.
 * Production outbox capture is not exercised; operation packets are built
 * explicitly from a real source transaction. No external DB connection.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { assessCaseRevisionReplayBatch } from './verify_replay_batch.mjs';

const url = new URL(process.env.SFI_RC_TEST_DATABASE_URL ?? '');
if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname) ||
    url.pathname !== '/sfi_rc_test' || url.username !== 'postgres') {
  throw new Error('SFI_RC_ISOLATED_LOOPBACK_DATABASE_REQUIRED');
}
const baseUrl = url.toString();
const databaseUrl = name => {
  const copy = new URL(baseUrl);
  if (!['sfi_rc_source', 'sfi_rc_target'].includes(name)) throw new Error('SFI_RC_DATABASE_INVALID');
  copy.pathname = '/' + name;
  return copy.toString();
};
const admin = postgres(baseUrl, { max: 1, connect_timeout: 10 });
let source;
let target;
const user = '00000000-0000-4000-8000-000000000001';
const tenant = '00000000-0000-4000-8000-000000000002';
const caseId = '00000000-0000-4000-8000-000000000003';
const objectId = '00000000-0000-4000-8000-000000000004';
const migrations = [
  '20260816124000_sfi_case_platform_operational_v1.sql',
  '20260816132000_sfi_enterprise_assurance_graph_v1.sql',
  '20260816140000_sfi_case_governed_action_v1.sql',
  '20260909080500_sfi_case_object_atomic_writer_v1.sql',
  '20261023123624_reality_chain_closure_integrity.sql',
];
const snapshot = async (db, table, id) => {
  if (!['sfi_cases', 'sfi_case_objects', 'sfi_case_audit_events'].includes(table)) {
    throw new Error('SFI_RC_TABLE_NOT_ALLOWED');
  }
  const rows = await db.unsafe(
    'select to_jsonb(t) as row from public.' + table + ' t where id=$1::uuid', [id],
  );
  return rows[0]?.row ?? null;
};
const digests = async (db, table) => {
  if (!['sfi_cases', 'sfi_case_objects', 'sfi_case_audit_events'].includes(table)) {
    throw new Error('SFI_RC_TABLE_NOT_ALLOWED');
  }
  const where = table === 'sfi_cases' ? 'id=$1::uuid' : 'case_id=$1::uuid';
  return (await db.unsafe(
    'select id::text as id, md5(to_jsonb(t)::text) as digest from public.' +
      table + ' t where ' + where + ' order by id', [caseId],
  )).map(row => ({ id: row.id, digest: row.digest }));
};
const apply = async entries => {
  const result = await target.unsafe(
    'select public.sfi_apply_primary_mirror_batch_v1($1::bigint,$2::jsonb) as receipt',
    ['9090', entries],
  );
  return result[0].receipt;
};
try {
  // Database creation is permitted only against an exact loopback service URL
  // naming the GitHub Actions fixture DB.
  await admin.unsafe('create role anon; create role authenticated; create role service_role; create role sfi_continuity_anonymous; create role sfi_continuity_service;');
  await admin.unsafe('create database sfi_rc_source');
  await admin.unsafe('create database sfi_rc_target');
  source = postgres(databaseUrl('sfi_rc_source'), { max: 1, connect_timeout: 10 });
  target = postgres(databaseUrl('sfi_rc_target'), { max: 1, connect_timeout: 10 });

  for (const db of [source, target]) {
    await db.unsafe(
      "create schema auth; create table auth.users(id uuid primary key);" +
      "create function auth.uid() returns uuid language sql as $$" +
      "select '00000000-0000-4000-8000-000000000001'::uuid $$;",
    );
    for (const name of migrations) {
      await db.unsafe(readFileSync('supabase/migrations/' + name, 'utf8'));
    }
    await db.unsafe('insert into auth.users(id) values ($1::uuid)', [user]);
    await db.unsafe(
      'insert into public.sfi_tenants(id,tenant_key,name,created_by) values ($1::uuid,$2,$3,$4::uuid)',
      [tenant, 'rc-replay-fixture', 'Replay fixture', user],
    );
    await db.unsafe(
      'insert into public.sfi_cases(id,owner_id,tenant_id,service_profile_id,subject,scope,system_boundary_ref,temporal_window,created_at,updated_at)' +
      " values ($1::uuid,$2::uuid,$3::uuid,'CUSTOM_RESEARCH','SYSTEM','Isolated mirror fixture'," +
      "'{\"id\":\"replay\"}','{\"cutoff\":\"2026-10-24\"}'," +
      "'2026-10-24 10:00:00+00','2026-10-24 10:00:00+00')",
      [caseId, user, tenant],
    );
  }

  // Install actual production receiver SQL into the disposable target, with
  // a minimal state table and strictly local service-role fixtures.
  await target.unsafe(
    "create table public.sfi_data_plane_state(id text primary key, mode text not null," +
    "updated_at timestamptz not null default now());" +
    "insert into public.sfi_data_plane_state(id,mode) values ('institution','RECOVERY');",
  );
  await target.unsafe(readFileSync('scripts/db/neon-primary-mirror-receiver.sql', 'utf8'));

  const before = await snapshot(source, 'sfi_cases', caseId);
  assert.deepEqual(await snapshot(target, 'sfi_cases', caseId), before,
    'Both disposable DBs must start with precisely identical case state');

  // Use the real canonical SQL writer on the source (child row, changed case
  // revision and audit are committed in a single database transaction).
  await source.unsafe(
    'select public.sfi_record_case_object_atomic_v1($1::uuid,$2::uuid,$3::jsonb)',
    [caseId, user, {
      id: objectId, kind: 'RECORD', epistemicRole: 'RECORD',
      canonicalRef: { id: 'isolated:source-record', hash: 'sha256-fixture', version: '1' },
      payload: { statement: 'disposable cross-database mirror test' },
    }],
  );
  const after = await snapshot(source, 'sfi_cases', caseId);
  const object = await snapshot(source, 'sfi_case_objects', objectId);
  const audits = await source.unsafe(
    'select id::text as id, to_jsonb(t) as row from public.sfi_case_audit_events t where case_id=$1::uuid order by id',
    [caseId],
  );
  assert.equal(audits.length, 1, 'Canonical writer must create one source audit row');
  assert.ok(BigInt(after.closure_revision) > BigInt(before.closure_revision));
  const txid = '9090';
  const entries = [
    {
      operation_id: '10000000-0000-4000-8000-000000000001',
      source_txid: txid, table_name: 'sfi_case_objects', operation: 'UPSERT',
      before_data: null, row_data: object,
    },
    {
      operation_id: '10000000-0000-4000-8000-000000000002',
      source_txid: txid, table_name: 'sfi_case_audit_events', operation: 'UPSERT',
      before_data: null, row_data: audits[0].row,
    },
    {
      operation_id: '10000000-0000-4000-8000-000000000003',
      source_txid: txid, table_name: 'sfi_cases', operation: 'UPSERT',
      before_data: before, row_data: after,
    },
  ];
  const valid = assessCaseRevisionReplayBatch(entries, { requireTouchedCase: true });
  assert.equal(valid.validated, true, JSON.stringify(valid));
  // Critical: the source transaction without the updated parent snapshot
  // MUST be rejected by the validation layer before any receiver invocation.
  const missingParent = assessCaseRevisionReplayBatch(entries.slice(0, 2), { requireTouchedCase: true });
  assert.equal(missingParent.validated, false);
  assert.ok(missingParent.blockers.includes('REPLAY_PARENT_REVISION_SNAPSHOT_MISSING'));

  const initial = await digests(target, 'sfi_cases');
  const first = await apply(entries);
  assert.equal(first.ok, true);
  assert.equal(Number(first.applied), 3, 'Object + audit + revised case must be applied');
  for (const table of ['sfi_cases', 'sfi_case_objects', 'sfi_case_audit_events']) {
    assert.deepEqual(await digests(target, table), await digests(source, table),
      'Source/target exact-row digest mismatch for ' + table);
  }
  assert.notDeepEqual(await digests(target, 'sfi_cases'), initial,
    'Source case revision must replace initial target revision');

  const second = await apply(entries);
  assert.equal(Number(second.applied), 0, 'Idempotent replay must not reapply operations');
  assert.equal(Number(second.alreadyApplied), 3);

  // A conflicting new update must fail, and cannot alter the recovered rows.
  const conflict = [{
    ...entries[2],
    operation_id: '10000000-0000-4000-8000-000000000004',
    before_data: { ...before, closure_revision: 999 },
    row_data: { ...after, closure_revision: 1000 },
  }];
  await assert.rejects(apply(conflict), error =>
    String(error?.message ?? error).includes('SFI_PRIMARY_MIRROR_CONFLICT'));
  for (const table of ['sfi_cases', 'sfi_case_objects', 'sfi_case_audit_events']) {
    assert.deepEqual(await digests(target, table), await digests(source, table),
      'Rejected conflict cannot alter ' + table);
  }

  const triggers = await target.unsafe(
    "select tgname,tgenabled from pg_trigger " +
    "where tgrelid in ('public.sfi_cases'::regclass,'public.sfi_case_objects'::regclass) " +
    "and not tgisinternal and tgname like 'sfi_case_%revision%' order by tgname",
  );
  assert.ok(triggers.length >= 2);
  assert.ok(triggers.every(row => row.tgenabled === 'O'),
    'Real receiver must restore user triggers on target after successful replay');
  console.log('PASS REAL_POSTGRES_TWO_DATABASE_REPLAY: production receiver, original source writer, parent revision, object/audit digest parity, idempotency, conflict rollback, triggers restored');
  console.log('LIMITATION: packets were constructed from source row snapshots, NOT fetched from live outbox or from Supabase/Neon; this is not production mirror certification.');
} catch (error) {
  console.error('FAIL REAL_POSTGRES_TWO_DATABASE_REPLAY:', error?.stack ?? error);
  process.exitCode = 1;
} finally {
  await Promise.all([source?.end({ timeout: 3 }), target?.end({ timeout: 3 }), admin.end({ timeout: 3 })]);
}
