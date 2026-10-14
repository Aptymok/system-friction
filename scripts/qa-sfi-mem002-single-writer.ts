import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
const load = (path: string) => readFileSync(path, 'utf8');
const writer = load('src/core/memory/epistemicEventWriter.ts');
const store = load('src/lib/events/eventStore.ts');
const bridge = load('src/lib/events/atomicAppend.ts');
const sql = load('supabase/migrations/20261014193000_mem002_atomic_epistemic_append.sql');
const schema = load('packages/events/src/schema.ts');
for (const path of ['src/lib/governance/governanceRuntime.ts', 'src/lib/governance/thoughtInhibition.ts']) {
  const code = load(path);
  assert.match(code, /appendEpistemicEvent\(/, path);
  assert.doesNotMatch(code, /getLatestEventHash|hashPayload\(|latestHash\(|hash_prev:\s*hashPrev/, path);
}
assert.match(writer, /appendEpistemicEvent\(/);
assert.doesNotMatch(writer, /createHash|hashPayload|getLatestEventHash|\.insert\(/);
assert.match(store, /appendAtomicEpistemicEvent\(/);
assert.match(store, /epistemic_event_page_failed/);
assert.match(store, /LEGACY_OR_DIVERGENT/);
assert.match(store, /data:\s*\[\]/);
assert.match(store, /checksum = sha256\(payload\)/);
assert.match(bridge, /SFI_EPIS_HEAD_STALE_RETRY/);
assert.match(bridge, /attempt < 5/);
assert.match(bridge, /p_canonical_utf8: canonicalUtf8/);
assert.match(sql, /pg_advisory_xact_lock/);
assert.match(sql, /SFI_EPIS_HEAD_STALE_RETRY/);
assert.match(sql, /REVOKE ALL ON FUNCTION/);
assert.match(sql, /digest\(convert_to\(p_canonical_utf8, 'UTF8'\)/);
assert.match(schema, /'canonical'/);
console.log('MEM-002 static contract guards passed; NOT a database integration result');
