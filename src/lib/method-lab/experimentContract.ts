export const METHOD_LAB_EXPERIMENT_CONTRACT_VERSION = 'SFI-METHOD-LAB-EXPERIMENT-1.0' as const;

export const METHOD_LAB_EXPERIMENT_TYPES = [
  'SIMULATION',
  'REPLAY',
  'REENTRY',
  'COUNTERFACTUAL',
  'MODEL_COMPARISON',
  'PASSPORT_COMPARISON',
  'TWIN_COMPARISON',
  'INTERVENTION_DESIGN',
  'OBSERVATIONAL',
] as const;

export type MethodLabExperimentType = (typeof METHOD_LAB_EXPERIMENT_TYPES)[number];
export type MethodLabExperimentResultEpistemicClass = 'SIMULATED' | 'DERIVED' | 'OBSERVED';

export type MethodLabExperimentPreregistration = {
  contractVersion: typeof METHOD_LAB_EXPERIMENT_CONTRACT_VERSION;
  experimentId: string;
  experimentType: MethodLabExperimentType;
  METHOD: {
    methodId: string;
    version: string;
    description: string;
  };
  HYPOTHESIS: {
    statement: string;
    nullStatement: string | null;
  };
  T0: {
    cutoff: string;
    timezone: string | null;
    frozenInputRefs: string[];
  };
  POPULATION_SYSTEM: {
    kind: 'POPULATION' | 'SYSTEM';
    ref: string;
    description: string;
  };
  INPUTS: Array<{
    ref: string;
    role: 'EVIDENCE' | 'CONTEXT' | 'PARAMETER' | 'MODEL' | 'PASSPORT' | 'TWIN_STATE';
    epistemicClass: 'OBSERVED' | 'DECLARED' | 'DERIVED' | 'INFERRED' | 'SIMULATED' | 'MISSING';
  }>;
  CONTROL: {
    kind: 'CONTROL' | 'NONE';
    description: string;
    inputRefs: string[];
  };
  VARIANTS: Array<{
    variantId: string;
    description: string;
    changes: Record<string, unknown>;
  }>;
  EXPECTED_SIGNAL: {
    description: string;
    measures: string[];
  };
  FALSIFICATION: {
    condition: string;
    requiredEvidence: string[];
  };
  STOPPING_RULE: {
    condition: string;
    maxExecutions: number | null;
  };
  RETURN_WINDOW: {
    opensAt: string;
    closesAt: string;
    required: boolean;
  };
  preregisteredAt: string;
  preregisteredBy: string | null;
  canonicalMutation: false;
};

export type MethodLabRealityReturn = {
  source: 'REALITY';
  observedAt: string;
  evidenceRefs: string[];
  outcome: Record<string, unknown>;
};

export type MethodLabExperimentRunArtifacts = {
  PREREGISTERED: {
    preregistrationRef: string;
    preregistrationHash: string;
  };
  EXECUTED: {
    runId: string;
    experimentId: string;
    experimentType: MethodLabExperimentType;
    startedAt: string;
    finishedAt: string;
    provider: string | null;
    model: string | null;
    passportRef: string | null;
    twinStateRef: string | null;
    seed: string | number | null;
  };
  RESULT: {
    epistemicClass: MethodLabExperimentResultEpistemicClass;
    payload: Record<string, unknown>;
    evidenceRefs: string[];
    resultHash: string;
  };
  CONTRAST: {
    status: 'PENDING_RETURN' | 'AVAILABLE' | 'NOT_APPLICABLE';
    payload: Record<string, unknown> | null;
    realityReturn: MethodLabRealityReturn | null;
  };
  LIMITATIONS: string[];
  REPRODUCIBILITY_RECEIPT: {
    contractVersion: typeof METHOD_LAB_EXPERIMENT_CONTRACT_VERSION;
    codeRef: string;
    preregistrationHash: string;
    inputHash: string;
    resultHash: string;
    executorRefs: string[];
    createdAt: string;
  };
};

export type MethodLabExperimentRun = {
  contractVersion: typeof METHOD_LAB_EXPERIMENT_CONTRACT_VERSION;
  artifacts: MethodLabExperimentRunArtifacts;
  canonicalMutation: false;
  observationBoundary: 'SIMULATION_NEVER_INHERITS_OBSERVED';
};

function assertIso(value: string, field: string) {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error(`METHOD_LAB_EXPERIMENT_INVALID_${field.toUpperCase()}`);
}

