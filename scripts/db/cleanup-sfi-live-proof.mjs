import { createAdminClient } from './sfi-db-client.mjs';

const caseId = process.argv[2];
if (!caseId || !caseId.startsWith('SFI_LIVE_PROOF_')) {
  console.error('Usage: node scripts/db/cleanup-sfi-live-proof.mjs SFI_LIVE_PROOF_<stamp>');
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

console.log(JSON.stringify({ ok: results.every((item) => item.ok), case_id: caseId, results }, null, 2));
