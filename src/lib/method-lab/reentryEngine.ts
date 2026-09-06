import { createHash } from 'node:crypto';
import {
  assertCognitiveTwinStateTransition,
  type CognitiveTwinEpistemicClass,
  type CognitiveTwinStateTransition,
  type CognitiveTwinT0State,
} from '../../core/cognitive-twin/stateContract';
import {
  METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
  assertMethodLabExperimentPreregistration,
  assertMethodLabExperimentRun,
  type MethodLabExperimentPreregistration,
  type MethodLabExperimentRun,
} from './experimentContract';

export const METHOD_LAB_REENTRY_CONTRACT_VERSION = 'SFI-METHOD-LAB-REENTRY-1.0' as const;
export const METHOD_LAB_REENTRY_BOUNDARIES = [
  'MODEL CONTEXT != TWIN MEMORY',
  'SIMULATION != OBSERVATION',
  'REENTRY != OBSERVATION',
  'RESULT != CANON',
  'ACCEPTED LEARNING != CANON',
] as const;

export const METHOD_LAB_REENTRY_DELTA_DIMENSIONS = [
  { key: 'attention', label: 'Δattention' },
  { key: 'evidenceSelection', label: 'Δevidence_selection' },
  { key: 'hypothesisGeneration', label: 'Δhypothesis_generation' },
  { key: 'contradictionDetection', label: 'Δcontradiction_detection' },
  { key: 'uncertainty', label: 'Δuncertainty' },
  { key: 'decision', label: 'Δdecision' },
  { key: 'intervention', label: 'Δintervention' },
  { key: 'prediction', label: 'Δprediction' },
  { key: 'outcome', label: 'Δoutcome' },
] as const;

export type MethodLabReentryDeltaDimension = (typeof METHOD_LAB_REENTRY_DELTA_DIMENSIONS)[number]['key'];
export type MethodLabReentryConfigurationAxis = 'MODEL' | 'PASSPORT' | 'EVIDENCE_SET' | 'TWIN_STATE' | 'EXPERIMENT_CONFIGURATION';

export type MethodLabReentryFrozenT0 = Readonly<{
  contractVersion: typeof METHOD_LAB_REENTRY_CONTRACT_VERSION;
  caseRef: string;
  sourceTransitionRef: string;
  cutoff: string;
  twinT0: CognitiveTwinT0State;
  sourceLineageRefs: string[];
  t0Hash: string;
  boundary: 'MODEL_CONTEXT_IS_NOT_TWIN_MEMORY';
}>;

export type MethodLabReentryConfiguration = {
  configurationId: string;
  model: { provider: string; model: string; version: string };
  passport: { id: string; version: string };
  evidenceSetRefs: string[];
  twinState: { ref: string; stateHash: string };
  experimentConfiguration: Record<string, unknown>;
  seed: string | number | null;
  adaptiveCapabilityPolicy: 'FORBID' | 'ALLOW_GOVERNED';
};

export type MethodLabReentryMeasurement = {
  availability: 'MEASURED' | 'NOT_AVAILABLE';
  value: unknown | null;
  basisRefs: string[];
};

export type MethodLabReentryMeasurements = Record<MethodLabReentryDeltaDimension, MethodLabReentryMeasurement>;

export type MethodLabReentryRuntimeReceipt = {
  trajectoryId: string;
  taskGraphRef: string;
  capabilityDecisionRefs: string[];
  modelSelectionRefs: string[];
  modelExecutionRefs: string[];
  resolvedConfiguration: {
    model: MethodLabReentryConfiguration['model'];
    passportRef: string;
    evidenceSetRefs: string[];
    twinState: MethodLabReentryConfiguration['twinState'];
    experimentConfigurationHash: string;
  };
};

