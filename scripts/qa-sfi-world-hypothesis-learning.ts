import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

async function text(path: string) {
  return readFile(path, 'utf8');
}

async function main() {
  const [cycle, profile] = await Promise.all([
    text('src/lib/world-observatory/hypothesisCycle.ts'),
    text('src/lib/world-observatory/hypothesisLearningProfile.ts'),
  ]);

  assert(profile.includes('readWorldHypothesisLearningProfile'), 'world_hypothesis_learning_profile_reader_missing');
  assert(profile.includes("world_hypothesis_outcomes"), 'world_hypothesis_learning_must_reuse_outcomes');
  assert(profile.includes("world_learning_events"), 'world_hypothesis_learning_must_reuse_learning_events');
  assert(profile.includes('partialValidationRate'), 'world_hypothesis_partial_validation_rate_missing');
  assert(profile.includes('decisiveRate'), 'world_hypothesis_decisive_rate_missing');
  assert(profile.includes('tightenDiscrimination'), 'world_hypothesis_meta_calibration_missing');
  assert(profile.includes('doesNotChangeAttractors: true'), 'world_hypothesis_learning_must_not_mutate_attractors');
  assert(profile.includes('doesNotPromoteTruth: true'), 'world_hypothesis_learning_must_not_promote_truth');

  assert(cycle.includes('readWorldHypothesisLearningProfile'), 'world_hypothesis_cycle_not_consuming_learning_profile');
  assert(cycle.includes('learningProfile'), 'world_hypothesis_learning_profile_not_passed_to_generation');
  assert(cycle.includes('tightenDiscrimination'), 'world_hypothesis_generation_not_conditioned_by_prior_outcomes');
  assert(cycle.includes('Meta-learning may tighten future test discrimination'), 'world_hypothesis_meta_learning_boundary_missing');

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-WORLD-HYPOTHESIS-META-LEARNING-QA-1.0',
    invariants: {
      reusesPersistedOutcomes: true,
      reusesPersistedLearningEvents: true,
      detectsPartialValidationSkew: true,
      affectsFutureHypothesisGeneration: true,
      changesAttractors: false,
      promotesTruth: false,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
