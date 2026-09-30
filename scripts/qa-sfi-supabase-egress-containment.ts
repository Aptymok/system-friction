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
const worldMap=read('src/app/api/field/map/world/route.ts');
const journal=read('src/core/cognitive-twin/reentry/journal.ts');
const governance=read('src/lib/governance/readGovernanceHealth.ts');
const commercial=read('src/lib/commercial/commercialService.ts');
const scoreDetection=read('src/lib/scorefriction/detectionState.ts');
const scoreStore=read('src/lib/scorefriction/store.ts');
const studioAutonomy=read('src/lib/continuity/studioAutonomy.ts');

for(const token of [
  'SFI-SUPABASE-READ-BUDGET-1.0',
  'graphNodes',
  'graphEdges',
  'fieldEpochSubjects',
  'fieldEpochRows',
  'jrReturnRuns',
  'jrReturnEpochRows',
  'worldRunCooldownMinutes',
  'worldMapRows',
  'cognitiveJournalRows',
  'governanceProposalRows',
  'commercialWorkspaceRows',
  'scoreFrictionStateRows',
  'scoreFrictionVectorRows',
  'studioAutonomySessions',
  'studioAutonomyObjects',
  'studioAutonomyHypotheses',
  'studioAutonomyEvidence',
  'studioAutonomyArchive',
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
assert.ok(worldMap.includes('SFI_SUPABASE_READ_BUDGET.worldMapRows'), 'world_map_reads_must_be_bounded');
assert.ok(worldMap.includes('supabaseReadBudgetExceeded'), 'world_map_must_fail_closed_on_budget');
assert.ok(journal.includes("select('output_envelope')"), 'ct_journal_must_use_narrow_projection');
assert.ok(journal.includes('SFI_SUPABASE_READ_BUDGET.cognitiveJournalRows'), 'ct_journal_reads_must_be_bounded');
assert.ok(governance.includes('SFI_SUPABASE_READ_BUDGET.governanceProposalRows + 1'), 'governance_reads_must_be_bounded');
assert.ok(!governance.includes("from('action_proposals').select('*')"), 'governance_health_must_not_wildcard_proposals');
assert.ok(commercial.includes('SFI_SUPABASE_READ_BUDGET.commercialWorkspaceRows'), 'commercial_workspace_reads_must_be_bounded');
assert.ok(scoreDetection.includes('SFI_SUPABASE_READ_BUDGET.scoreFrictionVectorRows + 1'), 'scorefriction_vector_reads_must_be_bounded');
assert.ok(scoreDetection.includes("select('observation_id,acoustic_vector,semantic_vector,memetic_vector,platform_vector,mihm_cultural_vector')"), 'scorefriction_vectors_must_use_narrow_projection');
assert.ok(scoreStore.includes('SFI_SUPABASE_READ_BUDGET.scoreFrictionStateRows + 1'), 'scorefriction_state_tables_must_be_bounded');
assert.ok(studioAutonomy.includes('SFI_SUPABASE_READ_BUDGET.studioAutonomyHypotheses + 1'), 'studio_autonomy_hypotheses_must_be_bounded');
assert.ok(studioAutonomy.includes('SFI_SUPABASE_READ_BUDGET.studioAutonomyEvidence + 1'), 'studio_autonomy_evidence_must_be_bounded');
assert.ok(studioAutonomy.includes('SFI_SUPABASE_READ_BUDGET.studioAutonomyArchive + 1'), 'studio_autonomy_archive_must_be_bounded');
assert.ok(!studioAutonomy.includes("from('studio_hypotheses').select('*')"), 'studio_autonomy_hypotheses_must_not_use_wildcard_reads');

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
  boundedWorldMapReads:true,
  narrowCognitiveJournalReads:true,
  boundedGovernanceReads:true,
  boundedCommercialReads:true,
  boundedScoreFrictionReads:true,
  boundedStudioAutonomyReads:true,
},null,2));
