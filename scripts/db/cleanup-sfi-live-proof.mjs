import { createAdminClient } from './sfi-db-client.mjs';
import { verifyDbEvidenceReceipt } from './verify-db-evidence-snapshot.mjs';

function normalizeHost(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\.$/, '');
}

function supabaseProjectRefFromApiUrl(rawUrl) {
  try {
    const host = normalizeHost(new URL(rawUrl).hostname);
    const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return match?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

function supabaseProjectRefFromDatabaseHost(hostname) {
  const host = normalizeHost(hostname);
  const match = host.match(/^db\.([a-z0-9-]+)\.supabase\.co$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function supabaseProjectRefFromDatabaseUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const hostRef = supabaseProjectRefFromDatabaseHost(url.hostname);
    if (hostRef) return hostRef;
    const username = decodeURIComponent(url.username || '');
    const match = username.match(/(?:^|\.)([a-z0-9-]+)$/i);
    return username.includes('.') ? match?.[1]?.toLowerCase() ?? null : null;
  } catch {
    return null;
  }
}

function assertSnapshotTargetsCleanupDatabase(snapshotReceipt) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!supabaseUrl) throw new Error('Cannot bind snapshot receipt: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');

  const targetProjectRef = supabaseProjectRefFromApiUrl(supabaseUrl);
  if (!targetProjectRef) throw new Error('Cannot bind snapshot receipt: configured Supabase URL does not expose a canonical project ref');

  const receiptHost = normalizeHost(snapshotReceipt.database_host);
  const receiptDatabase = String(snapshotReceipt.database_name ?? '').trim();
  if (!receiptHost || !receiptDatabase) throw new Error('Snapshot receipt is missing database_host or database_name');

  const receiptProjectRef = supabaseProjectRefFromDatabaseHost(receiptHost);
  if (receiptProjectRef) {
    if (receiptProjectRef !== targetProjectRef) {
      throw new Error(`Snapshot target mismatch: receipt project ${receiptProjectRef} does not match cleanup project ${targetProjectRef}`);
    }
    return;
  }

  // Shared Supabase pooler hosts cannot identify a project from hostname alone.
  // Require the same direct database identity used by the evidentiary snapshot.
  const directUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || process.env.CONNECTION_STRING;
  if (!directUrl) {
    throw new Error('Snapshot target cannot be proven from a shared database host; DATABASE_URL, DIRECT_URL or CONNECTION_STRING is required');
  }
  const direct = new URL(directUrl);
  const directHost = normalizeHost(direct.hostname);
  const directDatabase = decodeURIComponent(direct.pathname.replace(/^\//, ''));
  const directProjectRef = supabaseProjectRefFromDatabaseUrl(directUrl);
  if (directHost !== receiptHost || directDatabase !== receiptDatabase) {
    throw new Error('Snapshot target mismatch: receipt host/database does not match the configured direct database target');
  }
  if (!directProjectRef || directProjectRef !== targetProjectRef) {
    throw new Error('Snapshot target mismatch: direct database project does not match the configured Supabase project');
  }
}

const caseId = process.argv[2];
if (!caseId || !caseId.startsWith('SFI_LIVE_PROOF_')) {
  console.error('Usage: node scripts/db/cleanup-sfi-live-proof.mjs SFI_LIVE_PROOF_<stamp>');
  process.exit(1);
}

if (process.env.SFI_LIVE_PROOF_CLEANUP_CONFIRM !== 'DELETE_VERIFIED_LIVE_PROOF_AFTER_SNAPSHOT') {
  console.error(JSON.stringify({
    ok: false,
    blocked: true,
    reason: 'Live-proof cleanup is destructive and is disabled by default.',
    required: 'SFI_LIVE_PROOF_CLEANUP_CONFIRM=DELETE_VERIFIED_LIVE_PROOF_AFTER_SNAPSHOT',
  }, null, 2));
  process.exit(1);
}

const snapshotReceiptPath = process.env.SFI_DB_SNAPSHOT_RECEIPT;
if (!snapshotReceiptPath) {
  console.error(JSON.stringify({
    ok: false,
    blocked: true,
    reason: 'No database evidence snapshot receipt supplied. Generate a full PostgreSQL ZIP snapshot first and pass its receipt path as SFI_DB_SNAPSHOT_RECEIPT.',
  }, null, 2));
  process.exit(1);
}

let snapshotReceipt;
try {
  snapshotReceipt = await verifyDbEvidenceReceipt(snapshotReceiptPath, {
    maxAgeMinutes: Number(process.env.SFI_DB_SNAPSHOT_MAX_AGE_MINUTES || 60),
  });
  assertSnapshotTargetsCleanupDatabase(snapshotReceipt);
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    blocked: true,
    reason: 'Database evidence snapshot verification failed.',
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
}

const supabase = createAdminClient();
const results = [];

async function remove(table, column = 'case_id') {
  const { data, error } = await supabase.from(table).delete().eq(column, caseId).select('id');
  results.push({ table, ok: !error, deleted: data?.length ?? 0, error: error?.message ?? null });
}

await remove('sfi_lessons');
await remove('sfi_outcomes');
await remove('sfi_execution_ledger');
await remove('sfi_field_perturbations');

const proposalDelete = await supabase
  .from('action_proposals')
  .delete()
  .ilike('title', 'SFI_LIVE_PROOF:%')
  .select('id');
results.push({
  table: 'action_proposals',
  ok: !proposalDelete.error,
  deleted: proposalDelete.data?.length ?? 0,
  error: proposalDelete.error?.message ?? null,
});

console.log(JSON.stringify({
  ok: results.every((item) => item.ok),
  case_id: caseId,
  db_snapshot: {
    receipt: snapshotReceipt.receipt,
    sha256: snapshotReceipt.zip_sha256,
    created_at: snapshotReceipt.created_at,
    git_commit: snapshotReceipt.git_commit,
    database_host: snapshotReceipt.database_host,
    database_name: snapshotReceipt.database_name,
    target_binding_verified: true,
  },
  results,
}, null, 2));