export type MethodLabReentryInvocation = Readonly<{
  contractVersion: typeof METHOD_LAB_REENTRY_CONTRACT_VERSION;
  caseRef: string;
  t0: MethodLabReentryFrozenT0;
  configuration: MethodLabReentryConfiguration;
  configurationHash: string;
  adaptiveCapabilityPolicy: MethodLabReentryConfiguration['adaptiveCapabilityPolicy'];
  epistemicBoundary: 'REENTRY_IS_EXPERIMENTAL_NOT_OBSERVATION';
  authorityCeiling: 'RECOMMEND';
}>;

export type MethodLabReentryExecution = {
  contractVersion: typeof METHOD_LAB_REENTRY_CONTRACT_VERSION;
  experimentId: string;
  runId: string;
  caseRef: string;
  t0Hash: string;
  configuration: MethodLabReentryConfiguration;
  configurationHash: string;
  measurements: MethodLabReentryMeasurements;
  runtimeReceipt: MethodLabReentryRuntimeReceipt;
  epistemicClass: 'SIMULATED' | 'DERIVED';
  limitations: string[];
  lineageRefs: string[];
  startedAt: string;
  finishedAt: string;
  semanticHash: string;
  executionHash: string;
  canonicalMutation: false;
  authorityCeiling: 'RECOMMEND';
  observationBoundary: 'REENTRY_NEVER_INHERITS_OBSERVED';
};

export type MethodLabReentryDimensionDelta = {
  dimension: MethodLabReentryDeltaDimension;
  label: (typeof METHOD_LAB_REENTRY_DELTA_DIMENSIONS)[number]['label'];
  observability: 'COMPARABLE' | 'PARTIAL' | 'NOT_OBSERVABLE';
  changed: boolean | null;
  controlHash: string | null;
  variantHash: string | null;
  numericDelta: number | null;
  attributedTo: MethodLabReentryConfigurationAxis[];
};

export type MethodLabReentryComparison = {
  contractVersion: typeof METHOD_LAB_REENTRY_CONTRACT_VERSION;
  caseRef: string;
  t0Hash: string;
  controlRunId: string;
  variantRunId: string;
  changedAxes: MethodLabReentryConfigurationAxis[];
  attributionMode: 'CONTROLLED_SINGLE_FACTOR' | 'CONFOUNDED_MULTI_FACTOR' | 'UNEXPLAINED_EXECUTION_VARIANCE' | 'NO_CONFIG_OR_OUTPUT_CHANGE';
  candidateCause: MethodLabReentryConfigurationAxis | null;
  causalClaim: 'CONFIGURATION_ATTRIBUTION_ONLY_NOT_CAUSAL_PROOF';
  deltas: Record<MethodLabReentryDeltaDimension, MethodLabReentryDimensionDelta>;
  comparisonHash: string;
};

export type MethodLabReentryExecutionOutput = {
  measurements: MethodLabReentryMeasurements;
  runtimeReceipt: MethodLabReentryRuntimeReceipt;
  epistemicClass: 'SIMULATED' | 'DERIVED';
  limitations: string[];
};

function nonEmpty(value: string, field: string) {
  if (!value.trim()) throw new Error(`METHOD_LAB_REENTRY_${field.toUpperCase()}_REQUIRED`);
}

function uniqueSorted(values: string[], field: string) {
  const normalized = values.map((value) => value.trim()).filter(Boolean).sort();
  if (normalized.length !== values.length || new Set(normalized).size !== normalized.length) {
    throw new Error(`METHOD_LAB_REENTRY_${field.toUpperCase()}_INVALID`);
  }
  return normalized;
}

function sortedDistinct(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('METHOD_LAB_REENTRY_NON_FINITE_NUMBER');
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(input).sort().map((key) => {
      if (input[key] === undefined) throw new Error(`METHOD_LAB_REENTRY_UNDEFINED_VALUE:${key}`);
      return [key, canonicalize(input[key])];
    }));
  }
  throw new Error(`METHOD_LAB_REENTRY_NON_SERIALIZABLE:${typeof value}`);
}

export function hashMethodLabReentryValue(value: unknown) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function frozenClone<T>(value: T): T {
  return deepFreeze(canonicalize(value) as T);
}

