import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const evolution = read('src/lib/institution/institutionalEvolution.ts');
const cycle = read('src/lib/institution/institutionalCycle.ts');
const integrated = read('src/core/cognitive-twin/integratedInstitutionalCycle.ts');
const declaration = read('src/lib/institution/ensureInstitutionalAttractor.ts');
const assignments = read('src/lib/sfi/cognitive-runtime/institutionalAssignments.ts');
const vercel = read('vercel.json');

assert.ok(evolution.includes('readObservedSfiCognitiveRuntime'), 'self_observation_must_read_cognitive_runtime');
assert.ok(evolution.includes('readContinuityDashboard'), 'self_observation_must_read_continuity');
assert.ok(evolution.includes('getPredictiveEngineHealth'), 'self_observation_must_read_predictive_engine');
assert.ok(evolution.includes('buildWorldVectorOperationalState'), 'self_observation_must_read_world_state');
assert.ok(evolution.includes('attractorRefresh'), 'self_observation_must_read_institutional_attractor');
assert.ok(evolution.includes('createActionProposal'), 'evolution_must_reuse_canonical_proposal_writer');
assert.ok(evolution.includes('queryEvolutionProposals'), 'evolution_proposals_must_use_bounded_type_filtered_read');
assert.ok(evolution.includes(".eq('expected_field_delta->>proposalType', SFI_INSTITUTIONAL_MUTATION_PROPOSAL_TYPE)"), 'proposal_type_filter_must_be_applied_in_query');
assert.ok(evolution.indexOf(".eq('expected_field_delta->>proposalType'") < evolution.indexOf('.limit(limit)'), 'proposal_type_filter_must_precede_limit');
assert.ok(evolution.includes("query = query.lte('created_at', sourceCutoff)"), 'proposal_reentry_must_enforce_source_cutoff');
assert.ok(evolution.includes("const REENTRY_PROPOSAL_STATUSES = new Set(['draft', 'proposed', 'waiting_evidence', 'design_approved', 'queued', 'conflicted'])"), 'frozen_proposals_must_be_excluded_from_reentry');
assert.ok(evolution.includes("const DEDUP_PROPOSAL_STATUSES = new Set(['draft', 'proposed', 'waiting_evidence', 'design_approved', 'queued', 'conflicted', 'frozen'])"), 'frozen_proposals_must_still_block_duplicate_recreation');
assert.ok(evolution.includes("CANDIDATE_FINGERPRINT_CONTRACT = 'SFI-INSTITUTIONAL-EVOLUTION-CANDIDATE-1.0'"), 'version_independent_candidate_fingerprint_missing');
assert.ok(evolution.includes("sha256(fingerprintPayload(candidate, 'SFI-INSTITUTIONAL-EVOLUTION-1.0'))"), 'legacy_v1_fingerprint_compatibility_missing');
assert.ok(evolution.includes("sha256(fingerprintPayload(candidate, 'SFI-INSTITUTIONAL-EVOLUTION-1.1'))"), 'legacy_v11_fingerprint_compatibility_missing');
assert.ok(evolution.includes('readOpenInstitutionalEvolutionWork'), 'open_evolution_work_reader_missing');
assert.ok(evolution.includes("authority: 'PROPOSED_NON_EXECUTING'"), 'reentered_work_authority_boundary_missing');
assert.ok(evolution.includes("institutional_mutation_candidate"), 'evolution_proposal_type_missing');
assert.ok(evolution.includes('MAX_NEW_PROPOSALS_PER_CYCLE = 4'), 'proposal_noise_bound_missing');
assert.ok(evolution.includes('executionAuthorized: false'), 'evolution_proposal_must_not_self_authorize_execution');
assert.ok(evolution.includes('canonicalPromotionAllowed: false'), 'evolution_proposal_must_not_self_promote_to_canon');
assert.ok(evolution.includes('externalEffectAllowed: false'), 'evolution_proposal_must_not_create_external_effect');
assert.ok(evolution.includes("founderInterruption: 'ONLY_IF_SOVEREIGN_BOUNDARY'"), 'founder_interruption_boundary_missing');
assert.ok(evolution.includes("evolutionRule: 'ABSORB_OR_REPAIR_EXISTING_OWNER_FIRST'"), 'anti_module_proliferation_rule_missing');
assert.ok(evolution.includes("ownerResolution: 'REPAIR_EXISTING_OWNER'"), 'existing_owner_repair_path_missing');
assert.ok(evolution.includes("kind: 'PREDICTIVE_CALIBRATION'"), 'predictive_drift_calibration_path_missing');
assert.ok(evolution.includes("kind: 'PREDICTIVE_RETURN_RECONCILIATION'"), 'predictive_return_reconciliation_path_missing');

