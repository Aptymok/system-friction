import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  SFI_CANONICAL_RESET_CONTRACT,
  PRESERVE_DATA_TABLES,
  RESEED_MINIMAL_TABLES,
  PURGE_DATA_TABLES,
  CLASSIFIED_PUBLIC_TABLES,
  classifyPublicTable,
  auditPublicTableClassification,
} from './db/sfi-canonical-reset-classification.mjs';

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const reset = read('scripts/db/reset-sfi-operational-tables.mjs');
const snapshot = read('scripts/db/create-db-evidence-snapshot.mjs');
const verifier = read('scripts/db/verify-db-evidence-snapshot.mjs');
const legacySeed = read('scripts/db/seed-sfi-canonical-history.mjs');
const readiness = read('src/lib/root/closure/readInstitutionalReadiness.ts');
const proof = read('src/lib/root/closure/fullCycleVerification.ts');

assert.equal(SFI_CANONICAL_RESET_CONTRACT, 'SFI-CANONICAL-RESET-CLASSIFICATION-1.0');
assert.deepEqual(PRESERVE_DATA_TABLES, [
  'world_source_observations',
  'world_friction_readings',
  'world_hypotheses',
  'world_hypothesis_outcomes',
]);
assert.deepEqual(RESEED_MINIMAL_TABLES, [
  'profiles',
  'sfi_tenants',
  'sfi_tenant_members',
  'sfi_oauth_clients',
  'accounts',
  'account_members',
  'account_balance',
]);
assert.equal(PURGE_DATA_TABLES.length, 153, 'live reset baseline must explicitly classify all 153 non-World/non-genesis public tables');
assert.equal(CLASSIFIED_PUBLIC_TABLES.length, 164, 'reset baseline must classify every public table observed after Discovery integration');
assert.equal(new Set(CLASSIFIED_PUBLIC_TABLES).size, CLASSIFIED_PUBLIC_TABLES.length, 'reset classification must contain no duplicate table');
for (const table of PRESERVE_DATA_TABLES) assert.equal(classifyPublicTable(table), 'PRESERVE_DATA');
for (const table of RESEED_MINIMAL_TABLES) assert.equal(classifyPublicTable(table), 'RESEED_MINIMAL');
for (const table of PURGE_DATA_TABLES) assert.equal(classifyPublicTable(table), 'PURGE_DATA');
assert.equal(classifyPublicTable('future_new_table'), 'UNCLASSIFIED', 'new public tables must fail closed instead of being purged implicitly');
const exactAudit = auditPublicTableClassification(CLASSIFIED_PUBLIC_TABLES);
assert.equal(exactAudit.unclassified.length, 0);
assert.equal(exactAudit.classifiedButNotObserved.length, 0);
assert.equal(exactAudit.preserveData.length, 4);
assert.equal(exactAudit.reseedMinimal.length, 7);
assert.equal(exactAudit.purgeData.length, 153);

for (const table of ['epistemic_events','sfi_amv_memory','policy_decisions','action_proposals','sfi_cognitive_twin_memory','sfi_cognitive_twin_runs','world_learning_events','worldspect_snapshots','platform_metric_snapshots']) {
  assert.ok(PURGE_DATA_TABLES.includes(table), `legacy/runtime table must be explicitly purged: ${table}`);
}
assert.ok(PURGE_DATA_TABLES.includes('root_audit_events'), 'pre-reset ROOT audit history must be purged before one new genesis receipt is inserted');
assert.ok(PURGE_DATA_TABLES.includes('sfi_oauth_authorization_codes'), 'OAuth authorization-code history must not survive reset');
assert.ok(PURGE_DATA_TABLES.includes('usage_ledger'), 'usage telemetry must not survive as legacy institutional state');

assert.match(snapshot, /SFI_DB_EVIDENCE_SNAPSHOT_V2/);
assert.match(snapshot, /SFI_DB_EVIDENCE_RECEIPT_V2/);
assert.match(snapshot, /public-tables\.json/);
assert.match(snapshot, /reset-classification\.json/);
assert.match(snapshot, /preserve_exact_counts/);
assert.match(snapshot, /classification\.unclassified\.length/);
assert.match(snapshot, /missingRequired\.length/);
assert.match(snapshot, /pg_dump/);
assert.match(snapshot, /--format=custom/);
assert.match(snapshot, /schema\.sql/);
assert.match(snapshot, /SHA256SUMS/);

