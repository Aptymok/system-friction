import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { buildBoundedContextReading } from '../src/lib/amv/core/boundedContextReading';

const read = (path: string) => readFileSync(path, 'utf8');
const vercel = read('vercel.json');
const routine = read('src/lib/publications/temporalIssueRoutine.ts');
const route = read('src/app/api/cron/notas-temporales/route.ts');
const types = read('src/lib/world-vector/types.ts');
const persistence = read('src/lib/world-vector/persistence.ts');
const editorial = read('src/lib/publications/editorialContent.ts');
const worldRoute = read('src/app/api/cron/world-observatory/route.ts');
const sweep = read('src/lib/world-observatory/instrumentSweep.ts');
const signalScope = read('src/lib/amv/scopes/signal-vane/signal-vaneScope.ts');
const clusterScope = read('src/lib/amv/scopes/cluster-atlas/cluster-atlasScope.ts');
const migration = read('supabase/migrations/20260912213500_extend_world_vector_reports_temporal_issue.sql');

assert.ok(routine.includes("scope: 'signal-vane'"), 'monthly_routine_must_read_signal_vane');
assert.ok(routine.includes("scope: 'cluster-atlas'"), 'monthly_routine_must_read_cluster_atlas');
assert.ok(routine.includes('getPredictiveEngineHealth'), 'monthly_routine_must_observe_predictive_health');
assert.ok(routine.includes("from('world_hypotheses')"), 'monthly_routine_must_include_world_hypotheses');
assert.ok(routine.includes("from('world_hypothesis_outcomes')"), 'monthly_routine_must_include_hypothesis_outcomes');
assert.ok(routine.includes("from('sfi_lab_analyses')"), 'monthly_routine_must_include_method_lab_investigations');
assert.ok(routine.includes(".is('owner_id', null)"), 'monthly_routine_must_exclude_personal_method_lab_rows');
assert.ok(routine.includes('persistWorldVectorReport({ report })'), 'monthly_routine_must_reuse_canonical_world_vector_report_writer');
assert.equal(routine.includes("from('world_vector_reports')"), false, 'monthly_routine_must_not_create_a_second_world_vector_report_writer');
assert.ok(routine.includes("report_type: 'temporal_issue_monthly'"), 'monthly_routine_must_persist_bounded_temporal_issue_type');
assert.ok(routine.includes("target_audience: 'repository'"), 'monthly_routine_must_remain_repository_bounded');
assert.ok(persistence.includes('cycleRange?: WorldVectorCycleRange'), 'canonical_report_writer_must_allow_cycleless_monthly_candidates');
assert.ok(persistence.includes("input.report.report_type !== 'temporal_issue_monthly'"), 'cycleless_report_persistence_must_be_monthly_only');
assert.ok(persistence.includes('world_vector_cycle_required_for_report_type'), 'non_monthly_cycleless_reports_must_fail_closed');
assert.ok(persistence.includes('let cycleId: string | null = null'), 'canonical_report_writer_must_preserve_null_cycle_identity_when_cycle_absent');
assert.ok(persistence.includes('cycle_id: cycleId'), 'canonical_report_writer_must_own_cycle_id_assignment');
assert.equal(routine.includes('cycle_id: null'), false, 'monthly_routine_must_not_write_cycle_identity_directly');
assert.equal(routine.includes('SFI_CANONICAL_OBJECT_REGISTRY'), false, 'cron_must_not_mutate_canonical_registry');
assert.equal(routine.includes('studio_objects'), false, 'monthly_routine_must_not_create_studio_noise');
assert.ok(types.includes("'temporal_issue_monthly'"), 'world_vector_report_type_must_include_monthly_temporal_issue');
assert.ok(migration.includes("report_type = 'temporal_issue_monthly'"), 'monthly_report_migration_missing');
assert.ok(migration.includes('unique index'), 'monthly_candidate_must_be_database_idempotent');
assert.ok(route.includes('runTemporalIssueRoutine'), 'monthly_cron_must_call_bounded_routine');
assert.ok(vercel.includes('/api/cron/notas-temporales'), 'monthly_cron_must_be_scheduled');
assert.ok(vercel.includes('15 14 1 * *'), 'monthly_cron_must_run_once_per_month');

