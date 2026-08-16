import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { verifyDbEvidenceReceipt } from './verify-db-evidence-snapshot.mjs';

const ROOT = process.cwd();
const confirm = process.env.SFI_SCHEMA_RETIRE_CONFIRM;
if (confirm !== 'RETIRE_UNCONSUMED_SCHEMA_AFTER_SNAPSHOT') {
  throw new Error('Schema retirement is blocked. Set SFI_SCHEMA_RETIRE_CONFIRM=RETIRE_UNCONSUMED_SCHEMA_AFTER_SNAPSHOT only when the reviewed retirement plan is ready to execute.');
}

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || process.env.CONNECTION_STRING;
if (!databaseUrl) throw new Error('Missing DATABASE_URL, DIRECT_URL or CONNECTION_STRING');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: options.cwd || ROOT, env: options.env || process.env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

function pgEnvironment(rawUrl) {
  const url = new URL(rawUrl);
  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, '')),
    PGSSLMODE: process.env.PGSSLMODE || 'require',
  };
}

// The snapshot is created in the same execution immediately before the mutation.
run(process.execPath, [path.join('scripts', 'db', 'create-db-evidence-snapshot.mjs')]);
const evidenceRoot = path.resolve(process.env.SFI_DB_EVIDENCE_DIR || path.join('_sfi_cleanroom', 'db-evidence'));
const latestReceipt = (await readFile(path.join(evidenceRoot, 'LATEST_DB_EVIDENCE_RECEIPT.txt'), 'utf8')).trim();
const verified = await verifyDbEvidenceReceipt(latestReceipt, { maxAgeMinutes: 15 });

const plan = path.join(ROOT, 'scripts', 'db', 'plans', 'retire-unconsumed-schema.sql');
run('psql', ['--set=ON_ERROR_STOP=1', '--file', plan], { env: pgEnvironment(databaseUrl) });

console.log(JSON.stringify({
  ok: true,
  action: 'RETIRE_UNCONSUMED_SCHEMA',
  snapshot_receipt: verified.receipt,
  snapshot_sha256: verified.zip_sha256,
  snapshot_created_at: verified.created_at,
  plan,
}, null, 2));
