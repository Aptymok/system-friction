import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  SFI_CANONICAL_RESET_CONTRACT,
  PRESERVE_DATA_TABLES,
  RESEED_MINIMAL_TABLES,
  auditPublicTableClassification,
} from './sfi-canonical-reset-classification.mjs';

const ROOT = process.cwd();
const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || process.env.CONNECTION_STRING;
if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL, DIRECT_URL or CONNECTION_STRING. A full evidentiary snapshot requires a direct PostgreSQL connection; REST exports are not accepted as a database backup.');
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

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    env: options.env || process.env,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture ? `${result.stdout || ''}\n${result.stderr || ''}`.trim() : '';
    throw new Error(`${command} failed with exit code ${result.status}${detail ? `: ${detail}` : ''}`);
  }
  return options.capture ? String(result.stdout || '').trim() : '';
}

function psqlScalar(sql, pgEnv) {
  return run('psql', ['--no-psqlrc', '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1', '--command', sql], { env: pgEnv, capture: true }).trim();
}

async function sha256(file) {
  const hash = createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = createReadStream(file);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
}

const createdAt = new Date();
const stamp = createdAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const gitCommit = run('git', ['rev-parse', 'HEAD'], { capture: true });
const shortCommit = gitCommit.slice(0, 12);
const pgDumpVersion = run('pg_dump', ['--version'], { capture: true });
const psqlVersion = run('psql', ['--version'], { capture: true });
run('zip', ['-v'], { capture: true });

const outputRoot = path.resolve(process.env.SFI_DB_EVIDENCE_DIR || path.join('_sfi_cleanroom', 'db-evidence'));
const workDir = path.join(outputRoot, `.snapshot-${stamp}-${shortCommit}`);
await mkdir(workDir, { recursive: true });

const dumpFile = path.join(workDir, 'database.dump');
const schemaFile = path.join(workDir, 'schema.sql');
const publicTablesFile = path.join(workDir, 'public-tables.json');
const resetClassificationFile = path.join(workDir, 'reset-classification.json');
const manifestFile = path.join(workDir, 'manifest.json');
const sumsFile = path.join(workDir, 'SHA256SUMS');
const pgEnv = pgEnvironment(databaseUrl);

