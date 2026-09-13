import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const evolution = read('src/lib/institution/institutionalEvolution.ts');
const integrated = read('src/core/cognitive-twin/integratedInstitutionalCycle.ts');
const assignments = read('src/lib/sfi/cognitive-runtime/institutionalAssignments.ts');
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
assert.ok(evolution.includes('executionAuthorized: false'), 'evolution_proposal_must_not_self_authorize_execution');
assert.ok(evolution.includes('canonicalPromotionAllowed: false'), 'evolution_proposal_must_not_self_promote_to_canon');
assert.ok(evolution.includes('externalEffectAllowed: false'), 'evolution_proposal_must_not_create_external_effect');
assert.ok(evolution.includes("founderInterruption: 'ONLY_IF_SOVEREIGN_BOUNDARY'"), 'founder_interruption_boundary_missing');
assert.ok(evolution.includes("evolutionRule: 'ABSORB_OR_REPAIR_EXISTING_OWNER_FIRST'"), 'anti_module_proliferation_rule_missing');
assert.ok(evolution.includes("ownerResolution: 'REPAIR_EXISTING_OWNER'"), 'existing_owner_repair_path_missing');
assert.ok(evolution.includes("kind: 'PREDICTIVE_CALIBRATION'"), 'predictive_drift_calibration_path_missing');
assert.ok(evolution.includes("kind: 'PREDICTIVE_RETURN_RECONCILIATION'"), 'predictive_return_reconciliation_path_missing');
assert.ok(integrated.includes('runInstitutionalEvolutionObservation'), 'scheduled_institutional_cycle_must_run_evolution_observer');
assert.ok(assignments.includes('repair or absorb work into an existing owner before proposing a new module'), 'project_manager_absorption_rule_missing');

// Evolution is absorbed by the existing institutional-cycle cron. It must not create a scheduler of its own.
assert.equal(vercel.includes('/api/cron/institutional-evolution'), false, 'parallel_evolution_cron_forbidden');
assert.equal(evolution.includes("from('"), false, 'evolution_observer_must_not_create_direct_table_writer');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-INSTITUTIONAL-EVOLUTION-1.0',
  inputs: ['cognitive-runtime', 'continuity', 'predictive-engine', 'world-vector', 'institutional-attractor'],
  outputOwner: 'action_proposals',
  maxNewProposalsPerCycle: 4,
  executionAuthorized: false,
  founderInterruption: 'SOVEREIGN_BOUNDARY_ONLY',
  newParallelCron: false,
}, null, 2));
