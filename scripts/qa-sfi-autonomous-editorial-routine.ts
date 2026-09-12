import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const vercel = read('vercel.json');
const routine = read('src/lib/publications/temporalIssueRoutine.ts');
const route = read('src/app/api/cron/notas-temporales/route.ts');
const types = read('src/lib/world-vector/types.ts');
const persistence = read('src/lib/world-vector/persistence.ts');

assert.ok(routine.includes("scope: 'signal-vane'"), 'monthly_routine_must_read_signal_vane');
assert.ok(routine.includes("scope: 'cluster-atlas'"), 'monthly_routine_must_read_cluster_atlas');
assert.ok(routine.includes('getPredictiveEngineHealth'), 'monthly_routine_must_observe_predictive_health');
assert.ok(routine.includes("from('world_hypotheses')"), 'monthly_routine_must_include_world_hypotheses');
assert.ok(routine.includes("from('world_hypothesis_outcomes')"), 'monthly_routine_must_include_hypothesis_outcomes');
assert.ok(routine.includes("from('sfi_lab_analyses')"), 'monthly_routine_must_include_method_lab_investigations');
assert.ok(routine.includes("report_type: 'temporal_issue_monthly'"), 'monthly_routine_must_use_existing_world_vector_report_writer');
assert.ok(routine.includes("target_audience: 'repository'"), 'monthly_routine_must_remain_repository_bounded');
assert.ok(routine.includes('persistWorldVectorReport'), 'monthly_routine_must_reuse_world_vector_report_persistence');
assert.equal(routine.includes('SFI_CANONICAL_OBJECT_REGISTRY'), false, 'cron_must_not_mutate_canonical_registry');
assert.equal(routine.includes('studio_objects'), false, 'monthly_routine_must_not_create_studio_noise');
assert.ok(types.includes("'temporal_issue_monthly'"), 'world_vector_report_type_must_include_monthly_temporal_issue');
assert.ok(persistence.includes('world_vector_reports'), 'existing_world_vector_report_writer_required');
assert.ok(route.includes('runTemporalIssueRoutine'), 'monthly_cron_must_call_bounded_routine');
assert.ok(vercel.includes('/api/cron/notas-temporales'), 'monthly_cron_must_be_scheduled');
assert.ok(vercel.includes('15 14 1 * *'), 'monthly_cron_must_run_once_per_month');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-AUTONOMOUS-EDITORIAL-ROUTINE-1.0',
  monthlyIssue: 'Notas Temporales',
  instruments: ['signal-vane', 'cluster-atlas'],
  predictive: 'READ_EXISTING_GOVERNED_HEALTH',
  persistence: 'world_vector_reports',
  canonicalMutation: false,
  founderInterruption: 'SOVEREIGN_BOUNDARY_ONLY',
}, null, 2));
