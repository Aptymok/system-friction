import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const vercel = read('vercel.json');
const routine = read('src/lib/publications/temporalIssueRoutine.ts');
const route = read('src/app/api/cron/notas-temporales/route.ts');
const types = read('src/lib/world-vector/types.ts');
const worldRoute = read('src/app/api/cron/world-observatory/route.ts');
const sweep = read('src/lib/world-observatory/instrumentSweep.ts');
const migration = read('supabase/migrations/20260912213500_extend_world_vector_reports_temporal_issue.sql');

assert.ok(routine.includes("scope: 'signal-vane'"), 'monthly_routine_must_read_signal_vane');
assert.ok(routine.includes("scope: 'cluster-atlas'"), 'monthly_routine_must_read_cluster_atlas');
assert.ok(routine.includes('getPredictiveEngineHealth'), 'monthly_routine_must_observe_predictive_health');
assert.ok(routine.includes("from('world_hypotheses')"), 'monthly_routine_must_include_world_hypotheses');
assert.ok(routine.includes("from('world_hypothesis_outcomes')"), 'monthly_routine_must_include_hypothesis_outcomes');
assert.ok(routine.includes("from('sfi_lab_analyses')"), 'monthly_routine_must_include_method_lab_investigations');
assert.ok(routine.includes("from('world_vector_reports')"), 'monthly_routine_must_reuse_existing_world_vector_report_plane');
assert.ok(routine.includes("report_type: 'temporal_issue_monthly'"), 'monthly_routine_must_persist_bounded_temporal_issue_type');
assert.ok(routine.includes("target_audience: 'repository'"), 'monthly_routine_must_remain_repository_bounded');
assert.ok(routine.includes('cycle_id: null'), 'monthly_issue_must_not_fabricate_world_vector_cycle_identity');
assert.equal(routine.includes('SFI_CANONICAL_OBJECT_REGISTRY'), false, 'cron_must_not_mutate_canonical_registry');
assert.equal(routine.includes('studio_objects'), false, 'monthly_routine_must_not_create_studio_noise');
assert.ok(types.includes("'temporal_issue_monthly'"), 'world_vector_report_type_must_include_monthly_temporal_issue');
assert.ok(migration.includes("report_type = 'temporal_issue_monthly'"), 'monthly_report_migration_missing');
assert.ok(migration.includes('unique index'), 'monthly_candidate_must_be_database_idempotent');
assert.ok(route.includes('runTemporalIssueRoutine'), 'monthly_cron_must_call_bounded_routine');
assert.ok(vercel.includes('/api/cron/notas-temporales'), 'monthly_cron_must_be_scheduled');
assert.ok(vercel.includes('15 14 1 * *'), 'monthly_cron_must_run_once_per_month');

assert.ok(worldRoute.includes('runWorldInstrumentSweep'), 'daily_world_cron_must_run_instrument_sweep');
assert.ok(sweep.includes("scope: 'signal-vane'"), 'daily_sweep_must_read_signal_vane');
assert.ok(sweep.includes("scope: 'cluster-atlas'"), 'daily_sweep_must_read_cluster_atlas');
assert.ok(sweep.includes('getPredictiveEngineHealth'), 'daily_sweep_must_read_predictive_health');
assert.ok(sweep.includes('writesPerformed: false'), 'daily_instrument_sweep_must_remain_read_only');
assert.equal(sweep.includes("from('"), false, 'instrument_sweep_must_not_create_a_persistence_owner');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-AUTONOMOUS-EDITORIAL-ROUTINE-1.0',
  dailyWorldSweep: ['signal-vane', 'cluster-atlas', 'predictive-health'],
  monthlyIssue: 'Notas Temporales',
  monthlyInputs: ['world observations', 'world hypotheses', 'hypothesis outcomes', 'Method Lab investigations', 'Predictive health'],
  persistence: 'world_vector_reports / temporal_issue_monthly',
  canonicalMutation: false,
  founderInterruption: 'SOVEREIGN_BOUNDARY_ONLY',
}, null, 2));