function passportRef(configuration: MethodLabReentryConfiguration) {
  return `${configuration.passport.id}@${configuration.passport.version}`;
}

function experimentConfigurationHash(configuration: MethodLabReentryConfiguration) {
  return hashMethodLabReentryValue({
    experimentConfiguration: configuration.experimentConfiguration,
    seed: configuration.seed,
    adaptiveCapabilityPolicy: configuration.adaptiveCapabilityPolicy,
  });
}

export function freezeMethodLabReentryT0(input: {
  transition: CognitiveTwinStateTransition;
  caseRef?: string;
}): MethodLabReentryFrozenT0 {
  const transition = assertCognitiveTwinStateTransition(input.transition);
  const caseRef = (input.caseRef ?? transition.subjectRef).trim();
  nonEmpty(caseRef, 'case_ref');
  for (const evidence of transition.t0.availableEvidence) {
    if (evidence.observedAt && Date.parse(evidence.observedAt) > Date.parse(transition.t0.at)) {
      throw new Error(`METHOD_LAB_REENTRY_T0_FUTURE_EVIDENCE_FORBIDDEN:${evidence.ref}`);
    }
  }
  const sourceLineageRefs = uniqueSorted(transition.lineageRefs, 'source_lineage_refs');
  const core = {
    contractVersion: METHOD_LAB_REENTRY_CONTRACT_VERSION,
    caseRef,
    sourceTransitionRef: transition.transitionId,
    cutoff: transition.t0.at,
    twinT0: transition.t0,
    sourceLineageRefs,
    boundary: 'MODEL_CONTEXT_IS_NOT_TWIN_MEMORY' as const,
  };
  const frozen = frozenClone(core);
  return deepFreeze({ ...frozen, t0Hash: hashMethodLabReentryValue(frozen) });
}

export function normalizeMethodLabReentryConfiguration(
  t0: MethodLabReentryFrozenT0,
  input: MethodLabReentryConfiguration,
): Readonly<MethodLabReentryConfiguration> {
  nonEmpty(input.configurationId, 'configuration_id');
  nonEmpty(input.model.provider, 'model_provider');
  nonEmpty(input.model.model, 'model');
  nonEmpty(input.model.version, 'model_version');
  nonEmpty(input.passport.id, 'passport_id');
  nonEmpty(input.passport.version, 'passport_version');
  nonEmpty(input.twinState.ref, 'twin_state_ref');
  nonEmpty(input.twinState.stateHash, 'twin_state_hash');
  const evidenceSetRefs = uniqueSorted(input.evidenceSetRefs, 'evidence_set_refs');
  const available = new Set(t0.twinT0.availableEvidence.map((item) => item.ref));
  for (const ref of evidenceSetRefs) {
    if (!available.has(ref)) throw new Error(`METHOD_LAB_REENTRY_EVIDENCE_NOT_AVAILABLE_AT_T0:${ref}`);
  }
  return frozenClone({ ...input, evidenceSetRefs });
}

export function prepareMethodLabReentryInvocation(input: {
  t0: MethodLabReentryFrozenT0;
  configuration: MethodLabReentryConfiguration;
}): MethodLabReentryInvocation {
  if (hashMethodLabReentryValue({
    contractVersion: input.t0.contractVersion,
    caseRef: input.t0.caseRef,
    sourceTransitionRef: input.t0.sourceTransitionRef,
    cutoff: input.t0.cutoff,
    twinT0: input.t0.twinT0,
    sourceLineageRefs: input.t0.sourceLineageRefs,
    boundary: input.t0.boundary,
  }) !== input.t0.t0Hash) throw new Error('METHOD_LAB_REENTRY_T0_HASH_MISMATCH');
  const configuration = normalizeMethodLabReentryConfiguration(input.t0, input.configuration);
  const configurationHash = hashMethodLabReentryValue(configuration);
  return deepFreeze({
    contractVersion: METHOD_LAB_REENTRY_CONTRACT_VERSION,
    caseRef: input.t0.caseRef,
    t0: input.t0,
    configuration,
    configurationHash,
    adaptiveCapabilityPolicy: configuration.adaptiveCapabilityPolicy,
    epistemicBoundary: 'REENTRY_IS_EXPERIMENTAL_NOT_OBSERVATION',
    authorityCeiling: 'RECOMMEND',
  });
}

