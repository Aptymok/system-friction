import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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
run('zip', ['-v'], { capture: true });

const outputRoot = path.resolve(process.env.SFI_DB_EVIDENCE_DIR || path.join('_sfi_cleanroom', 'db-evidence'));
const workDir = path.join(outputRoot, `.snapshot-${stamp}-${shortCommit}`);
await mkdir(workDir, { recursive: true });

const dumpFile = path.join(workDir, 'database.dump');
const schemaFile = path.join(workDir, 'schema.sql');
const manifestFile = path.join(workDir, 'manifest.json');
const sumsFile = path.join(workDir, 'SHA256SUMS');
const pgEnv = pgEnvironment(databaseUrl);

try {
  run('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', '--file', dumpFile], { env: pgEnv });
  run('pg_dump', ['--schema-only', '--no-owner', '--no-privileges', '--file', schemaFile], { env: pgEnv });

  const [dumpHash, schemaHash, dumpStats, schemaStats] = await Promise.all([
    sha256(dumpFile),
    sha256(schemaFile),
    stat(dumpFile),
    stat(schemaFile),
  ]);

  const dbUrl = new URL(databaseUrl);
  const manifest = {
    contract: 'SFI_DB_EVIDENCE_SNAPSHOT_V1',
    created_at: createdAt.toISOString(),
    git_commit: gitCommit,
    database_host: dbUrl.hostname,
    database_name: decodeURIComponent(dbUrl.pathname.replace(/^\//, '')),
    pg_dump_version: pgDumpVersion,
    contents: [
      { file: 'database.dump', sha256: dumpHash, bytes: dumpStats.size, format: 'pg_dump custom' },
      { file: 'schema.sql', sha256: schemaHash, bytes: schemaStats.size, format: 'PostgreSQL schema-only SQL' },
    ],
  };

  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const manifestHash = await sha256(manifestFile);
  await writeFile(sumsFile, `${dumpHash}  database.dump\n${schemaHash}  schema.sql\n${manifestHash}  manifest.json\n`, 'utf8');

  const zipName = `SFI_DB_SNAPSHOT_${stamp}_${shortCommit}.zip`;
  const zipPath = path.join(outputRoot, zipName);
  run('zip', ['-X', '-q', zipPath, 'database.dump', 'schema.sql', 'manifest.json', 'SHA256SUMS'], { cwd: workDir });
  const zipHash = await sha256(zipPath);
  const zipStats = await stat(zipPath);
  const hashPath = `${zipPath}.sha256`;
  await writeFile(hashPath, `${zipHash}  ${zipName}\n`, 'utf8');

  const receipt = {
    contract: 'SFI_DB_EVIDENCE_RECEIPT_V1',
    created_at: createdAt.toISOString(),
    git_commit: gitCommit,
    database_host: dbUrl.hostname,
    database_name: decodeURIComponent(dbUrl.pathname.replace(/^\//, '')),
    zip: zipPath,
    zip_sha256: zipHash,
    zip_bytes: zipStats.size,
    hash_file: hashPath,
    manifest_sha256: manifestHash,
  };
  const receiptPath = path.join(outputRoot, `SFI_DB_SNAPSHOT_${stamp}_${shortCommit}.receipt.json`);
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outputRoot, 'LATEST_DB_EVIDENCE_RECEIPT.txt'), `${receiptPath}\n`, 'utf8');

  // Verify the persisted bytes before declaring the snapshot usable.
  const persistedHash = await sha256(zipPath);
  if (persistedHash !== zipHash) throw new Error('Persisted ZIP hash mismatch after write');

  console.log(JSON.stringify({ ok: true, receipt: receiptPath, zip: zipPath, sha256: zipHash, bytes: zipStats.size, git_commit: gitCommit }, null, 2));
} finally {
  await rm(workDir, { recursive: true, force: true });
}