function assertNonEmpty(value: string, field: string) {
  if (!value.trim()) throw new Error(`METHOD_LAB_EXPERIMENT_INVALID_${field.toUpperCase()}`);
}

function assertUniqueRefs(values: string[], field: string) {
  const normalized = values.map((value) => value.trim()).filter(Boolean);
  if (normalized.length !== values.length || new Set(normalized).size !== normalized.length) {
    throw new Error(`METHOD_LAB_EXPERIMENT_INVALID_${field.toUpperCase()}`);
  }
}

export function assertMethodLabExperimentPreregistration(value: MethodLabExperimentPreregistration) {
  if (value.contractVersion !== METHOD_LAB_EXPERIMENT_CONTRACT_VERSION) throw new Error('METHOD_LAB_EXPERIMENT_CONTRACT_VERSION_INVALID');
  if (!METHOD_LAB_EXPERIMENT_TYPES.includes(value.experimentType)) throw new Error('METHOD_LAB_EXPERIMENT_TYPE_INVALID');
  assertNonEmpty(value.experimentId, 'experiment_id');
  assertNonEmpty(value.METHOD.methodId, 'method_id');
  assertNonEmpty(value.METHOD.version, 'method_version');
  assertNonEmpty(value.METHOD.description, 'method_description');
  assertNonEmpty(value.HYPOTHESIS.statement, 'hypothesis');
  assertIso(value.T0.cutoff, 't0');
  assertUniqueRefs(value.T0.frozenInputRefs, 't0_frozen_input_refs');
  assertNonEmpty(value.POPULATION_SYSTEM.ref, 'population_system_ref');
  assertNonEmpty(value.POPULATION_SYSTEM.description, 'population_system_description');
  if (value.INPUTS.length === 0) throw new Error('METHOD_LAB_EXPERIMENT_INPUTS_REQUIRED');
  assertUniqueRefs(value.INPUTS.map((item) => item.ref), 'input_refs');
  assertUniqueRefs(value.CONTROL.inputRefs, 'control_input_refs');
  assertNonEmpty(value.CONTROL.description, 'control_description');
  if (value.VARIANTS.length === 0) throw new Error('METHOD_LAB_EXPERIMENT_VARIANT_REQUIRED');
  assertUniqueRefs(value.VARIANTS.map((item) => item.variantId), 'variant_ids');
  for (const variant of value.VARIANTS) assertNonEmpty(variant.description, 'variant_description');
  assertNonEmpty(value.EXPECTED_SIGNAL.description, 'expected_signal');
  if (value.EXPECTED_SIGNAL.measures.length === 0) throw new Error('METHOD_LAB_EXPERIMENT_EXPECTED_SIGNAL_MEASURE_REQUIRED');
  assertUniqueRefs(value.EXPECTED_SIGNAL.measures, 'expected_signal_measures');
  assertNonEmpty(value.FALSIFICATION.condition, 'falsification');
  assertUniqueRefs(value.FALSIFICATION.requiredEvidence, 'falsification_required_evidence');
  assertNonEmpty(value.STOPPING_RULE.condition, 'stopping_rule');
  if (value.STOPPING_RULE.maxExecutions !== null && (!Number.isInteger(value.STOPPING_RULE.maxExecutions) || value.STOPPING_RULE.maxExecutions < 1)) {
    throw new Error('METHOD_LAB_EXPERIMENT_MAX_EXECUTIONS_INVALID');
  }
  assertIso(value.RETURN_WINDOW.opensAt, 'return_window_opens_at');
  assertIso(value.RETURN_WINDOW.closesAt, 'return_window_closes_at');
  if (Date.parse(value.RETURN_WINDOW.closesAt) < Date.parse(value.RETURN_WINDOW.opensAt)) throw new Error('METHOD_LAB_EXPERIMENT_RETURN_WINDOW_INVALID');
  assertIso(value.preregisteredAt, 'preregistered_at');
  if (value.canonicalMutation !== false) throw new Error('METHOD_LAB_EXPERIMENT_CANNOT_MUTATE_CANON');
  return value;
}

