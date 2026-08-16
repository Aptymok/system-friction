import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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

export async function verifyDbEvidenceReceipt(receiptPath, { maxAgeMinutes = 60 } = {}) {
  if (!receiptPath) throw new Error('Missing SFI database snapshot receipt path');
  const resolvedReceipt = path.resolve(receiptPath);
  const receipt = JSON.parse(await readFile(resolvedReceipt, 'utf8'));
  if (receipt.contract !== 'SFI_DB_EVIDENCE_RECEIPT_V1') throw new Error(`Unsupported receipt contract: ${receipt.contract ?? 'missing'}`);
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

  return {
    ok: true,
    receipt: resolvedReceipt,
    zip: zipPath,
    zip_sha256: actualHash,
    zip_bytes: zipStats.size,
    created_at: receipt.created_at,
    git_commit: receipt.git_commit ?? null,
    database_host: receipt.database_host ?? null,
    database_name: receipt.database_name ?? null,
    age_minutes: ageMinutes,
  };
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  const receiptPath = process.argv[2] || process.env.SFI_DB_SNAPSHOT_RECEIPT;
  const maxAgeMinutes = Number(process.env.SFI_DB_SNAPSHOT_MAX_AGE_MINUTES || 60);
  const result = await verifyDbEvidenceReceipt(receiptPath, { maxAgeMinutes });
  console.log(JSON.stringify(result, null, 2));
}
