import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

// Real embedded PostgreSQL executes the migration and enforces the counter.
// This is an isolated regression test, NOT a production authenticated E2E.
const read = p => readFileSync(p, 'utf8');
const migration = read('supabase/migrations/20261121071500_sfi_legacy_ai_distributed_admission.sql');
const route = read('src/app/api/ai/route.ts');

assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /enable row level security/);
assert.match(migration, /grant execute on function public.sfi_admit_legacy_ai_request_v1\(uuid\)\s+to service_role/);
assert.match(migration, /from public, anon, authenticated/);
assert.match(route, /await requireAuthenticatedUser\(\)/);
assert.match(route, /sfi_admit_legacy_ai_request_v1/);
assert.ok(route.indexOf('await requireAuthenticatedUser()') < route.indexOf("rpc('sfi_admit_legacy_ai_request_v1'"));
assert.ok(route.indexOf("rpc('sfi_admit_legacy_ai_request_v1'") < route.indexOf('await runAiTask({'));
assert.match(route, /ai_shared_budget_unavailable/);
assert.match(route, /ai_shared_quota_exceeded/);
assert.doesNotMatch(migration, /drop table|truncate table|delete from public\.epistemic_events/i);
const providerRouter = read('src/observatory/ai/aiProviderRouter.ts');
assert.match(providerRouter, /max_completion_tokens: 1200/);
assert.match(providerRouter, /max_tokens: 1200/);

const db = new PGlite();
try {
  await db.exec('create role anon nologin; create role authenticated nologin; create role service_role nologin;');
  await db.exec(migration);
  await db.exec('set role anon;');
  try {
    await assert.rejects(
      db.query("select public.sfi_admit_legacy_ai_request_v1('00000001-0000-4000-8000-000000000001'::uuid)"),
      /permission denied/i,
      'anonymous role may not consume provider quota',
    );
  } finally {
    await db.exec('reset role;');
  }
  const admit = async actor => {
    const value = await db.query(
      'select public.sfi_admit_legacy_ai_request_v1($1::uuid) as result',
      [actor],
    );
    return value.rows[0].result;
  };
  assert.deepEqual(await admit(null), { admitted: false, reason: 'INVALID_ACTOR' });
  for (let actorNumber = 1; actorNumber <= 10; actorNumber++) {
    const actor = `${actorNumber.toString(16).padStart(8, '0')}-0000-4000-8000-000000000001`;
    for (let i = 1; i <= 6; i++) {
      const result = await admit(actor);
      assert.equal(result.admitted, true, `actor ${actorNumber} slot ${i}`);
      assert.equal(result.actorMinuteUsed, i);
      assert.equal(result.globalDailyUsed, (actorNumber - 1) * 6 + i);
      assert.equal(result.units, 'REQUEST_ADMISSIONS_NOT_USD');
    }
    if (actorNumber === 1) {
      assert.equal((await admit(actor)).reason, 'ACTOR_MINUTE_QUOTA_REACHED');
    }
  }
  const otherActor = '0000000b-0000-4000-8000-000000000001';
  assert.deepEqual(await admit(otherActor),
    { admitted: false, reason: 'GLOBAL_DAILY_QUOTA_REACHED' });
  const rows = await db.query('select sum(used)::int as used from public.sfi_legacy_ai_admission_buckets where bucket_key like \'global:day:%\'');
  assert.equal(rows.rows[0].used, 60, 'rejected requests never consume an admission');
  console.log('PASS SFI distributed AI quota: PostgreSQL atomic limit, unauthorized role denial, fail-closed code ordering, 6/min/actor and 60/day globally.');
} finally {
  await db.close();
}