export function assertMethodLabExperimentRun(
  preregistration: MethodLabExperimentPreregistration,
  value: MethodLabExperimentRun,
) {
  assertMethodLabExperimentPreregistration(preregistration);
  if (value.contractVersion !== METHOD_LAB_EXPERIMENT_CONTRACT_VERSION) throw new Error('METHOD_LAB_EXPERIMENT_CONTRACT_VERSION_INVALID');
  if (value.canonicalMutation !== false) throw new Error('METHOD_LAB_EXPERIMENT_CANNOT_MUTATE_CANON');
  if (value.observationBoundary !== 'SIMULATION_NEVER_INHERITS_OBSERVED') throw new Error('METHOD_LAB_EXPERIMENT_OBSERVATION_BOUNDARY_INVALID');

  const { PREREGISTERED, EXECUTED, RESULT, CONTRAST, LIMITATIONS, REPRODUCIBILITY_RECEIPT } = value.artifacts;
  assertNonEmpty(PREREGISTERED.preregistrationRef, 'preregistration_ref');
  assertNonEmpty(PREREGISTERED.preregistrationHash, 'preregistration_hash');
  assertNonEmpty(EXECUTED.runId, 'run_id');
  if (EXECUTED.experimentId !== preregistration.experimentId || EXECUTED.experimentType !== preregistration.experimentType) {
    throw new Error('METHOD_LAB_EXPERIMENT_RUN_PREREGISTRATION_MISMATCH');
  }
  assertIso(EXECUTED.startedAt, 'run_started_at');
  assertIso(EXECUTED.finishedAt, 'run_finished_at');
  if (Date.parse(EXECUTED.finishedAt) < Date.parse(EXECUTED.startedAt)) throw new Error('METHOD_LAB_EXPERIMENT_RUN_TIME_INVALID');
  assertUniqueRefs(RESULT.evidenceRefs, 'result_evidence_refs');
  assertNonEmpty(RESULT.resultHash, 'result_hash');

  if (preregistration.experimentType !== 'OBSERVATIONAL' && RESULT.epistemicClass === 'OBSERVED') {
    throw new Error('METHOD_LAB_EXPERIMENT_SIMULATION_CANNOT_BECOME_OBSERVED');
  }
  if (CONTRAST.status === 'AVAILABLE') {
    if (!CONTRAST.realityReturn) throw new Error('METHOD_LAB_EXPERIMENT_RETURN_REQUIRED_FOR_CONTRAST');
    if (CONTRAST.realityReturn.source !== 'REALITY') throw new Error('METHOD_LAB_EXPERIMENT_RETURN_MUST_COME_FROM_REALITY');
    assertIso(CONTRAST.realityReturn.observedAt, 'return_observed_at');
    if (CONTRAST.realityReturn.evidenceRefs.length === 0) throw new Error('METHOD_LAB_EXPERIMENT_RETURN_EVIDENCE_REQUIRED');
    assertUniqueRefs(CONTRAST.realityReturn.evidenceRefs, 'return_evidence_refs');
  } else if (CONTRAST.realityReturn !== null) {
    throw new Error('METHOD_LAB_EXPERIMENT_RETURN_WITHOUT_AVAILABLE_CONTRAST');
  }

  if (LIMITATIONS.length === 0 || LIMITATIONS.some((item) => !item.trim())) throw new Error('METHOD_LAB_EXPERIMENT_LIMITATIONS_REQUIRED');
  if (REPRODUCIBILITY_RECEIPT.contractVersion !== METHOD_LAB_EXPERIMENT_CONTRACT_VERSION) throw new Error('METHOD_LAB_EXPERIMENT_RECEIPT_VERSION_INVALID');
  assertNonEmpty(REPRODUCIBILITY_RECEIPT.codeRef, 'reproducibility_code_ref');
  assertNonEmpty(REPRODUCIBILITY_RECEIPT.preregistrationHash, 'reproducibility_preregistration_hash');
  assertNonEmpty(REPRODUCIBILITY_RECEIPT.inputHash, 'reproducibility_input_hash');
  assertNonEmpty(REPRODUCIBILITY_RECEIPT.resultHash, 'reproducibility_result_hash');
  assertUniqueRefs(REPRODUCIBILITY_RECEIPT.executorRefs, 'reproducibility_executor_refs');
  assertIso(REPRODUCIBILITY_RECEIPT.createdAt, 'reproducibility_created_at');
  if (REPRODUCIBILITY_RECEIPT.preregistrationHash !== PREREGISTERED.preregistrationHash) throw new Error('METHOD_LAB_EXPERIMENT_PREREGISTRATION_HASH_MISMATCH');
  if (REPRODUCIBILITY_RECEIPT.resultHash !== RESULT.resultHash) throw new Error('METHOD_LAB_EXPERIMENT_RESULT_HASH_MISMATCH');
  return value;
}