function normalizeMeasurements(measurements: MethodLabReentryMeasurements): MethodLabReentryMeasurements {
  return Object.fromEntries(METHOD_LAB_REENTRY_DELTA_DIMENSIONS.map(({ key }) => {
    const measurement = measurements[key];
    if (!measurement) throw new Error(`METHOD_LAB_REENTRY_MEASUREMENT_REQUIRED:${key}`);
    const basisRefs = uniqueSorted(measurement.basisRefs, `${key}_basis_refs`);
    if (measurement.availability === 'MEASURED' && measurement.value === null) {
      throw new Error(`METHOD_LAB_REENTRY_MEASUREMENT_VALUE_REQUIRED:${key}`);
    }
    if (measurement.availability === 'NOT_AVAILABLE' && measurement.value !== null) {
      throw new Error(`METHOD_LAB_REENTRY_UNAVAILABLE_MEASUREMENT_MUST_BE_NULL:${key}`);
    }
    canonicalize(measurement.value);
    return [key, { ...measurement, basisRefs }];
  })) as MethodLabReentryMeasurements;
}

function normalizeRuntimeReceipt(invocation: MethodLabReentryInvocation, receipt: MethodLabReentryRuntimeReceipt): MethodLabReentryRuntimeReceipt {
  nonEmpty(receipt.trajectoryId, 'trajectory_id');
  nonEmpty(receipt.taskGraphRef, 'task_graph_ref');
  const modelExecutionRefs = uniqueSorted(receipt.modelExecutionRefs, 'model_execution_refs');
  if (modelExecutionRefs.length === 0) throw new Error('METHOD_LAB_REENTRY_MODEL_EXECUTION_RECEIPT_REQUIRED');
  const modelSelectionRefs = uniqueSorted(receipt.modelSelectionRefs, 'model_selection_refs');
  const capabilityDecisionRefs = uniqueSorted(receipt.capabilityDecisionRefs, 'capability_decision_refs');
  const expected = invocation.configuration;
  const resolved = receipt.resolvedConfiguration;
  if (hashMethodLabReentryValue(resolved.model) !== hashMethodLabReentryValue(expected.model)) throw new Error('METHOD_LAB_REENTRY_RUNTIME_MODEL_MISMATCH');
  if (resolved.passportRef !== passportRef(expected)) throw new Error('METHOD_LAB_REENTRY_RUNTIME_PASSPORT_MISMATCH');
  const resolvedEvidence = uniqueSorted(resolved.evidenceSetRefs, 'runtime_evidence_set_refs');
  if (hashMethodLabReentryValue(resolvedEvidence) !== hashMethodLabReentryValue(expected.evidenceSetRefs)) throw new Error('METHOD_LAB_REENTRY_RUNTIME_EVIDENCE_SET_MISMATCH');
  if (hashMethodLabReentryValue(resolved.twinState) !== hashMethodLabReentryValue(expected.twinState)) throw new Error('METHOD_LAB_REENTRY_RUNTIME_TWIN_STATE_MISMATCH');
  if (resolved.experimentConfigurationHash !== experimentConfigurationHash(expected)) throw new Error('METHOD_LAB_REENTRY_RUNTIME_EXPERIMENT_CONFIGURATION_MISMATCH');
  if (expected.adaptiveCapabilityPolicy === 'FORBID' && capabilityDecisionRefs.length > 0) throw new Error('METHOD_LAB_REENTRY_ADAPTIVE_CAPABILITY_FORBIDDEN');
  return {
    ...receipt,
    capabilityDecisionRefs,
    modelSelectionRefs,
    modelExecutionRefs,
    resolvedConfiguration: { ...resolved, evidenceSetRefs: resolvedEvidence },
  };
}

