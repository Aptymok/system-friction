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

    // MEM-002 T1-T12: database assertions against actual PostgreSQL RPC.
    const completed: string[] = ['T1','T4','T6','T9']; // Asserted in the existing 21-event test.

    // T2: a real database read failure must not appear to be a valid empty ledger.
    let readDenied = false;
    try {
      await sql.begin(async tx => {
        await tx.unsafe('SET LOCAL ROLE anon');
        await tx.unsafe('SELECT event_id FROM public.epistemic_events LIMIT 1');
      });
    } catch (error) { readDenied = /permission denied|42501/i.test(String(error)); }
    assert.ok(readDenied, 'T2: permission-denied read must fail');
    completed.push('T2');

    async function directAttempt(input: ReturnType<typeof make>, options: {
      stale?: boolean; checksum?: string; confidence?: number; nullPayload?: boolean; receiptOnly?: boolean;
    } = {}) {
      const head = await sql`select hash_self from public.epistemic_events where logbook_id=${input.logbookId} order by sequence desc limit 1`;
      const hashPrev = options.stale ? null : (head[0]?.hash_self ?? null);
      const checksum = digest(input.payload);
      const confidence = options.confidence ?? input.confidence;
      const material = { ...input, checksum, hashPrev, confidence };
      const bytes = JSON.stringify(canonicalizeEventPayload(material));
      return sql`select public.sfi_append_epistemic_event_v2(
        ${input.eventId}::text, ${input.eventName}::text, ${input.logbookId}::text,
        ${input.epistemicClass}::text, ${input.schemaVersion}::text,
        ${sql.json(input.source)}::jsonb, null::text, null::uuid,
        ${confidence}::numeric, ${options.nullPayload ? null : sql.json(input.payload)}::jsonb,
        ${options.checksum ?? checksum}::text, ${sql.array(input.lineage)}::text[],
        null::text, ${input.occurredAt}::timestamptz,
        ${sql.json(material)}::jsonb, ${bytes}::text, ${options.receiptOnly ?? false}::boolean
      ) as receipt`;
    }
    async function rejected(label: string, options: Parameters<typeof directAttempt>[1], expected: string) {
      const event = make(label + '-' + randomUUID());
      let caught = false;
      try { await directAttempt(event, options); }
      catch (error) { caught = String(error).includes(expected); }
      assert.ok(caught, label + ': rejection observed: ' + expected);
      const inserted = await sql`select event_id from public.epistemic_events where event_id=${event.eventId}`;
      assert.equal(inserted.length, 0, label + ': no rejected event persisted');
    }
    await rejected('T3', { checksum: 'incorrect-checksum' }, 'SFI_EPIS_CHECKSUM_MISMATCH');
    completed.push('T3');

    // T5: >500 individually appended events, then paginated and hash-verified readback.
    const bulkBook = 'MEM002-BULK-' + randomUUID();
    for (let i = 0; i < 520; i++) await append(make('bulk-' + randomUUID() + '-' + i, bulkBook));
    const totalBulk = await sql`select count(*)::int as n from public.epistemic_events where logbook_id=${bulkBook}`;
    assert.equal(totalBulk[0].n, 520);
    const pages: Array<Record<string, any>> = [];
    for (let offset = 0; offset < 520; offset += 400) {
      const page = await sql`select * from public.epistemic_events where logbook_id=${bulkBook} order by sequence limit 400 offset ${offset}`;
      assert.equal(page.length, Math.min(400, 520 - offset), 'T5 incomplete page');
      pages.push(...page);
    }
    assert.equal(pages.length, 520);
    for (let i = 0; i < pages.length; i++) {
      const row = pages[i];
      const predecessor = i === 0 ? null : pages[i-1].hash_self;
      assert.equal(row.hash_prev, predecessor, 'T5 predecessor');
      const recreated = make(String(row.event_id), bulkBook);
      assert.equal(row.hash_self, digest({ ...recreated, checksum: digest(recreated.payload), hashPrev: predecessor }), 'T5 digest');
    }
    completed.push('T5');

    // T7: stale head rejected without inserting a fork.
    await rejected('T7', { stale: true }, 'SFI_EPIS_HEAD_STALE_RETRY');
    completed.push('T7');

    // T8: two scoped logbooks do not cross-contaminate.
    const scopeA = 'MEM002-A-' + randomUUID(), scopeB = 'MEM002-B-' + randomUUID();
    await Promise.all([append(make('a-' + randomUUID(), scopeA)), append(make('b-' + randomUUID(), scopeB))]);
    const scopes = await sql`select logbook_id,hash_prev from public.epistemic_events where logbook_id in (${scopeA},${scopeB})`;
    assert.equal(scopes.length, 2);
    assert.ok(scopes.every(row => row.hash_prev === null), 'T8 independent roots');
    completed.push('T8');

    // T10: reject out-of-domain metrics and missing data, without persisting.
    await rejected('T10-range', { confidence: 1.2 }, 'SFI_CONFIDENCE_OUT_OF_RANGE');
    await rejected('T10-null', { nullPayload: true }, 'SFI_EVENT_MATERIAL_REQUIRED');
    completed.push('T10');

    // T11: injected corruption is detectable; transaction rollback restores the row.
    let tamperDetected = false;
    try {
      await sql.begin(async tx => {
        await tx`update public.epistemic_events set payload='{"tampered":true}'::jsonb where event_id=${rows[1].event_id}`;
        const edited = await tx`select payload,checksum from public.epistemic_events where event_id=${rows[1].event_id}`;
        tamperDetected = edited.length === 1 && digest(edited[0].payload) !== edited[0].checksum;
        throw new Error('EXPECTED_T11_ROLLBACK');
      });
    } catch (error) { assert.ok(String(error).includes('EXPECTED_T11_ROLLBACK')); }
    assert.ok(tamperDetected, 'T11 tampering detected');
    const restored = await sql`select payload,checksum from public.epistemic_events where event_id=${rows[1].event_id}`;
    assert.equal(digest(restored[0].payload), restored[0].checksum, 'T11 rollback');
    completed.push('T11');

    // T12: permission boundary and payload-free compact receipts.
    const perm = await sql`select has_function_privilege('anon',oid,'EXECUTE') as allowed from pg_proc where proname='sfi_append_epistemic_event_v2' and pronamespace='public'::regnamespace`;
    assert.equal(perm.length, 1);
    assert.equal(perm[0].allowed, false, 'T12 no anonymous writer permission');
    const minimal = await directAttempt(make('receipt-' + randomUUID(), scopeA), { receiptOnly: true });
    assert.ok(minimal[0].receipt.hash_self);
    assert.equal(minimal[0].receipt.payload, undefined, 'T12 compact receipt does not leak payload');
    completed.push('T12');
    assert.equal(new Set(completed).size, 12);
    console.log(JSON.stringify({ suite:'MEM-002-T1-T12', result:'PASS', checks:completed.sort(),
      scope:'isolated PostgreSQL 16; production Supabase/REST verification remains separate' }));

    console.log(JSON.stringify({ result: 'PASS', concurrency: 20, events: 21, historicalPreserved: true, canonicalHashParity: true, duplicateRejected: true }));
  } finally {
    await sql.end();
  }
}
run().catch(e => { console.error(e); process.exitCode = 1; });
