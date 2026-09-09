import assert from 'node:assert/strict';
import fs from 'node:fs';

const classification = fs.readFileSync('scripts/db/sfi-canonical-reset-classification.mjs', 'utf8');
const reset = fs.readFileSync('scripts/db/reset-sfi-operational-tables.mjs', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260909154500_continuity_state_singleton_reseed.sql', 'utf8');
const originMigration = fs.readFileSync('supabase/migrations/20260807003000_sfi_continuity_runtime.sql', 'utf8');
const runtimeGate = fs.readFileSync('scripts/db/verify-continuity-reseed-ready.mjs', 'utf8');
const destructiveWorkflow = fs.readFileSync('.github/workflows/sfi-db-canonical-reset.yml', 'utf8');
const integrationRestore = fs.readFileSync('scripts/db/preserve-institutional-integrations.ts', 'utf8');

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

assert.match(runtimeGate, /SFI-CONTINUITY-RESET-RESEED-RUNTIME-GATE-1\.0/);
assert.match(runtimeGate, /sfi_continuity_state_reseed_after_truncate/);
assert.match(runtimeGate, /sfi_reseed_continuity_state_after_truncate/);
assert.match(runtimeGate, /SFI_CONTINUITY_RESEED_NOT_READY/);
assert.match(runtimeGate, /SFI_CONTINUITY_SINGLETON_POST_RESET_INVALID/);
assert.match(runtimeGate, /row_count/);
assert.match(runtimeGate, /institution_count/);
assert.match(runtimeGate, /institution_mode/);
assert.match(runtimeGate, /founder_available/);

const preGate = destructiveWorkflow.indexOf('node scripts/db/verify-continuity-reseed-ready.mjs pre');
const resetCall = destructiveWorkflow.indexOf('node scripts/db/reset-sfi-operational-tables.mjs');
const postGate = destructiveWorkflow.indexOf('node scripts/db/verify-continuity-reseed-ready.mjs post');
assert.ok(preGate >= 0 && resetCall >= 0 && postGate >= 0, 'destructive workflow must bind pre/reset/post continuity gates');
assert.ok(preGate < resetCall, 'continuity trigger readiness must be observed before destructive reset');
assert.ok(resetCall < postGate, 'continuity singleton must be verified immediately after destructive reset');
assert.match(destructiveWorkflow, /\/tmp\/sfi-continuity-reseed\.json/);

assert.match(integrationRestore, /SFI_CANONICAL_RESET_CONTRACT/);
assert.match(integrationRestore, /genesis_contract:SFI_CANONICAL_RESET_CONTRACT/);
assert.match(integrationRestore, /SFI_INSTITUTIONAL_RESET_PROVENANCE_MISMATCH/);
assert.doesNotMatch(integrationRestore, /genesis_contract:'SFI-CANONICAL-RESET-CLASSIFICATION-1\.1'/, 'restored institutional profiles may not persist stale reset provenance');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-CONTINUITY-RESET-RESEED-QA-1.1',
  stateOwner: 'public.sfi_continuity_state',
  singleton: 'institution',
  resetDisposition: 'RESEED_MINIMAL',
  truncateRecovery: true,
  runtimePreflightRequired: true,
  postResetSingletonVerification: true,
  restoredIntegrationProvenanceBoundToCurrentContract: true,
  idempotent: true,
  preResetHistoryPreserved: false,
  authorityExpansion: false,
}, null, 2));