export function recordMethodLabReentryExecution(input: {
  experimentId: string;
  runId: string;
  invocation: MethodLabReentryInvocation;
  output: MethodLabReentryExecutionOutput;
  startedAt: string;
  finishedAt: string;
  lineageRefs?: string[];
}): MethodLabReentryExecution {
  nonEmpty(input.experimentId, 'experiment_id');
  nonEmpty(input.runId, 'run_id');
  if (Number.isNaN(Date.parse(input.startedAt)) || Number.isNaN(Date.parse(input.finishedAt))) throw new Error('METHOD_LAB_REENTRY_EXECUTION_TIME_INVALID');
  if (Date.parse(input.finishedAt) < Date.parse(input.startedAt)) throw new Error('METHOD_LAB_REENTRY_EXECUTION_TIME_INVALID');
  const t0HashBefore = input.invocation.t0.t0Hash;
  const currentT0 = prepareMethodLabReentryInvocation({ t0: input.invocation.t0, configuration: input.invocation.configuration });
  if (currentT0.t0.t0Hash !== t0HashBefore || currentT0.configurationHash !== input.invocation.configurationHash) {
    throw new Error('METHOD_LAB_REENTRY_FROZEN_INPUT_MUTATION_DETECTED');
  }
  const measurements = frozenClone(normalizeMeasurements(input.output.measurements));
  const runtimeReceipt = frozenClone(normalizeRuntimeReceipt(input.invocation, input.output.runtimeReceipt));
  if (input.output.limitations.length === 0 || input.output.limitations.some((item) => !item.trim())) throw new Error('METHOD_LAB_REENTRY_LIMITATIONS_REQUIRED');
  const lineageRefs = sortedDistinct([
    input.invocation.t0.sourceTransitionRef,
    ...input.invocation.t0.sourceLineageRefs,
    runtimeReceipt.taskGraphRef,
    ...runtimeReceipt.capabilityDecisionRefs,
    ...runtimeReceipt.modelSelectionRefs,
    ...runtimeReceipt.modelExecutionRefs,
    ...(input.lineageRefs ?? []),
  ]);
  const semanticCore = {
    caseRef: input.invocation.caseRef,
    t0Hash: input.invocation.t0.t0Hash,
    configurationHash: input.invocation.configurationHash,
    measurements,
    epistemicClass: input.output.epistemicClass,
  };
  const semanticHash = hashMethodLabReentryValue(semanticCore);
  const executionCore = {
    ...semanticCore,
    experimentId: input.experimentId,
    runId: input.runId,
    runtimeReceipt,
    limitations: input.output.limitations,
    lineageRefs,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
  };
  return frozenClone({
    contractVersion: METHOD_LAB_REENTRY_CONTRACT_VERSION,
    experimentId: input.experimentId,
    runId: input.runId,
    caseRef: input.invocation.caseRef,
    t0Hash: input.invocation.t0.t0Hash,
    configuration: input.invocation.configuration,
    configurationHash: input.invocation.configurationHash,
    measurements,
    runtimeReceipt,
    epistemicClass: input.output.epistemicClass,
    limitations: input.output.limitations,
    lineageRefs,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    semanticHash,
    executionHash: hashMethodLabReentryValue(executionCore),
    canonicalMutation: false,
    authorityCeiling: 'RECOMMEND',
    observationBoundary: 'REENTRY_NEVER_INHERITS_OBSERVED',
  });
}

export async function executeMethodLabReentryVariant(input: {
  experimentId: string;
  runId: string;
  t0: MethodLabReentryFrozenT0;
  configuration: MethodLabReentryConfiguration;
  executor: (invocation: MethodLabReentryInvocation) => Promise<MethodLabReentryExecutionOutput>;
  lineageRefs?: string[];
}): Promise<MethodLabReentryExecution> {
  const invocation = prepareMethodLabReentryInvocation({ t0: input.t0, configuration: input.configuration });
  const startedAt = new Date().toISOString();
  const output = await input.executor(invocation);
  const finishedAt = new Date().toISOString();
  return recordMethodLabReentryExecution({
    experimentId: input.experimentId,
    runId: input.runId,
    invocation,
    output,
    startedAt,
    finishedAt,
    lineageRefs: input.lineageRefs,
  });
}