try {
  // Inventory is captured from the exact database connection used for pg_dump.
  const tableOutput = psqlScalar(
    "select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname;",
    pgEnv,
  );
  const publicTables = tableOutput.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const classification = auditPublicTableClassification(publicTables);
  const requiredTables = [...PRESERVE_DATA_TABLES, ...RESEED_MINIMAL_TABLES];
  const missingRequired = requiredTables.filter((table) => !publicTables.includes(table));
  if (classification.unclassified.length) {
    throw new Error(`Snapshot blocked: unclassified live public table(s): ${classification.unclassified.join(', ')}`);
  }
  if (missingRequired.length) {
    throw new Error(`Snapshot blocked: required preserve/reseed table(s) missing: ${missingRequired.join(', ')}`);
  }

  const preserveCounts = {};
  for (const table of PRESERVE_DATA_TABLES) {
    const quoted = `"${table.replaceAll('"', '""')}"`;
    const raw = psqlScalar(`select count(*)::text from public.${quoted};`, pgEnv);
    const count = Number(raw);
    if (!Number.isSafeInteger(count) || count < 0) throw new Error(`Invalid exact row count for ${table}: ${raw}`);
    preserveCounts[table] = count;
  }

  const tableInventory = {
    contract: 'SFI_DB_PUBLIC_TABLE_INVENTORY_V1',
    created_at: createdAt.toISOString(),
    git_commit: gitCommit,
    public_table_count: publicTables.length,
    tables: publicTables,
    preserve_exact_counts: preserveCounts,
  };
  const classificationEvidence = {
    contract: SFI_CANONICAL_RESET_CONTRACT,
    created_at: createdAt.toISOString(),
    git_commit: gitCommit,
    ...classification,
    missingRequired,
    resetPermittedByClassification: classification.unclassified.length === 0 && missingRequired.length === 0,
  };
  await writeFile(publicTablesFile, `${JSON.stringify(tableInventory, null, 2)}\n`, 'utf8');
  await writeFile(resetClassificationFile, `${JSON.stringify(classificationEvidence, null, 2)}\n`, 'utf8');

  run('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', '--file', dumpFile], { env: pgEnv });
  run('pg_dump', ['--schema-only', '--no-owner', '--no-privileges', '--file', schemaFile], { env: pgEnv });

  const [dumpHash, schemaHash, publicTablesHash, classificationHash, dumpStats, schemaStats, publicTablesStats, classificationStats] = await Promise.all([
    sha256(dumpFile),
    sha256(schemaFile),
    sha256(publicTablesFile),
    sha256(resetClassificationFile),
    stat(dumpFile),
    stat(schemaFile),
    stat(publicTablesFile),
    stat(resetClassificationFile),
  ]);

  const dbUrl = new URL(databaseUrl);
  const manifest = {
    contract: 'SFI_DB_EVIDENCE_SNAPSHOT_V2',
    created_at: createdAt.toISOString(),
    git_commit: gitCommit,
    database_host: dbUrl.hostname,
    database_name: decodeURIComponent(dbUrl.pathname.replace(/^\//, '')),
    pg_dump_version: pgDumpVersion,
    psql_version: psqlVersion,
    public_table_count: publicTables.length,
    preserve_exact_counts: preserveCounts,
    reset_classification_contract: SFI_CANONICAL_RESET_CONTRACT,
    contents: [
      { file: 'database.dump', sha256: dumpHash, bytes: dumpStats.size, format: 'pg_dump custom' },
      { file: 'schema.sql', sha256: schemaHash, bytes: schemaStats.size, format: 'PostgreSQL schema-only SQL' },
      { file: 'public-tables.json', sha256: publicTablesHash, bytes: publicTablesStats.size, format: 'SFI_DB_PUBLIC_TABLE_INVENTORY_V1' },
      { file: 'reset-classification.json', sha256: classificationHash, bytes: classificationStats.size, format: SFI_CANONICAL_RESET_CONTRACT },
    ],
  };

  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const manifestHash = await sha256(manifestFile);
  await writeFile(
    sumsFile,
    `${dumpHash}  database.dump\n${schemaHash}  schema.sql\n${publicTablesHash}  public-tables.json\n${classificationHash}  reset-classification.json\n${manifestHash}  manifest.json\n`,
    'utf8',
  );

  const zipName = `SFI_DB_SNAPSHOT_${stamp}_${shortCommit}.zip`;
  const zipPath = path.join(outputRoot, zipName);
  run('zip', ['-X', '-q', zipPath, 'database.dump', 'schema.sql', 'public-tables.json', 'reset-classification.json', 'manifest.json', 'SHA256SUMS'], { cwd: workDir });
  const zipHash = await sha256(zipPath);
  const zipStats = await stat(zipPath);
  const hashPath = `${zipPath}.sha256`;
  await writeFile(hashPath, `${zipHash}  ${zipName}\n`, 'utf8');

  const receipt = {
    contract: 'SFI_DB_EVIDENCE_RECEIPT_V2',
    created_at: createdAt.toISOString(),
    git_commit: gitCommit,
    database_host: dbUrl.hostname,
    database_name: decodeURIComponent(dbUrl.pathname.replace(/^\//, '')),
    zip: zipPath,
    zip_sha256: zipHash,
    zip_bytes: zipStats.size,
    hash_file: hashPath,
    manifest_sha256: manifestHash,
    public_tables_sha256: publicTablesHash,
    reset_classification_sha256: classificationHash,
    public_table_count: publicTables.length,
    preserve_exact_counts: preserveCounts,
    reset_classification_contract: SFI_CANONICAL_RESET_CONTRACT,
  };
  const receiptPath = path.join(outputRoot, `SFI_DB_SNAPSHOT_${stamp}_${shortCommit}.receipt.json`);
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outputRoot, 'LATEST_DB_EVIDENCE_RECEIPT.txt'), `${receiptPath}\n`, 'utf8');

  // Verify the persisted bytes before declaring the snapshot usable.
  const persistedHash = await sha256(zipPath);
  if (persistedHash !== zipHash) throw new Error('Persisted ZIP hash mismatch after write');

  console.log(JSON.stringify({
    ok: true,
    receipt: receiptPath,
    zip: zipPath,
    sha256: zipHash,
    bytes: zipStats.size,
    git_commit: gitCommit,
    public_table_count: publicTables.length,
    preserve_exact_counts: preserveCounts,
    classification: {
      preserve: classification.preserveData.length,
      reseed: classification.reseedMinimal.length,
      purge: classification.purgeData.length,
      unclassified: classification.unclassified.length,
    },
  }, null, 2));
} finally {
  await rm(workDir, { recursive: true, force: true });
}
