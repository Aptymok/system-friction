import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { comparePagedFingerprints, type FingerprintRow } from './pagedFingerprint';

function row(name: string, hash = 2): FingerprintRow {
  return { table_name: name, row_count: 3, hash_a: hash, hash_b: hash + 1 };
}
function reader(rows: FingerprintRow[]) {
  return async (after: string, limit: number) => rows.filter(r => r.table_name > after).slice(0, limit);
}
const rows = Array.from({ length: 161 }, (_, i) => row(`sfi_table_${String(i).padStart(4, '0')}`));

test('compares every table over several pages, including a final short page', async () => {
  let calls = 0;
  const primary = async (after: string, limit: number) => {
    calls += 1;
    return reader(rows)(after, limit);
  };
  assert.equal(await comparePagedFingerprints(primary, reader(rows)), true);
  assert.equal(calls, 22, '161 tables at 8/page require 21 nonempty reads + final sentinel');
});

test('one divergent row count/hash anywhere blocks certification', async () => {
  const altered = rows.map((r, i) => i === 149 ? { ...r, hash_a: 8 } : r);
  assert.equal(await comparePagedFingerprints(reader(rows), reader(altered)), false);
});
test('an extra or missing table, even at the tail, blocks certification', async () => {
  assert.equal(await comparePagedFingerprints(reader(rows), reader(rows.slice(0, -1))), false);
  assert.equal(await comparePagedFingerprints(reader(rows), reader([...rows, row('z_extra')])), false);
});
test('empty primary and continuity must never create a vacuous certificate', async () => {
  assert.equal(await comparePagedFingerprints(reader([]), reader([])), false);
});
test('unexpected row order or provider page shape must block certification', async () => {
  const wrong = async (_: string, limit: number) => [row('z_bad'), ...rows.slice(0, limit - 1)];
  assert.equal(await comparePagedFingerprints(reader(rows), wrong), false);
  const oversize = async () => rows.slice(0, 9);
  assert.equal(await comparePagedFingerprints(oversize, reader(rows)), false);
});
test('protected-row timestamp-only tolerance requires independent verification', async () => {
  const a = [row('profiles'), row('sfi_account_access_grants')];
  const b = a.map(r => ({ ...r, hash_b: 9 }));
  assert.equal(await comparePagedFingerprints(reader(a), reader(b)), false);
  assert.equal(await comparePagedFingerprints(reader(a), reader(b), {
    verifyProtectedTable: async () => false,
  }), false);
  const checked: string[] = [];
  assert.equal(await comparePagedFingerprints(reader(a), reader(b), {
    verifyProtectedTable: async name => { checked.push(name); return true; },
  }), true);
  assert.deepEqual(checked, ['profiles', 'sfi_account_access_grants']);
  const changedCount = b.map((r, i) => i === 0 ? { ...r, row_count: 7 } : r);
  assert.equal(await comparePagedFingerprints(reader(a), reader(changedCount), {
    verifyProtectedTable: async () => true,
  }), false);
});
test('any RPC transport failure propagates and cannot create a certificate', async () => {
  const failing = async (): Promise<FingerprintRow[]> => { throw new Error('SFI_PRIMARY_RPC_500'); };
  await assert.rejects(comparePagedFingerprints(failing, reader(rows)), /SFI_PRIMARY_RPC_500/);
});
test('pagination limits are hard and fail closed', async () => {
  await assert.rejects(comparePagedFingerprints(reader(rows), reader(rows), { pageSize: 9 }), /INVALID_PAGE_BOUNDS/);
  await assert.rejects(comparePagedFingerprints(reader(rows), reader(rows), { maxPages: 2 }), /PAGINATION_CAP_EXCEEDED/);
});

test('paged SQL retains the existing v2 inclusion, canonicalization and digest semantics', () => {
  const v2 = readFileSync('scripts/db/mem003-continuity-journal-scope.sql', 'utf8');
  const next = readFileSync('supabase/migrations/20261023095000_sfi_fingerprint_paged_transport_v1.sql', 'utf8');
  const deniedTables = (source: string) => {
    const scope = source.match(/cls\.relname\s+not\s+in\s*\(([\s\S]*?)\)/i);
    assert.ok(scope, 'excluded-table clause not found');
    return [...scope[1].matchAll(/'([a-z_]+)'/g)].map(match => match[1]).sort();
  };
  assert.deepEqual(deniedTables(next), deniedTables(v2), 'must scan the exact same table set');
  for (const feature of [
    "expr := 'to_jsonb(t)::text'",
    'trim_scale(t.reliability)',
    'trim_scale(t.metric_value)',
    "where_clause := ' where t.expires_at > now()'",
    "substr(md5(%1$s),1,16)",
    "substr(md5(%1$s),17,16)",
  ]) {
    assert.ok(v2.includes(feature), `v2 baseline changed: ${feature}`);
    assert.ok(next.includes(feature), `paged implementation lost: ${feature}`);
  }
  assert.ok(next.includes('REVOKE ALL ON FUNCTION'));
  assert.ok(next.includes('p_limit > 8'));
  assert.ok(next.includes('ORDER BY cls.relname'));
});