function changedAxes(a: MethodLabReentryConfiguration, b: MethodLabReentryConfiguration): MethodLabReentryConfigurationAxis[] {
  const changed: MethodLabReentryConfigurationAxis[] = [];
  if (hashMethodLabReentryValue(a.model) !== hashMethodLabReentryValue(b.model)) changed.push('MODEL');
  if (hashMethodLabReentryValue(a.passport) !== hashMethodLabReentryValue(b.passport)) changed.push('PASSPORT');
  if (hashMethodLabReentryValue(a.evidenceSetRefs) !== hashMethodLabReentryValue(b.evidenceSetRefs)) changed.push('EVIDENCE_SET');
  if (hashMethodLabReentryValue(a.twinState) !== hashMethodLabReentryValue(b.twinState)) changed.push('TWIN_STATE');
  if (experimentConfigurationHash(a) !== experimentConfigurationHash(b)) changed.push('EXPERIMENT_CONFIGURATION');
  return changed;
}

function measurementDelta(
  dimension: MethodLabReentryDeltaDimension,
  label: MethodLabReentryDimensionDelta['label'],
  control: MethodLabReentryMeasurement,
  variant: MethodLabReentryMeasurement,
  axes: MethodLabReentryConfigurationAxis[],
): MethodLabReentryDimensionDelta {
  const controlMeasured = control.availability === 'MEASURED';
  const variantMeasured = variant.availability === 'MEASURED';
  const observability = controlMeasured && variantMeasured ? 'COMPARABLE' : controlMeasured || variantMeasured ? 'PARTIAL' : 'NOT_OBSERVABLE';
  const controlHash = controlMeasured ? hashMethodLabReentryValue(control.value) : null;
  const variantHash = variantMeasured ? hashMethodLabReentryValue(variant.value) : null;
  const changed = observability === 'COMPARABLE' ? controlHash !== variantHash : null;
  const numericDelta = changed !== null && typeof control.value === 'number' && typeof variant.value === 'number' ? variant.value - control.value : null;
  return {
    dimension,
    label,
    observability,
    changed,
    controlHash,
    variantHash,
    numericDelta,
    attributedTo: changed === true ? axes : [],
  };
}

export function compareMethodLabReentryExecutions(
  control: MethodLabReentryExecution,
  variant: MethodLabReentryExecution,
): MethodLabReentryComparison {
  if (control.caseRef !== variant.caseRef) throw new Error('METHOD_LAB_REENTRY_COMPARISON_CASE_MISMATCH');
  if (control.t0Hash !== variant.t0Hash) throw new Error('METHOD_LAB_REENTRY_COMPARISON_T0_MISMATCH');
  const axes = changedAxes(control.configuration, variant.configuration);
  const deltas = Object.fromEntries(METHOD_LAB_REENTRY_DELTA_DIMENSIONS.map(({ key, label }) => [
    key,
    measurementDelta(key, label, control.measurements[key], variant.measurements[key], axes),
  ])) as Record<MethodLabReentryDeltaDimension, MethodLabReentryDimensionDelta>;
  const anyOutputChange = Object.values(deltas).some((delta) => delta.changed === true || delta.observability === 'PARTIAL');
  const attributionMode = axes.length === 1
    ? 'CONTROLLED_SINGLE_FACTOR'
    : axes.length > 1
      ? 'CONFOUNDED_MULTI_FACTOR'
      : anyOutputChange
        ? 'UNEXPLAINED_EXECUTION_VARIANCE'
        : 'NO_CONFIG_OR_OUTPUT_CHANGE';
  const core = {
    caseRef: control.caseRef,
    t0Hash: control.t0Hash,
    controlSemanticHash: control.semanticHash,
    variantSemanticHash: variant.semanticHash,
    changedAxes: axes,
    attributionMode,
    deltas,
  };
  return frozenClone({
    contractVersion: METHOD_LAB_REENTRY_CONTRACT_VERSION,
    caseRef: control.caseRef,
    t0Hash: control.t0Hash,
    controlRunId: control.runId,
    variantRunId: variant.runId,
    changedAxes: axes,
    attributionMode,
    candidateCause: axes.length === 1 ? axes[0] : null,
    causalClaim: 'CONFIGURATION_ATTRIBUTION_ONLY_NOT_CAUSAL_PROOF',
    deltas,
    comparisonHash: hashMethodLabReentryValue(core),
  });
}

