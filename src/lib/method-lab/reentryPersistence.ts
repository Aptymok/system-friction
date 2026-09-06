import 'server-only';

import {
  assertMethodLabExperimentPreregistration,
  assertMethodLabExperimentRun,
  type MethodLabExperimentPreregistration,
  type MethodLabExperimentRun,
} from './experimentContract';
import {
  persistMethodLabExperimentPreregistration,
  persistMethodLabExperimentRun,
} from './experimentPersistence';

function assertReentryPreregistration(preregistration: MethodLabExperimentPreregistration) {
  const validated = assertMethodLabExperimentPreregistration(preregistration);
  if (validated.experimentType !== 'REENTRY') throw new Error('METHOD_LAB_REENTRY_EXPERIMENT_TYPE_REQUIRED');
  if (validated.canonicalMutation !== false) throw new Error('METHOD_LAB_REENTRY_CANNOT_MUTATE_CANON');
  return validated;
}

export async function persistMethodLabReentryPreregistration(input: {
  preregistration: MethodLabExperimentPreregistration;
  ownerId?: string | null;
}) {
  const preregistration = assertReentryPreregistration(input.preregistration);
  return persistMethodLabExperimentPreregistration({
    preregistration,
    ownerId: input.ownerId ?? null,
  });
}

export async function persistMethodLabReentryRun(input: {
  preregistration: MethodLabExperimentPreregistration;
  run: MethodLabExperimentRun;
  ownerId?: string | null;
}) {
  const preregistration = assertReentryPreregistration(input.preregistration);
  const run = assertMethodLabExperimentRun(preregistration, input.run);
  if (run.artifacts.EXECUTED.experimentType !== 'REENTRY') throw new Error('METHOD_LAB_REENTRY_RUN_TYPE_REQUIRED');
  if (run.artifacts.RESULT.epistemicClass === 'OBSERVED') throw new Error('METHOD_LAB_REENTRY_CANNOT_PERSIST_OBSERVED_RESULT');
  if (run.canonicalMutation !== false || run.observationBoundary !== 'SIMULATION_NEVER_INHERITS_OBSERVED') {
    throw new Error('METHOD_LAB_REENTRY_BOUNDARY_INVALID');
  }
  return persistMethodLabExperimentRun({
    preregistration,
    run,
    ownerId: input.ownerId ?? null,
  });
}

// Persistence owner remains the converged Method Lab store (`sfi_lab_analyses`)
// through experimentPersistence. Twin lineage remains in the existing Twin /
// epistemic event owners; this adapter creates no table, event writer, ROOT
// promotion path, observation writer or canon mutation path.