const requiredReadGuard = routine.indexOf('if (requiredReadErrors.length)');
const persistenceCall = routine.indexOf('const persistence = await persistWorldVectorReport({ report })');
assert.ok(requiredReadGuard >= 0 && persistenceCall > requiredReadGuard, 'required_input_fail_closed_guard_must_precede_monthly_persistence');
assert.ok(routine.includes('report: null') && routine.includes('persistence: null'), 'failed_required_reads_must_not_materialize_or_persist_partial_candidate');
assert.ok(routine.includes('No AMV reading was composed and no monthly draft was persisted'), 'retry_boundary_must_state_no_partial_draft');

assert.ok(signalScope.includes("buildBoundedContextReading('signal-vane'"), 'signal_vane_scope_must_consume_selected_context');
assert.ok(clusterScope.includes("buildBoundedContextReading('cluster-atlas'"), 'cluster_atlas_scope_must_consume_selected_context');

const contextA = {
  observations: [{ affectedSystems: ['GRID', 'GRID'], actors: ['OPERATOR_A'], sourceFamily: 'PUBLIC', confidence: 0.8 }],
  hypotheses: [{ status: 'ACTIVE', expectedSignals: ['LOAD_RISE'], contradictionSignals: ['LOAD_DROP'] }],
  outcomes: [{ classification: 'SUPPORTED' }],
  investigations: [{ systems: ['GRID'], variables: ['LATENCY', 'LATENCY'] }],
};
const contextB = {
  observations: [{ affectedSystems: ['MOBILITY', 'MOBILITY'], actors: ['OPERATOR_B'], sourceFamily: 'PUBLIC', confidence: 0.8 }],
  hypotheses: [{ status: 'ACTIVE', expectedSignals: ['DEMAND_RISE'], contradictionSignals: [] }],
  outcomes: [{ classification: 'CONTRADICTED' }],
  investigations: [{ systems: ['MOBILITY'], variables: ['ACCESS', 'ACCESS'] }],
};

const vaneA = buildBoundedContextReading('signal-vane', contextA);
const vaneB = buildBoundedContextReading('signal-vane', contextB);
const atlasA = buildBoundedContextReading('cluster-atlas', contextA);
const atlasB = buildBoundedContextReading('cluster-atlas', contextB);
assert.ok(vaneA && vaneB && atlasA && atlasB, 'bounded_context_readings_must_materialize_for_object_context');
assert.notEqual(vaneA.digest, vaneB.digest, 'signal_vane_digest_must_change_when_context_content_changes');
assert.notEqual(vaneA.summary, vaneB.summary, 'signal_vane_reading_must_change_when_context_content_changes');
assert.notEqual(atlasA.summary, atlasB.summary, 'cluster_atlas_reading_must_change_when_context_content_changes');
assert.match(vaneA.summary, /GRID×3/);
assert.match(vaneB.summary, /MOBILITY×3/);
assert.match(atlasA.summary, /LATENCY×2|GRID×3/);
assert.match(atlasB.summary, /ACCESS×2|MOBILITY×3/);
assert.match(vaneA.summary, /DERIVED/);
assert.match(atlasA.summary, /no implican causalidad/);

assert.ok(editorial.includes("coverImage: '/images/editorial/notas-temporales-septiembre-2026.webp'"), 'notas_temporales_cover_must_be_bound');
assert.ok(editorial.includes("coverImage: '/images/editorial/notas-de-caso.webp'"), 'kavak_case_cover_must_be_bound');
assert.ok(existsSync('public/images/editorial/notas-temporales-septiembre-2026.webp'), 'notas_temporales_cover_asset_missing');
assert.ok(existsSync('public/images/editorial/notas-de-caso.webp'), 'notas_de_caso_cover_asset_missing');

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
  monthlyInputs: ['world observations', 'world hypotheses', 'institutional Method Lab investigations', 'Predictive health'],
  contextualReadings: 'CONTENT_DEPENDENT_DERIVED',
  partialReadPersistence: 'FAIL_CLOSED_NO_DRAFT',
  persistence: 'canonical persistWorldVectorReport -> world_vector_reports / temporal_issue_monthly only when cycleless',
  editorialCovers: ['notas-temporales-septiembre-2026.webp', 'notas-de-caso.webp'],
  personalMethodLabRows: 'EXCLUDED',
  canonicalMutation: false,
  founderInterruption: 'SOVEREIGN_BOUNDARY_ONLY',
}, null, 2));