assert.ok(declaration.includes("label: 'SFI Observatory · Manhattan'"), 'manhattan_convergence_coordinate_missing');
assert.ok(declaration.includes("epistemicClass: 'DECLARED'"), 'manhattan_target_must_be_declared');
assert.ok(declaration.includes("status: 'UNRESOLVED'"), 'manhattan_target_must_remain_unresolved');
assert.ok(declaration.includes("attainment: 'UNRESOLVED_NO_CANONICAL_THRESHOLD'"), 'manhattan_attainment_boundary_missing');
assert.ok(declaration.includes('least-inadequate evidence-supported institutional option'), 'manhattan_least_inadequate_decision_rule_missing');
assert.ok(declaration.includes('does not assert an office, lease, partnership, recognition, funding, New York presence'), 'manhattan_nonclaim_boundary_missing');
assert.ok(declaration.includes(".update({\n      status: 'declared'"), 'existing_persisted_attractor_must_be_reconciled_not_only_created');
assert.equal(declaration.includes("status: 'attained'"), false, 'manhattan_must_never_be_declared_attained');

assert.ok(cycle.includes('ensureInstitutionalAttractorDeclaration'), 'cycle_must_reconcile_declared_attractor_before_reading_it');
assert.ok(cycle.includes('readOpenInstitutionalEvolutionWork(12, startedAt)'), 'next_cycle_must_read_open_evolution_work_at_cycle_start_cutoff');
assert.ok(cycle.includes('sourceCutoff: evolutionWork.sourceCutoff'), 'cycle_trace_must_preserve_actual_evolution_work_cutoff');
assert.ok(cycle.includes('declaredTarget'), 'cycle_must_carry_declared_target');
assert.ok(cycle.includes("mode: 'ROUTINE_OWNER_RECONCILIATION'"), 'routine_owner_reconciliation_request_missing');
assert.ok(cycle.includes('ROUTINE_EVOLUTION_WORK_REENTERS_NEXT_CYCLE'), 'founder_away_reentry_invariant_missing');
assert.ok(cycle.includes('externalExecutionAuthorized: false'), 'reentered_work_must_not_claim_external_execution');
assert.ok(integrated.includes('runInstitutionalEvolutionObservation'), 'scheduled_institutional_cycle_must_run_evolution_observer');
assert.ok(integrated.includes('declaredTarget: cycle.declaredTarget'), 'evolution_observer_must_receive_declared_target');
assert.ok(assignments.includes('repair or absorb work into an existing owner before proposing a new module'), 'project_manager_absorption_rule_missing');
assert.ok(assignments.includes('Consume open institutional-evolution executionRequest work on the next cycle'), 'project_manager_reentry_assignment_missing');
assert.ok(assignments.includes('Manhattan Observatory convergence coordinate as DECLARED strategic direction only'), 'meta_orchestrator_manhattan_boundary_missing');

// Evolution is absorbed by the existing institutional-cycle cron. It must not create a scheduler or direct mutation writer of its own.
assert.equal(vercel.includes('/api/cron/institutional-evolution'), false, 'parallel_evolution_cron_forbidden');
assert.equal(evolution.includes(".from('action_proposals').insert"), false, 'evolution_observer_must_not_create_direct_proposal_writer');
assert.equal(evolution.includes(".from('action_proposals').update"), false, 'evolution_observer_must_not_create_direct_proposal_mutator');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-INSTITUTIONAL-EVOLUTION-1.1',
  inputs: ['cognitive-runtime', 'continuity', 'predictive-engine', 'world-vector', 'institutional-attractor', 'open-evolution-work'],
  declaredConvergenceTarget: 'SFI Observatory · Manhattan / DECLARED / UNRESOLVED',
  outputOwner: 'action_proposals',
  reentry: 'next institutional cycle / ROUTINE_OWNER_RECONCILIATION / non-frozen / cutoff-sealed',
  maxNewProposalsPerCycle: 4,
  executionAuthorized: false,
  founderInterruption: 'SOVEREIGN_BOUNDARY_ONLY',
  newParallelCron: false,
}, null, 2));
