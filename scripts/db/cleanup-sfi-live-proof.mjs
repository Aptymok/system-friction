import { createAdminClient } from './sfi-db-client.mjs';
import { verifyDbEvidenceReceipt } from './verify-db-evidence-snapshot.mjs';

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
  },
  results,
}, null, 2));
