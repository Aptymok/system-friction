/**
 * MEM-003 real two-server fingerprint parity against the ORIGINAL v2 SQL.
 *
 * Disposable PG17 services ONLY, no Supabase, Neon or production credentials.
 * Source: 127.0.0.1:5432/sfi_rc_test (creates sfi_rc_fp_source)
 * Target: 127.0.0.1:5433/sfi_rc_fp_target (independent PG server/cluster).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import postgres from 'postgres';
import { comparePagedFingerprints } from '../../src/lib/persistence/pagedFingerprint.ts';

function guardedUrl(text, port, database) {
  let url;
  try { url = new URL(text); } catch { throw new Error('SFI_FP_ISOLATED_TEST_URL_REQUIRED'); }
  if (url.protocol !== 'postgres:' || url.hostname !== '127.0.0.1' ||
      url.port !== port || url.pathname !== '/' + database ||
      url.username !== 'postgres' || url.password !== 'isolated-test-only' ||
      url.search || url.hash) {
    throw new Error('SFI_FP_REFUSE_NON_DISPOSABLE_DATABASE');
  }
  return url;
}
const sourceAdminUrl = guardedUrl(process.env.SFI_RC_TEST_DATABASE_URL,
  '5432', 'sfi_rc_test');
const targetUrl = guardedUrl(process.env.SFI_RC_FP_TARGET_URL,
  '5433', 'sfi_rc_fp_target');
const sourceUrl = new URL(sourceAdminUrl);
sourceUrl.pathname = '/sfi_rc_fp_source';
const admin = postgres(sourceAdminUrl.toString(), { max: 1, connect_timeout: 10 });
const source = postgres(sourceUrl.toString(), { max: 2, connect_timeout: 10 });
const target = postgres(targetUrl.toString(), { max: 2, connect_timeout: 10 });

const buildTables = () => {
  const names = Array.from({length:160},(_,i)=> 'sfi_fp_fixture_' + String(i).padStart(3,'0'));
  const sql = names.map(name =>
    'CREATE TABLE public.' + name + ' (id integer primary key, payload jsonb not null);'
  ).join('\n');
  return {names,sql};
};
const {names,sql:tableSql} = buildTables();
const sourceV2 = readFileSync('scripts/db/mem003-continuity-journal-scope.sql','utf8');
const begin = sourceV2.indexOf('create or replace function public.sfi_data_plane_fingerprint_v2()');
const endMarker = '$mem003_fp$;';
const end = sourceV2.indexOf(endMarker,begin);
if (begin < 0 || end < 0) throw new Error('SFI_FINGERPRINT_ORIGINAL_V2_NOT_FOUND');
const originalSql = sourceV2.slice(begin,end+endMarker.length);
const pagedSql = readFileSync('supabase/migrations/20261023095000_sfi_fingerprint_paged_transport_v1.sql','utf8');

function rowsReader(db) {
  return async(after, limit) => await db.unsafe(
    'SELECT * FROM public.sfi_data_plane_fingerprint_page_v1($1::text,$2::integer)',
    [after,limit],
  );
}
async function signatures(db) {
  return await db.unsafe(
    'SELECT table_name, row_count::text as row_count, hash_a::text as hash_a,' +
      ' hash_b::text as hash_b FROM public.sfi_data_plane_fingerprint_v2()' +
      ' ORDER BY table_name COLLATE "C"',
  );
}
async function getPageReport(db, side) {
  const baseline = await signatures(db);
  const fetched = [];
  let after = '';
  let readCount = 0;
  const started = performance.now();
  for (let page = 0; page < 28; page++) {
    const rows = await rowsReader(db)(after, 8);
    readCount++;
    assert.ok(rows.length <= 8);
    if (rows.length === 0) break;
    assert.ok(rows.every(r => typeof r.table_name === 'string' &&
      typeof r.row_count === 'string' && typeof r.hash_a === 'string' &&
      typeof r.hash_b === 'string'),
      side + ': PostgREST numeric transport must be exact text');
    fetched.push(...rows);
    after = rows.at(-1).table_name;
  }
  assert.ok(fetched.length >= 165,'at least 160 fixture + 5 specialized tables expected');
  assert.deepEqual(fetched,baseline,side + ': real paged SQL differs from original V2 row semantics');
  return {side,count:fetched.length,pages:readCount,elapsedMs:+(performance.now()-started).toFixed(2)};
}
async function independentAuthority(name) {
  // A separate read against both providers, stripping ONLY administrative
  // timestamps; this is not an unconditional protected-table bypass.
  if (!['profiles','sfi_account_access_grants','sfi_tenant_members'].includes(name)) return false;
  const statement = 'SELECT id::text AS id, (to_jsonb(t)-' +
    "'created_at'-'updated_at')::text AS semantic FROM public." +
    name + ' t ORDER BY id';
  const [a,b] = await Promise.all([source.unsafe(statement),target.unsafe(statement)]);
  return JSON.stringify(a) === JSON.stringify(b);
}
async function parity(options={}) {
  return comparePagedFingerprints(rowsReader(source),rowsReader(target), {
    minimumTableCount: 161, ...options,
  });
}
async function roles(db,label) {
  for (const role of ['anon','authenticated','service_role','sfi_continuity_service']) {
    const exists = await db.unsafe('SELECT 1 FROM pg_roles WHERE rolname=$1',[role]);
    if (!exists.length) await db.unsafe('CREATE ROLE '+role);
  }
  const rights = await db.unsafe(
    "SELECT has_function_privilege('anon','public.sfi_data_plane_fingerprint_page_v1(text,integer)','EXECUTE') anon," +
    " has_function_privilege('authenticated','public.sfi_data_plane_fingerprint_page_v1(text,integer)','EXECUTE') authenticated," +
    " has_function_privilege('service_role','public.sfi_data_plane_fingerprint_page_v1(text,integer)','EXECUTE') service," +
    " has_function_privilege('sfi_continuity_service','public.sfi_data_plane_fingerprint_page_v1(text,integer)','EXECUTE') continuity",
  );
  assert.deepEqual({...rights[0]}, {anon:false,authenticated:false,service:true,continuity:true},
    label+': SECURITY DEFINER RPC may only be executed by service roles');
}
async function bootstrap(db,label) {
  await rolesBeforeInstall(db);
  await db.unsafe(tableSql);
  await db.unsafe(
    "CREATE TABLE public.sfi_oauth_authorization_codes (id text primary key,expires_at timestamptz NOT NULL,token text NOT NULL);" +
    "CREATE TABLE public.platform_metric_snapshots (id text primary key,reliability numeric,metric_value numeric);" +
    "CREATE TABLE public.profiles (id text primary key,display_name text,created_at timestamptz,updated_at timestamptz);" +
    "CREATE TABLE public.sfi_account_access_grants (id text primary key,status text,created_at timestamptz,updated_at timestamptz);" +
    "CREATE TABLE public.sfi_tenant_members (id text primary key,role text,status text,created_at timestamptz,updated_at timestamptz);" +
    "CREATE TABLE public.sfi_data_plane_state (id text primary key,mode text);" +
    "CREATE TABLE public.sfi_data_plane_primary_outbox (id text primary key);",
  );
  await db.unsafe(
    "INSERT INTO public.sfi_fp_fixture_000 VALUES (1,'{\"kind\":\"begin\",\"number\":0}');" +
    "INSERT INTO public.sfi_fp_fixture_149 VALUES (1,'{\"kind\":\"middle\",\"number\":149}');" +
    "INSERT INTO public.sfi_fp_fixture_159 VALUES (1,'{\"kind\":\"end\",\"number\":159}');" +
    "INSERT INTO public.sfi_oauth_authorization_codes VALUES ('live','2099-01-01T00:00:00Z','INDEPENDENT-FIXTURE');" +
    "INSERT INTO public.sfi_oauth_authorization_codes VALUES ('expired','2000-01-01T00:00:00Z','DO-NOT-COUNT');" +
    "INSERT INTO public.platform_metric_snapshots VALUES ('m1',1.200,10.5000);" +
    "INSERT INTO public.profiles VALUES ('p1','fixture','2026-01-01T00:00:00Z','2026-01-02T00:00:00Z');" +
    "INSERT INTO public.sfi_account_access_grants VALUES ('a1','ACTIVE','2026-01-01T00:00:00Z','2026-01-02T00:00:00Z');" +
    "INSERT INTO public.sfi_tenant_members VALUES ('t1','VIEWER','ACTIVE','2026-01-01T00:00:00Z','2026-01-02T00:00:00Z');",
  );
  await db.unsafe(originalSql);
  await db.unsafe(pagedSql);
  await roles(db,label);
}
async function rolesBeforeInstall(db) {
  for (const role of ['anon','authenticated','service_role','sfi_continuity_service']) {
    const found=await db.unsafe('SELECT 1 FROM pg_roles WHERE rolname=$1',[role]);
    if (!found.length) await db.unsafe('CREATE ROLE '+role);
  }
}
async function expectMatch(label, expected, options) {
  const observed = await parity(options);
  assert.equal(observed,expected,label);
}
async function expectPageRefused(db,cursor,limit) {
  await assert.rejects(
    db.unsafe('SELECT * FROM public.sfi_data_plane_fingerprint_page_v1($1::text,$2::integer)',
      [cursor,limit]),
    /SFI_FINGERPRINT_PAGE_INVALID_BOUNDS/,
  );
}
let executed = [];
const step = async (label,fn) => {await fn();executed.push(label);};
try {
  await admin.unsafe('CREATE DATABASE sfi_rc_fp_source');
  await Promise.all([bootstrap(source,'SOURCE'),bootstrap(target,'TARGET')]);
  const [sourceResult,targetResult]=await Promise.all([
    getPageReport(source,'SOURCE'),getPageReport(target,'TARGET'),
  ]);
  assert.equal(sourceResult.count,targetResult.count);
  await step('full_source_to_target_165_table_parity',async()=>{
    await expectMatch('all fixture and protected tables',true);
  });
  await step('excluded_local_state_preserved',async()=>{
    const rows=await signatures(source);
    assert.ok(!rows.some(r=>r.table_name==='sfi_data_plane_state' ||
      r.table_name==='sfi_data_plane_primary_outbox'));
    await target.unsafe("INSERT INTO public.sfi_data_plane_state VALUES ('only-neon','RECOVERY')");
    await expectMatch('local system state is deliberately excluded',true);
  });
  await step('oauth_expired_excluded_active_included',async()=>{
    await target.unsafe("INSERT INTO public.sfi_oauth_authorization_codes VALUES ('extra-expired','2000-01-01','different')");
    await expectMatch('expired OAuth is excluded',true);
    await target.unsafe("INSERT INTO public.sfi_oauth_authorization_codes VALUES ('extra-live','2099-01-01','different')");
    await expectMatch('active OAuth MUST change parity',false);
    await target.unsafe("DELETE FROM public.sfi_oauth_authorization_codes WHERE id='extra-live'");
    await expectMatch('recovery after correction',true);
  });
  await step('canonical_numeric_scale',async()=>{
    await target.unsafe("UPDATE public.platform_metric_snapshots SET reliability=1.2,metric_value=10.5 WHERE id='m1'");
    await expectMatch('same numeric semantics across scales',true);
    await target.unsafe("UPDATE public.platform_metric_snapshots SET metric_value=10.6 WHERE id='m1'");
    await expectMatch('different numeric value blocks',false);
    await target.unsafe("UPDATE public.platform_metric_snapshots SET metric_value=10.5 WHERE id='m1'");
  });
  await step('late_content_mismatch',async()=>{
    await target.unsafe("UPDATE public.sfi_fp_fixture_149 SET payload='{\"kind\":\"bad\"}' WHERE id=1");
    await expectMatch('late table digest mismatch',false);
    await target.unsafe("UPDATE public.sfi_fp_fixture_149 SET payload='{\"kind\":\"middle\",\"number\":149}' WHERE id=1");
    await expectMatch('late mismatch corrected',true);
  });
  await step('catalog_extra_missing_tables',async()=>{
    await target.unsafe('CREATE TABLE public.zz_extra_different (id integer);');
    await expectMatch('extra last table must block',false);
    await target.unsafe('DROP TABLE public.zz_extra_different');
    await target.unsafe('DROP TABLE public.sfi_fp_fixture_159');
    await expectMatch('missing table must block',false);
    await target.unsafe('CREATE TABLE public.sfi_fp_fixture_159 (id integer primary key,payload jsonb not null)');
    await target.unsafe("INSERT INTO public.sfi_fp_fixture_159 VALUES (1,'{\"kind\":\"end\",\"number\":159}')");
    await expectMatch('table catalog restored',true);
  });
  await step('protected_authority_semantics',async()=>{
    await target.unsafe("UPDATE public.profiles SET updated_at='2026-01-03T00:00:00Z' WHERE id='p1'");
    await expectMatch('protected timestamp differences block without independent proof',false);
    await expectMatch('independent semantic check may tolerate only timestamps',true,{
      verifyProtectedTable:independentAuthority,
    });
    await target.unsafe("UPDATE public.sfi_account_access_grants SET status='REVOKED' WHERE id='a1'");
    await expectMatch('role/status drift cannot be tolerated by independent check',false,{
      verifyProtectedTable:independentAuthority,
    });
    await target.unsafe("UPDATE public.sfi_account_access_grants SET status='ACTIVE' WHERE id='a1'");
    await target.unsafe("UPDATE public.profiles SET updated_at='2026-01-02T00:00:00Z' WHERE id='p1'");
    await expectMatch('strict parity restored',true);
  });
  await step('bounds_and_failed_transport',async()=>{
    await expectPageRefused(source,'',0);
    await expectPageRefused(target,'',9);
    await expectPageRefused(source,null,8);
    const delayed=async(after,limit)=>{
      if (after >= names[30]) throw new Error('SFI_ISOLATED_TARGET_TRANSPORT_TIMEOUT');
      return rowsReader(target)(after,limit);
    };
    await assert.rejects(
      comparePagedFingerprints(rowsReader(source),delayed,{minimumTableCount:161}),
      /SFI_ISOLATED_TARGET_TRANSPORT_TIMEOUT/,
    );
    await assert.rejects(parity({maxPages:2}),/SFI_FINGERPRINT_PAGINATION_CAP_EXCEEDED/);
  });
  await step('cross_provider_exact_v2_parity_after_all_recovery',async()=>{
    const [a,b]=await Promise.all([getPageReport(source,'SOURCE_FINAL'),getPageReport(target,'TARGET_FINAL')]);
    assert.equal(a.count,b.count);
    await expectMatch('all 165 tables after reversible disturbances',true);
  });
  console.log('PASS MEM003_REAL_TWO_INDEPENDENT_PG17_PROVIDERS '+JSON.stringify({
    source:sourceResult,target:targetResult,steps:executed,
    providerServers:2,sourcePort:5432,targetPort:5433,
    certificatesPromoted:false,productionTouched:false,
  }));
} catch(error) {
  console.error('FAIL MEM003_REAL_TWO_INDEPENDENT_PG17_PROVIDERS',error?.stack??error);
  process.exitCode=1;
} finally {
  await Promise.allSettled([admin.end({timeout:3}),source.end({timeout:3}),target.end({timeout:3})]);
}
