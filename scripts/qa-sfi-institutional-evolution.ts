import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const evolution = read('src/lib/institution/institutionalEvolution.ts');
const integrated = read('src/core/cognitive-twin/integratedInstitutionalCycle.ts');
const assignments = read('src/lib/sfi/cognitive-runtime/institutionalAssignments.ts');
const execution = read('src/lib/execution/governedExecutionRouter.ts');
const operational = read('src/lib/operational/common.ts');
const vercel = read('vercel.json');

assert.ok(evolution.includes('readObservedSfiCognitiveRuntime'), 'self_observation_must_read_cognitive_runtime');
assert.ok(evolution.includes('readContinuityDashboard'), 'self_observation_must_read_continuity');
assert.ok(evolution.includes('getPredictiveEngineHealth'), 'self_observation_must_read_predictive_engine');
assert.ok(evolution.includes('buildWorldVectorOperationalState'), 'self_observation_must_read_world_state');
assert.ok(evolution.includes('attractorRefresh'), 'self_observation_must_read_institutional_attractor');
assert.ok(evolution.includes('createActionProposal'), 'evolution_must_reuse_canonical_proposal_writer');
assert.ok(evolution.includes('latestActionProposals'), 'evolution_proposals_must_deduplicate');
assert.ok(evolution.includes("institutional_mutation_candidate"), 'evolution_proposal_type_missing');
assert.ok(evolution.includes('MAX_NEW_PROPOSALS_PER_CYCLE = 4'), 'proposal_noise_bound_missing');
assert.ok(evolution.includes('executionAuthorized: false'), 'evolution_proposal_must_not_self_authorize_institutional_adoption');
assert.ok(evolution.includes('canonicalPromotionAllowed: false'), 'evolution_proposal_must_not_self_promote_to_canon');
assert.ok(evolution.includes('externalEffectAllowed: false'), 'evolution_proposal_must_not_create_external_effect');
assert.ok(evolution.includes("founderInterruption: 'ONLY_IF_SOVEREIGN_BOUNDARY'"), 'founder_interruption_boundary_missing');
assert.ok(evolution.includes("evolutionRule: 'ABSORB_OR_REPAIR_EXISTING_OWNER_FIRST'"), 'anti_module_proliferation_rule_missing');
assert.ok(evolution.includes("ownerResolution: 'REPAIR_EXISTING_OWNER'"), 'existing_owner_repair_path_missing');
assert.ok(evolution.includes("kind: 'PREDICTIVE_CALIBRATION'"), 'predictive_drift_calibration_path_missing');
assert.ok(evolution.includes("kind: 'PREDICTIVE_RETURN_RECONCILIATION'"), 'predictive_return_reconciliation_path_missing');

// Candidate development is reversible internal work. ROOT is reserved for adoption/use after observed RETURN.
assert.ok(operational.includes('approvalRequired?: boolean'), 'proposal_writer_must_support_bounded_non_sovereign_development');
assert.ok(evolution.includes("developmentAuthority: 'REVERSIBLE_INTERNAL_AUTONOMY'"), 'candidate_internal_development_authority_missing');
assert.ok(evolution.includes("adoptionAuthority: 'ROOT_ONLY_AFTER_RETURN'"), 'candidate_root_adoption_boundary_missing');
assert.ok(evolution.includes('returnRequiredBeforeAdoption: true'), 'candidate_return_before_adoption_missing');
assert.ok(evolution.includes("missingExecutorDisposition: 'BLOCKED_NOT_AUTHORITY_REQUEST'"), 'missing_executor_must_not_be_reframed_as_root_development_approval');
assert.ok(evolution.includes("status: development.queueForDevelopment ? 'queued' : 'waiting_evidence'"), 'bounded_candidate_must_enter_existing_execution_queue_without_root_adoption');
assert.ok(evolution.includes('approvalRequired: development.approvalRequired'), 'candidate_development_approval_boundary_not_persisted');
assert.ok(execution.includes("proposalTypeOf(row) === 'institutional_mutation_candidate'"), 'execution_router_must_recognize_institutional_candidate');
assert.ok(execution.includes("nextState: institutionalCandidate ? 'proposed' : undefined"), 'candidate_return_must_not_auto_accept_institutional_adoption');
assert.ok(execution.includes("developmentStage: 'READY_FOR_ADOPTION'"), 'candidate_ready_for_adoption_state_missing');
assert.ok(execution.includes("adoptionAuthority: 'ROOT_ONLY_AFTER_RETURN'"), 'execution_return_must_preserve_root_adoption_boundary');
assert.ok(execution.includes("missingExecutorDisposition: 'BLOCKED_NOT_AUTHORITY_REQUEST'"), 'execution_block_must_distinguish_missing_executor_from_missing_authority');

assert.ok(integrated.includes('runInstitutionalEvolutionObservation'), 'scheduled_institutional_cycle_must_run_evolution_observer');
assert.ok(assignments.includes('repair or absorb work into an existing owner before proposing a new module'), 'project_manager_absorption_rule_missing');

// Evolution is absorbed by the existing institutional-cycle cron. It must not create a scheduler of its own.
assert.equal(vercel.includes('/api/cron/institutional-evolution'), false, 'parallel_evolution_cron_forbidden');
assert.equal(evolution.includes("from('"), false, 'evolution_observer_must_not_create_direct_table_writer');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-INSTITUTIONAL-EVOLUTION-1.1',
  inputs: ['cognitive-runtime', 'continuity', 'predictive-engine', 'world-vector', 'institutional-attractor'],
  outputOwner: 'action_proposals',
  maxNewProposalsPerCycle: 4,
  candidateDevelopmentAuthority: 'REVERSIBLE_INTERNAL_AUTONOMY',
  adoptionAuthority: 'ROOT_ONLY_AFTER_RETURN',
  missingExecutorDisposition: 'BLOCKED_NOT_AUTHORITY_REQUEST',
  founderInterruption: 'SOVEREIGN_BOUNDARY_ONLY',
  newParallelCron: false,
}, null, 2));
