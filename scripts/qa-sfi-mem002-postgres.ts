import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { canonicalizeEventPayload } from '../packages/events/src/schema';

const sql = postgres(process.env.MEM002_TEST_DATABASE_URL ?? 'postgres://mem002:mem002@localhost:5432/mem002', { max: 24 });
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(canonicalizeEventPayload(value))).digest('hex');
const now = '2026-10-14T20:00:00.000Z';
const make = (id: string, logbook = 'MEM002-TEST') => ({
  eventId: id, eventName: 'test.mem002', logbookId: logbook,
  epistemicClass: 'observed', schemaVersion: 'mem002-test-v1',
  source: { sourceId: 'MEM002', sourceType: 'integration' },
  confidence: 1, payload: { id, accented: 'áéí', nested: { b: 2, a: 1 } },
  lineage: [] as string[], uncertainty: null, occurredAt: now,
});

async function append(input: ReturnType<typeof make>, maxAttempts = 30) {
  const checksum = digest(input.payload);
  for (let i = 0; i < maxAttempts; i++) {
    const head = await sql`select hash_self from public.epistemic_events where logbook_id = ${input.logbookId} order by sequence desc limit 1`;
    const hashPrev = head[0]?.hash_self ?? null;
    const material = { ...input, checksum, hashPrev };
    const bytes = JSON.stringify(canonicalizeEventPayload(material));
    try {
      const result = await sql`select public.sfi_append_epistemic_event_v2(
        ${input.eventId}::text, ${input.eventName}::text, ${input.logbookId}::text,
        ${input.epistemicClass}::text, ${input.schemaVersion}::text,
        ${sql.json(input.source)}::jsonb, null::text, null::uuid,
        ${input.confidence}::numeric, ${sql.json(input.payload)}::jsonb,
        ${checksum}::text, ${sql.array(input.lineage)}::text[], null::text,
        ${input.occurredAt}::timestamptz, ${sql.json(material)}::jsonb,
        ${bytes}::text, false::boolean) as receipt`;
      return result[0].receipt as Record<string, unknown>;
    } catch (error) {
      if (String(error).includes('SFI_EPIS_HEAD_STALE_RETRY')) continue;
      throw error;
    }
  }
  throw new Error('contention retries exhausted');
}

async function run() {
  try {
    await sql.unsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE TABLE IF NOT EXISTS public.epistemic_events (
        id uuid primary key default gen_random_uuid(),
        sequence bigint generated always as identity,
        event_id text not null unique, event_name text not null,
        logbook_id text not null, epistemic_class text not null,
        schema_version text not null, source jsonb not null,
        actor_id text, node_id uuid, confidence numeric not null,
        payload jsonb not null, checksum text not null,
        lineage text[] not null default '{}', uncertainty text,
        occurred_at timestamptz not null, created_at timestamptz not null default now(),
        hash_prev text, hash_self text not null unique
      );`);
    for (const role of ['anon', 'authenticated', 'service_role']) {
      await sql.unsafe(`CREATE ROLE ${role}`);
    }
    console.log('MEM002_STAGE: applying SQL migration');
    const migration = readFileSync('supabase/migrations/20261014193000_mem002_atomic_epistemic_append.sql', 'utf8');
    await sql.unsafe(migration.slice(0, migration.indexOf('-- No execute rights')));
    const signature = await sql`select pg_get_function_identity_arguments(oid) as args from pg_proc where proname = 'sfi_append_epistemic_event_v2'`;
    console.log('MEM002_RPC_SIGNATURE:', signature[0]?.args);
    console.log('MEM002_GRANTS_SQL:', migration.slice(migration.indexOf('-- No execute rights')));
    await sql.unsafe(migration.slice(migration.indexOf('-- No execute rights')));
    console.log('MEM002_STAGE: migration applied');
    const legacy = 'legacy-' + randomUUID();
    await sql`insert into public.epistemic_events
      (event_id,event_name,logbook_id,epistemic_class,schema_version,source,confidence,payload,checksum,lineage,occurred_at,hash_prev,hash_self)
      values (${legacy}, 'legacy.test','MEM002-TEST','observed','legacy', '{}'::jsonb,1,'{}'::jsonb,'legacy','{}'::text[],${now}::timestamptz,null,${'legacy-head-'+legacy})`;
    const oldHash = 'legacy-head-' + legacy;
    const entries = Array.from({ length: 20 }, (_, i) => make('mem002-' + randomUUID() + '-' + i));
    const receipts = await Promise.all(entries.map(e => append(e, 80)));
    assert.equal(receipts.length, 20);
    const rows = await sql`select * from public.epistemic_events where logbook_id='MEM002-TEST' order by sequence`;
    assert.equal(rows.length, 21);
    assert.equal(rows[0].hash_self, oldHash, 'historical row unchanged');
    for (let i = 1; i < rows.length; i++) {
      assert.equal(rows[i].hash_prev, rows[i-1].hash_self, 'linear predecessor');
      const input = entries.find(e => e.eventId === rows[i].event_id);
      assert.ok(input);
      assert.equal(rows[i].checksum, digest(input.payload));
      const material = { ...input, checksum: digest(input.payload), hashPrev: rows[i].hash_prev };
      assert.equal(rows[i].hash_self, digest(material), 'canonical hash parity');
    }
    let duplicateRejected = false;
    try { await append(entries[0], 1); } catch { duplicateRejected = true; }
    assert.ok(duplicateRejected, 'duplicate event id rejected');
    const count = await sql`select count(*)::int as n from public.epistemic_events where logbook_id='MEM002-TEST'`;
    assert.equal(count[0].n, 21, 'no extra writes after rejected duplicate');
    console.log(JSON.stringify({ result: 'PASS', concurrency: 20, events: 21, historicalPreserved: true, canonicalHashParity: true, duplicateRejected: true }));
  } finally {
    await sql.end();
  }
}
run().catch(e => { console.error(e); process.exitCode = 1; });
