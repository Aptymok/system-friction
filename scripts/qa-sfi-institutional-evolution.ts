import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const evolution = read('src/lib/institution/institutionalEvolution.ts');
const integrated = read('src/core/cognitive-twin/integratedInstitutionalCycle.ts');
const assignments = read('src/lib/sfi/cognitive-runtime/institutionalAssignments.ts');
const outcome = read('src/lib/governance/proposalOutcome.ts');
const lifecycle = read('src/lib/governance/proposalLifecycle.ts');
const approve = read('src/app/api/acp/proposals/[id]/approve/route.ts');
const operational = read('src/lib/operational/common.ts');
const selfDevelopmentWorkflow = read('.github/workflows/sfi-self-development.yml');
const selfDevelopmentRoute = read('src/app/api/cron/self-development/route.ts');
const router = read('src/lib/execution/governedExecutionRouter.ts');
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

// Existing SFI Self-Development is reused as the material executor only for explicit bounded existing-owner scopes.
assert.ok(evolution.includes("requiredExecutor: material\n      ? 'sfi_self_development_v1'"), 'material_candidate_must_use_existing_self_development_executor');
assert.ok(evolution.includes("developmentMode: 'COGNITIVE_INTERNAL' | 'MATERIAL_REPOSITORY' | 'BLOCKED'"), 'material_development_mode_missing');
assert.ok(evolution.includes('MATERIAL_SELF_DEVELOPMENT_SCOPES'), 'bounded_material_scope_registry_missing');
assert.ok(evolution.includes("candidate.ownerResolution === 'NO_EXISTING_OWNER'"), 'no_owner_module_candidate_must_fail_closed');
assert.ok(evolution.includes("'src/lib/sfi/cognitive-runtime/agentExecutionMap.ts'"), 'cognitive_runtime_material_scope_missing');
assert.ok(evolution.includes("'src/lib/continuity/operationalAutoAdvance.ts'"), 'continuity_material_scope_missing');
assert.ok(router.includes("capabilityId: 'sfi_self_development_v1'"), 'material_executor_must_be_registered_in_existing_router');
assert.ok(router.includes("executionClass: 'MATERIAL_INTERNAL'"), 'material_executor_must_remain_distinct_from_external_action');
assert.ok(router.includes('AWAIT_SCHEDULED_SELF_DEVELOPMENT_EXECUTOR'), 'router_must_assign_not_fake_execute_scheduled_material_work');
assert.ok(selfDevelopmentWorkflow.includes('auto/sfi-self-repair-'), 'material_executor_must_use_review_branch');
assert.ok(selfDevelopmentWorkflow.includes('gh pr create'), 'material_executor_must_open_review_pr');
assert.equal(selfDevelopmentWorkflow.includes('gh pr merge'), false, 'material_executor_must_not_merge_itself');
assert.ok(selfDevelopmentRoute.includes('recordProposalOutcomeFromObservedReturn'), 'material_return_must_reuse_canonical_outcome_writer');
assert.ok(selfDevelopmentRoute.includes("developmentStage: 'READY_FOR_ADOPTION'"), 'material_return_must_expose_ready_for_adoption_only_after_return');
assert.ok(selfDevelopmentRoute.includes('canonicalPromotionAllowed: false'), 'material_return_must_not_promote_canon');

// The canonical outcome writer, not the executor, owns the transition from completed development to ROOT adoption review.
assert.ok(outcome.includes("proposalTypeOf(proposal.data as Row) === 'institutional_mutation_candidate'"), 'outcome_writer_must_recognize_institutional_candidate');
assert.ok(outcome.includes("const nextState = input.nextState ?? (institutionalCandidate ? 'proposed' : 'accepted')"), 'candidate_return_must_not_auto_accept_institutional_adoption');
assert.ok(outcome.includes("developmentStage: institutionalCandidate ? 'READY_FOR_ADOPTION'"), 'candidate_ready_for_adoption_state_missing');
assert.ok(outcome.includes("adoptionAuthority: institutionalCandidate ? 'ROOT_ONLY_AFTER_RETURN'"), 'candidate_return_must_preserve_root_adoption_boundary');
assert.ok(outcome.includes('returnRequiredBeforeAdoption: institutionalCandidate ? true : undefined'), 'candidate_adoption_must_require_return');

// ROOT acceptance after RETURN adopts the candidate without running the development executor twice.
assert.ok(lifecycle.includes('isReadyForInstitutionalAdoption'), 'root_lifecycle_must_recognize_ready_candidate');
assert.ok(lifecycle.includes("developmentStage) === 'READY_FOR_ADOPTION'"), 'ready_candidate_stage_check_missing');
assert.ok(lifecycle.includes("returnEventId"), 'ready_candidate_must_retain_observed_return_lineage');
assert.ok(lifecycle.includes("const next = readyForAdoption && input.decision === 'accept' ? 'accepted'"), 'root_accept_must_adopt_ready_candidate_directly');
assert.ok(approve.includes("if (String((decision.data as Record<string, unknown>).status ?? '') === 'accepted')"), 'approve_route_must_detect_direct_adoption');
assert.ok(approve.includes("next: 'institutional_candidate_adopted_without_redispatch'"), 'approve_route_must_not_redispatch_adopted_candidate');

assert.ok(integrated.includes('runInstitutionalEvolutionObservation'), 'scheduled_institutional_cycle_must_run_evolution_observer');
assert.ok(assignments.includes('repair or absorb work into an existing owner before proposing a new module'), 'project_manager_absorption_rule_missing');

// Evolution is absorbed by existing schedulers/workflows. It must not create a parallel institutional-evolution cron.
assert.equal(vercel.includes('/api/cron/institutional-evolution'), false, 'parallel_evolution_cron_forbidden');
assert.equal(evolution.includes("from('"), false, 'evolution_observer_must_not_create_direct_table_writer');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-INSTITUTIONAL-EVOLUTION-1.2',
  inputs: ['cognitive-runtime', 'continuity', 'predictive-engine', 'world-vector', 'institutional-attractor'],
  outputOwner: 'action_proposals',
  maxNewProposalsPerCycle: 4,
  candidateDevelopmentAuthority: 'REVERSIBLE_INTERNAL_AUTONOMY',
  materialExecutor: 'sfi_self_development_v1',
  materialSurface: 'BOUNDED_REPOSITORY_BRANCH_PR_ONLY',
  adoptionAuthority: 'ROOT_ONLY_AFTER_RETURN',
  missingExecutorDisposition: 'BLOCKED_NOT_AUTHORITY_REQUEST',
  founderInterruption: 'SOVEREIGN_BOUNDARY_ONLY',
  newParallelCron: false,
}, null, 2));