function experimentInputEpistemicClass(value: CognitiveTwinEpistemicClass): MethodLabExperimentPreregistration['INPUTS'][number]['epistemicClass'] {
  return value === 'PREDICTED' ? 'INFERRED' : value;
}

export function buildMethodLabReentryPreregistration(input: {
  experimentId: string;
  t0: MethodLabReentryFrozenT0;
  control: MethodLabReentryConfiguration;
  variants: MethodLabReentryConfiguration[];
  hypothesis: string;
  nullHypothesis?: string | null;
  methodVersion: string;
  systemDescription: string;
  falsificationCondition: string;
  preregisteredAt: string;
  preregisteredBy: string | null;
  returnWindow: { opensAt: string; closesAt: string; required: boolean };
}): MethodLabExperimentPreregistration {
  const control = normalizeMethodLabReentryConfiguration(input.t0, input.control);
  const variants = input.variants.map((variant) => normalizeMethodLabReentryConfiguration(input.t0, variant));
  if (variants.length === 0) throw new Error('METHOD_LAB_REENTRY_VARIANT_REQUIRED');
  const configurationIds = uniqueSorted([control.configurationId, ...variants.map((variant) => variant.configurationId)], 'configuration_ids');
  if (configurationIds.length !== variants.length + 1) throw new Error('METHOD_LAB_REENTRY_CONFIGURATION_IDS_INVALID');
  const frozenInputRefs = uniqueSorted([
    input.t0.sourceTransitionRef,
    ...input.t0.twinT0.availableEvidence.map((item) => item.ref),
  ], 'frozen_input_refs');
  const preregistration: MethodLabExperimentPreregistration = {
    contractVersion: METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
    experimentId: input.experimentId,
    experimentType: 'REENTRY',
    METHOD: {
      methodId: METHOD_LAB_REENTRY_CONTRACT_VERSION,
      version: input.methodVersion,
      description: 'Governed same-case reentry against frozen T0 with explicit cognitive-configuration deltas.',
    },
    HYPOTHESIS: { statement: input.hypothesis, nullStatement: input.nullHypothesis ?? null },
    T0: { cutoff: input.t0.cutoff, timezone: null, frozenInputRefs },
    POPULATION_SYSTEM: { kind: 'SYSTEM', ref: input.t0.caseRef, description: input.systemDescription },
    INPUTS: [
      { ref: input.t0.sourceTransitionRef, role: 'TWIN_STATE', epistemicClass: 'DERIVED' },
      ...input.t0.twinT0.availableEvidence.map((item) => ({ ref: item.ref, role: 'EVIDENCE' as const, epistemicClass: experimentInputEpistemicClass(item.epistemicClass) })),
    ],
    CONTROL: {
      kind: 'CONTROL',
      description: `Frozen control configuration ${control.configurationId}`,
      inputRefs: [input.t0.sourceTransitionRef],
    },
    VARIANTS: variants.map((variant) => ({
      variantId: variant.configurationId,
      description: `Reentry configuration ${variant.configurationId}`,
      changes: { configurationHash: hashMethodLabReentryValue(variant), changedAxesFromControl: changedAxes(control, variant) },
    })),
    EXPECTED_SIGNAL: {
      description: 'Observable cognitive deltas between same-case reentries under controlled configuration changes.',
      measures: METHOD_LAB_REENTRY_DELTA_DIMENSIONS.map((dimension) => dimension.label),
    },
    FALSIFICATION: { condition: input.falsificationCondition, requiredEvidence: [] },
    STOPPING_RULE: { condition: 'Stop after the preregistered control and variants execute once each.', maxExecutions: variants.length + 1 },
    RETURN_WINDOW: input.returnWindow,
    preregisteredAt: input.preregisteredAt,
    preregisteredBy: input.preregisteredBy,
    canonicalMutation: false,
  };
  return assertMethodLabExperimentPreregistration(preregistration);
}

