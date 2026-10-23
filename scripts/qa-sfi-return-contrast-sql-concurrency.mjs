// Isolated PostgreSQL transaction test for the existing MEM-002 event append owner.
// The URL is deliberately restricted to the ephemeral GitHub Actions database.
// NEVER connect this script to Supabase/Neon production or other user databases.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

const value = process.env.SFI_TEST_DB_URL;
assert.ok(value, 'SFI_TEST_DB_URL must name the isolated local CI database');
const url = new URL(value);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname), 'Refusing nonlocal database');
assert.equal(url.pathname, '/sfi_return_ci', 'Refusing any non-CI database');
const sql = postgres(value, { max: 4, prepare: false, connect_timeout: 10 });
const ledger = 'universal-cycle:qa-return-race';
const eventName = 'SFI_UNIVERSAL_RETURN_CONTRASTED';
const source = { sourceId: 'qa-isolated', sourceType: 'synthetic' };
const occurredAt = '2026-10-23T06:00:00.000Z';

async function setup() {
  await sql.unsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto;
    DO $roles$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
    END $roles$;
    CREATE TABLE public.epistemic_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id text NOT NULL UNIQUE,
      event_name text NOT NULL,
      logbook_id text NOT NULL,
      epistemic_class text NOT NULL,
      schema_version text NOT NULL,
      source jsonb NOT NULL,
      actor_id text,
      node_id uuid,
      confidence numeric NOT NULL,
      payload jsonb NOT NULL,
      checksum text,
      lineage text[],
      uncertainty text,
      occurred_at timestamptz NOT NULL,
      hash_prev text,
      hash_self text NOT NULL,
      sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now()
    );`).simple();
  const migration = readFileSync('supabase/migrations/20261023060000_sfi_return_contrast_deduplication.sql', 'utf8');
  await sql.unsafe(migration).simple();
}

async function append({ fingerprint, eventId = randomUUID(), hashPrev = null, tenant = 'qa' }) {
  const payload = { tenantId: tenant, cycleId: 'qa-return-race', contrastInputFingerprint: fingerprint };
  const canonical = {
    eventId, eventName, logbookId: ledger, epistemicClass: 'derived',
    schemaVersion: 'qa', source, confidence: 0.5, payload,
    checksum: 'qa-checksum', lineage: ['return-qa'],
    uncertainty: null, occurredAt, hashPrev,
  };
  const rows = await sql`SELECT public.sfi_append_epistemic_event_v2(
    ${eventId}::text, ${eventName}::text, ${ledger}::text, 'derived'::text,
    'qa'::text, ${JSON.stringify(source)}::jsonb, 'qa'::text, NULL::uuid,
    0.5::numeric, ${JSON.stringify(payload)}::jsonb, 'qa-checksum'::text,
    ARRAY['return-qa']::text[], NULL::text, ${occurredAt}::timestamptz,
    ${JSON.stringify(canonical)}::jsonb, ${JSON.stringify(canonical)}::text, false::boolean
  ) AS receipt`;
  return rows[0].receipt;
}
async function count() {
  const rows = await sql`SELECT count(*)::integer AS n FROM public.epistemic_events WHERE logbook_id = ${ledger}`;
  return rows[0].n;
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

try {
  await setup();
  // Hold precisely the append owner's advisory lock while two distinct event IDs
  // attempt to write the *same* cycle + fingerprint, forcing a genuine race.
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  let acquired;
  const locked = new Promise(resolve => { acquired = resolve; });
  const lockTx = sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${'SFI-EPISTEMIC-LEDGER:' + ledger}, 0))`;
    acquired();
    await barrier;
  });
  await locked;
  const first = append({ fingerprint: 'a'.repeat(64) });
  const second = append({ fingerprint: 'a'.repeat(64) });
  await sleep(150);
  release();
  const [a, b] = await Promise.all([first, second]);
  await lockTx;
  assert.equal(a.event_id, b.event_id, 'Concurrent identical inputs must return the same persisted event');
  assert.equal(a.hash_self, b.hash_self, 'Semantic reuse must preserve the exact stored hash');
  assert.equal(await count(), 1, 'Race must persist exactly one contrast');

  const newOutcome = await append({ fingerprint: 'b'.repeat(64), hashPrev: a.hash_self });
  assert.notEqual(newOutcome.event_id, a.event_id, 'Changed RETURN fingerprint must be appendable');
  assert.equal(await count(), 2);
  const reusedNew = await append({ fingerprint: 'b'.repeat(64), hashPrev: null });
  assert.equal(reusedNew.event_id, newOutcome.event_id, 'Identical fingerprint must reuse even with stale head');
  assert.equal(await count(), 2);

  await assert.rejects(
    append({ fingerprint: 'c'.repeat(64), hashPrev: null }),
    /SFI_EPIS_HEAD_STALE_RETRY/,
    'Changed input with stale head must be rejected'
  );
  assert.equal(await count(), 2, 'Rejected stale append must have no side effects');
  console.log('PASS: isolated real PostgreSQL lock, same fingerprint dedup, changed fingerprint, stale-head rejection');
} finally {
  await sql.end();
}
