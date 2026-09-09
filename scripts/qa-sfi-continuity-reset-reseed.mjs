import assert from 'node:assert/strict';
import fs from 'node:fs';

const classification = fs.readFileSync('scripts/db/sfi-canonical-reset-classification.mjs', 'utf8');
const reset = fs.readFileSync('scripts/db/reset-sfi-operational-tables.mjs', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260909154500_continuity_state_singleton_reseed.sql', 'utf8');
const originMigration = fs.readFileSync('supabase/migrations/20260807003000_sfi_continuity_runtime.sql', 'utf8');

assert.match(classification, /SFI-CANONICAL-RESET-CLASSIFICATION-1\.2/);
const reseedBlock = classification.match(/export const RESEED_MINIMAL_TABLES = \[([\s\S]*?)\];/)?.[1] ?? '';
const purgeBlock = classification.match(/export const PURGE_DATA_TABLES = \[([\s\S]*?)\];/)?.[1] ?? '';
assert.match(reseedBlock, /'sfi_continuity_state'/, 'continuity singleton must be classified RESEED_MINIMAL');
assert.doesNotMatch(purgeBlock, /'sfi_continuity_state'/, 'continuity singleton must not be classified PURGE_DATA');

assert.match(reset, /const nonPreserveTables = \[\.\.\.PURGE_DATA_TABLES, \.\.\.RESEED_MINIMAL_TABLES\]/, 'reset must truncate reseed tables before deterministic reconstruction');
assert.match(reset, /const purgeWithoutGenesis = PURGE_DATA_TABLES\.filter/, 'purge-zero checks must be derived only from PURGE_DATA_TABLES');

assert.match(originMigration, /insert into public\.sfi_continuity_state \(id\) values \('institution'\) on conflict \(id\) do nothing/i, 'original continuity singleton contract missing');
assert.match(migration, /SFI-CONTINUITY-STATE-SINGLETON-RESEED-1\.0/);
assert.match(migration, /after truncate on public\.sfi_continuity_state/i, 'AFTER TRUNCATE repair trigger missing');
assert.match(migration, /insert into public\.sfi_continuity_state/i, 'singleton reseed insert missing');
assert.match(migration, /'institution'/, 'institution singleton identity missing');
assert.match(migration, /'NORMAL'/, 'post-reset default continuity mode missing');
assert.match(migration, /on conflict \(id\) do nothing/i, 'reseed must be idempotent and must not overwrite a real state');
assert.doesNotMatch(migration, /delete from public\.sfi_continuity_state/i, 'repair may not destructively delete continuity state');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-CONTINUITY-RESET-RESEED-QA-1.0',
  stateOwner: 'public.sfi_continuity_state',
  singleton: 'institution',
  resetDisposition: 'RESEED_MINIMAL',
  truncateRecovery: true,
  idempotent: true,
  preResetHistoryPreserved: false,
  authorityExpansion: false,
}, null, 2));