export function buildMethodLabReentryRun(input: {
  preregistration: MethodLabExperimentPreregistration;
  execution: MethodLabReentryExecution;
  comparison?: MethodLabReentryComparison | null;
  codeRef: string;
  createdAt: string;
}): MethodLabExperimentRun {
  if (input.preregistration.experimentType !== 'REENTRY') throw new Error('METHOD_LAB_REENTRY_EXPERIMENT_TYPE_REQUIRED');
  if (input.execution.experimentId !== input.preregistration.experimentId) throw new Error('METHOD_LAB_REENTRY_EXPERIMENT_ID_MISMATCH');
  const preregistrationHash = hashMethodLabReentryValue(input.preregistration);
  const resultPayload = {
    reentryExecution: input.execution,
    comparison: input.comparison ?? null,
    boundaries: METHOD_LAB_REENTRY_BOUNDARIES,
  };
  const resultHash = hashMethodLabReentryValue(resultPayload);
  const evidenceRefs = sortedDistinct(Object.values(input.execution.measurements).flatMap((measurement) => measurement.basisRefs));
  const run: MethodLabExperimentRun = {
    contractVersion: METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
    artifacts: {
      PREREGISTERED: {
        preregistrationRef: `method-lab:prereg:${input.preregistration.experimentId}`,
        preregistrationHash,
      },
      EXECUTED: {
        runId: input.execution.runId,
        experimentId: input.execution.experimentId,
        experimentType: 'REENTRY',
        startedAt: input.execution.startedAt,
        finishedAt: input.execution.finishedAt,
        provider: input.execution.configuration.model.provider,
        model: input.execution.configuration.model.model,
        passportRef: passportRef(input.execution.configuration),
        twinStateRef: input.execution.configuration.twinState.ref,
        seed: input.execution.configuration.seed,
      },
      RESULT: {
        epistemicClass: input.execution.epistemicClass,
        payload: resultPayload,
        evidenceRefs,
        resultHash,
      },
      CONTRAST: {
        status: input.preregistration.RETURN_WINDOW.required ? 'PENDING_RETURN' : 'NOT_APPLICABLE',
        payload: null,
        realityReturn: null,
      },
      LIMITATIONS: sortedDistinct([
        ...input.execution.limitations,
        'REENTRY is an experiment and does not become OBSERVATION or CANON by inheritance.',
        'Single-factor configuration attribution is not by itself causal proof.',
      ]),
      REPRODUCIBILITY_RECEIPT: {
        contractVersion: METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
        codeRef: input.codeRef,
        preregistrationHash,
        inputHash: hashMethodLabReentryValue({ t0Hash: input.execution.t0Hash, configurationHash: input.execution.configurationHash }),
        resultHash,
        executorRefs: sortedDistinct([
          input.execution.runtimeReceipt.taskGraphRef,
          ...input.execution.runtimeReceipt.modelSelectionRefs,
          ...input.execution.runtimeReceipt.modelExecutionRefs,
        ]),
        createdAt: input.createdAt,
      },
    },
    canonicalMutation: false,
    observationBoundary: 'SIMULATION_NEVER_INHERITS_OBSERVED',
  };
  return assertMethodLabExperimentRun(input.preregistration, run);
}
