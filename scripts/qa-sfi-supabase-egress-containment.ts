import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');

const budget=read('src/lib/supabase/readBudget.ts');
const graph=read('src/lib/graph/canonicalGraph.ts');
const history=read('src/lib/mihm/scientificMethodRuntime.ts');
const jr=read('src/lib/mihm/jrFieldCycle.ts');
const returns=read('src/lib/mihm/jrReturnReconciliation.ts');
const world=read('src/app/api/external/v1/world/route.ts');
const events=read('src/lib/events/eventStore.ts');

for(const token of [
  'SFI-SUPABASE-READ-BUDGET-1.0',
  'graphNodes',
  'graphEdges',
  'fieldEpochSubjects',
  'fieldEpochRows',
  'jrReturnRuns',
  'jrReturnEpochRows',
  'worldRunCooldownMinutes',
]) assert.ok(budget.includes(token),`read_budget_contract_missing:${token}`);

assert.ok(graph.includes('.limit(SFI_SUPABASE_READ_BUDGET.graphNodes + 1)'), 'graph_nodes_must_be_bounded');
assert.ok(graph.includes('.limit(SFI_SUPABASE_READ_BUDGET.graphEdges + 1)'), 'graph_edges_must_be_bounded');
assert.ok(!graph.includes(".select('*')"), 'canonical_graph_must_not_use_wildcard_reads');
assert.ok(graph.includes('supabaseReadBudgetExceeded'), 'canonical_graph_must_fail_closed_on_budget');

assert.ok(history.includes('SFI_SUPABASE_READ_BUDGET.fieldEpochSubjects'), 'epoch_subjects_must_be_bounded');
assert.ok(history.includes('SFI_SUPABASE_READ_BUDGET.fieldEpochRows + 1'), 'epoch_rows_must_be_bounded');
assert.ok(history.includes('FIELD_EPOCH_HISTORY_BUDGET_EXCEEDED'), 'epoch_history_must_fail_closed');

assert.ok(returns.includes('SFI_SUPABASE_READ_BUDGET.jrReturnRuns'), 'return_runs_must_be_bounded');
assert.ok(returns.includes('SFI_SUPABASE_READ_BUDGET.jrReturnEpochRows + 1'), 'return_epochs_must_be_bounded');
assert.ok(returns.includes('JR_RETURN_EPOCH_BUDGET_EXCEEDED'), 'return_reconciliation_must_fail_closed');

assert.ok(jr.includes('SFI_SUPABASE_READ_BUDGET.jrScientificTargets'), 'jr_scientific_targets_must_be_bounded');
assert.ok(jr.includes('SFI_SUPABASE_READ_BUDGET.jrEpochWrites'), 'jr_epoch_writes_must_be_bounded');
assert.ok(jr.includes('SFI_SUPABASE_READ_BUDGET.jrPhenomenonWrites'), 'jr_phenomenon_writes_must_be_bounded');
assert.ok(jr.includes('historyReadError'), 'jr_must_surface_bounded_history_degradation');

assert.ok(world.includes("status:'COOLDOWN_SKIPPED'"), 'world_run_must_have_cooldown');
assert.ok(world.includes('SFI_SUPABASE_READ_BUDGET.worldRunCooldownMinutes'), 'world_cooldown_must_use_budget_contract');
assert.ok(world.includes("select('event_id,event_name,occurred_at')"), 'world_state_receipt_read_must_be_lightweight');
assert.ok(!world.includes("select('event_id,event_name,occurred_at,payload')"), 'world_state_must_not_refetch_heavy_receipt_payload');

assert.ok(events.includes("returnMode?: 'full'|'receipt'"), 'event_store_must_support_compact_receipts');
assert.ok(events.includes("event_id,event_name,logbook_id,epistemic_class,occurred_at,sequence,hash_self"), 'compact_receipt_projection_missing');

for(const path of [
  'src/lib/mihm/fieldTemporalPersistence.ts',
  'src/lib/mihm/distributedPhenomena.ts',
  'src/lib/mihm/scientificMethodRuntime.ts',
  'src/lib/mihm/activeObservationQueue.ts',
  'src/lib/mihm/perturbationReviewQueue.ts',
  'src/lib/mihm/scientificMethodDispatch.ts',
  'src/lib/mihm/jrFieldCycle.ts',
  'src/app/api/external/v1/world/route.ts',
]) assert.ok(read(path).includes("returnMode:'receipt'"),`compact_receipt_not_enabled:${path}`);

console.log(JSON.stringify({
  ok:true,
  contract:'SFI-SUPABASE-EGRESS-CONTAINMENT-QA-1.0',
  wildcardGraphReads:false,
  boundedGraphReads:true,
  boundedEpochReads:true,
  boundedReturnReads:true,
  boundedJrWork:true,
  worldRunCooldown:true,
  compactWriteReceipts:true,
},null,2));
