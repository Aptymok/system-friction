import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { SFI_CANONICAL_RESET_CONTRACT } from './sfi-canonical-reset-classification.mjs';

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

function sha256Buffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function unzipEntry(zipPath, entry) {
  const result = spawnSync('unzip', ['-p', zipPath, entry], { encoding: null, maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Could not read ${entry} from snapshot ZIP: ${String(result.stderr || '').trim() || `exit ${result.status}`}`);
  }
  return Buffer.from(result.stdout || []);
}

function parseZipJson(zipPath, entry) {
  const bytes = unzipEntry(zipPath, entry);
  let json;
  try {
    json = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    throw new Error(`Invalid JSON in snapshot ${entry}: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { bytes, json, sha256: sha256Buffer(bytes) };
}

function manifestEntry(manifest, file) {
  const item = Array.isArray(manifest?.contents) ? manifest.contents.find((entry) => entry?.file === file) : null;
  if (!item || !/^[a-f0-9]{64}$/i.test(item.sha256 ?? '')) throw new Error(`Manifest is missing a valid ${file} hash`);
  return item;
}

export async function verifyDbEvidenceReceipt(receiptPath, { maxAgeMinutes = 60, requireResetClassification = false } = {}) {
  if (!receiptPath) throw new Error('Missing SFI database snapshot receipt path');
  const resolvedReceipt = path.resolve(receiptPath);
  const receipt = JSON.parse(await readFile(resolvedReceipt, 'utf8'));
  const isV2 = receipt.contract === 'SFI_DB_EVIDENCE_RECEIPT_V2';
  if (!isV2 && receipt.contract !== 'SFI_DB_EVIDENCE_RECEIPT_V1') {
    throw new Error(`Unsupported receipt contract: ${receipt.contract ?? 'missing'}`);
  }
  if (requireResetClassification && !isV2) {
    throw new Error('Canonical reset requires SFI_DB_EVIDENCE_RECEIPT_V2 with immutable table classification evidence');
  }
  if (!/^[a-f0-9]{64}$/i.test(receipt.zip_sha256 ?? '')) throw new Error('Receipt does not contain a valid SHA-256');

  const createdAt = Date.parse(receipt.created_at);
  if (!Number.isFinite(createdAt)) throw new Error('Receipt created_at is invalid');
  const ageMinutes = (Date.now() - createdAt) / 60000;
  if (ageMinutes < -5) throw new Error('Receipt timestamp is unexpectedly in the future');
  if (ageMinutes > maxAgeMinutes) throw new Error(`Receipt is ${ageMinutes.toFixed(1)} minutes old; maximum allowed age is ${maxAgeMinutes} minutes`);

  const zipPath = path.isAbsolute(receipt.zip) ? receipt.zip : path.resolve(path.dirname(resolvedReceipt), receipt.zip);
  const zipStats = await stat(zipPath);
  if (!zipStats.isFile() || zipStats.size <= 0) throw new Error('Snapshot ZIP is missing or empty');
  const actualHash = await sha256(zipPath);
  if (actualHash !== receipt.zip_sha256) throw new Error(`Snapshot hash mismatch: expected ${receipt.zip_sha256}, got ${actualHash}`);

  let manifest = null;
  let publicTables = null;
  let classification = null;
  if (isV2) {
    const manifestEntryData = parseZipJson(zipPath, 'manifest.json');
    const tablesEntryData = parseZipJson(zipPath, 'public-tables.json');
    const classificationEntryData = parseZipJson(zipPath, 'reset-classification.json');
    manifest = manifestEntryData.json;
    publicTables = tablesEntryData.json;
    classification = classificationEntryData.json;

    if (manifest.contract !== 'SFI_DB_EVIDENCE_SNAPSHOT_V2') throw new Error(`Unexpected V2 manifest contract: ${manifest.contract ?? 'missing'}`);
    if (receipt.manifest_sha256 !== manifestEntryData.sha256) throw new Error('Manifest hash does not match receipt');
    if (receipt.public_tables_sha256 !== tablesEntryData.sha256) throw new Error('Public-table inventory hash does not match receipt');
    if (receipt.reset_classification_sha256 !== classificationEntryData.sha256) throw new Error('Reset-classification hash does not match receipt');

    if (tablesEntryData.sha256 !== manifestEntry(manifest, 'public-tables.json').sha256) throw new Error('Public-table inventory hash does not match manifest');
    if (classificationEntryData.sha256 !== manifestEntry(manifest, 'reset-classification.json').sha256) throw new Error('Reset classification hash does not match manifest');
    manifestEntry(manifest, 'database.dump');
    manifestEntry(manifest, 'schema.sql');

    if (publicTables.contract !== 'SFI_DB_PUBLIC_TABLE_INVENTORY_V1') throw new Error(`Unexpected table inventory contract: ${publicTables.contract ?? 'missing'}`);
    if (!Array.isArray(publicTables.tables) || publicTables.tables.some((table) => typeof table !== 'string' || !table)) throw new Error('Snapshot public-table inventory is malformed');
    if (publicTables.public_table_count !== publicTables.tables.length || receipt.public_table_count !== publicTables.tables.length) {
      throw new Error('Snapshot public-table count is inconsistent');
    }
    if (classification.contract !== SFI_CANONICAL_RESET_CONTRACT) throw new Error(`Unexpected reset classification contract: ${classification.contract ?? 'missing'}`);
    if (!Array.isArray(classification.unclassified) || classification.unclassified.length !== 0) {
      throw new Error(`Snapshot contains unclassified public table(s): ${(classification.unclassified ?? []).join(', ')}`);
    }
    if (!Array.isArray(classification.missingRequired) || classification.missingRequired.length !== 0) {
      throw new Error(`Snapshot is missing required preserve/reseed table(s): ${(classification.missingRequired ?? []).join(', ')}`);
    }
    if (classification.resetPermittedByClassification !== true) throw new Error('Snapshot classification did not authorize reset');
    if (receipt.reset_classification_contract !== SFI_CANONICAL_RESET_CONTRACT || manifest.reset_classification_contract !== SFI_CANONICAL_RESET_CONTRACT) {
      throw new Error('Snapshot receipt/manifest classification contract mismatch');
    }
  }

  return {
    ok: true,
    receipt: resolvedReceipt,
    receipt_contract: receipt.contract,
    zip: zipPath,
    zip_sha256: actualHash,
    zip_bytes: zipStats.size,
    created_at: receipt.created_at,
    git_commit: receipt.git_commit ?? null,
    database_host: receipt.database_host ?? null,
    database_name: receipt.database_name ?? null,
    age_minutes: ageMinutes,
    reset_classification_verified: isV2,
    public_tables: publicTables?.tables ?? null,
    preserve_exact_counts: publicTables?.preserve_exact_counts ?? receipt.preserve_exact_counts ?? null,
    classification,
  };
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  const receiptPath = process.argv[2] || process.env.SFI_DB_SNAPSHOT_RECEIPT;
  const maxAgeMinutes = Number(process.env.SFI_DB_SNAPSHOT_MAX_AGE_MINUTES || 60);
  const requireResetClassification = process.env.SFI_DB_REQUIRE_RESET_CLASSIFICATION === 'YES';
  const result = await verifyDbEvidenceReceipt(receiptPath, { maxAgeMinutes, requireResetClassification });
  console.log(JSON.stringify(result, null, 2));
}