assert.match(verifier, /requireResetClassification/);
assert.match(verifier, /SFI_DB_EVIDENCE_RECEIPT_V2/);
assert.match(verifier, /unzipEntry/);
assert.match(verifier, /public_tables_sha256/);
assert.match(verifier, /reset_classification_sha256/);
assert.match(verifier, /classification\.unclassified/);
assert.match(verifier, /resetPermittedByClassification/);

assert.match(reset, /RESET_SFI_CANONICAL/);
assert.match(reset, /EVIDENCE_FIRST_CANONICAL_RESET/);
assert.match(reset, /requireResetClassification: true/);
assert.match(reset, /public schema drift/i);
assert.match(reset, /A preserved World table depends on a table scheduled for reset/);
assert.match(reset, /begin;/);
assert.match(reset, /pg_advisory_xact_lock/);
assert.match(reset, /truncate table/);
assert.match(reset, /restart identity/);
assert.doesNotMatch(reset, /\bCASCADE\b/i, 'canonical reset must not use CASCADE because preserved World data must fail closed on unexpected dependencies');
assert.match(reset, /sfi_reset_founder/);
assert.match(reset, /sfi_reset_oauth_clients/);
assert.match(reset, /SFI_CANONICAL_RESET_GENESIS/);
assert.match(reset, /learning_imported.*false/s);
assert.match(reset, /canonical_history_imported.*false/s);
assert.match(reset, /WORLD_COUNTS_UNCHANGED/);
assert.match(reset, /UNCLASSIFIED_ZERO/);
assert.match(reset, /LEGACY_LEARNING_NOT_IMPORTED/);
assert.doesNotMatch(reset, /LATEST_EXPORT\.txt/);
assert.doesNotMatch(reset, /SFI_FULL_CYCLE_PROOF_/);
assert.doesNotMatch(reset, /SFI_CLEANUP_PLAN_/);
assert.doesNotMatch(reset, /deleteAllRowsByKnownColumns/);

assert.match(legacySeed, /SFI-LEGACY-CANONICAL-HISTORY-SEED-RETIRED-1\.0/);
assert.match(legacySeed, /QA reports, operational patches and runtime events/);
assert.match(legacySeed, /process\.exit\(1\)/);
assert.doesNotMatch(legacySeed, /\.insert\(/, 'retired legacy seed must have zero DB write path');

assert.match(readiness, /EMPTY_READY:no_field_cycles_yet/);
assert.match(readiness, /EMPTY_READY:no_studio_objects_yet/);
assert.match(readiness, /EMPTY_READY:no_evidence_yet/);
assert.match(readiness, /EMPTY_READY:no_relations_yet/);
assert.match(proof, /REAL_PERSISTED_EVIDENCE_REPLAY/);
assert.match(proof, /Field return is never fabricated/);

console.log(JSON.stringify({
  ok: true,
  contract: SFI_CANONICAL_RESET_CONTRACT,
  classifiedPublicTables: CLASSIFIED_PUBLIC_TABLES.length,
  preserveDataTables: PRESERVE_DATA_TABLES.length,
  reseedMinimalTables: RESEED_MINIMAL_TABLES.length,
  purgeDataTables: PURGE_DATA_TABLES.length,
  invariants: [
    'FULL_POSTGRES_SNAPSHOT_BEFORE_RESET',
    'SNAPSHOT_CONTAINS_HASHED_PUBLIC_TABLE_INVENTORY',
    'UNCLASSIFIED_PUBLIC_TABLE_BLOCKS_RESET',
    'ONLY_FOUR_WORLD_TABLES_PRESERVE_LEGACY_DATA',
    'MINIMAL_INFRASTRUCTURE_IS_RESEEDED_NOT_PRESERVED',
    'NO_TRUNCATE_CASCADE',
    'WORLD_EXACT_COUNTS_MUST_SURVIVE',
    'QA_TELEMETRY_TWIN_AMV_GOVERNANCE_HISTORY_PURGED',
    'LEGACY_CANONICAL_HISTORY_SEED_RETIRED',
    'ONE_HASH_LINKED_POST_RESET_GENESIS_EVENT',
    'EMPTY_RUNTIME_IS_READY_NOT_DEGRADED',
  ],
}, null, 2));
