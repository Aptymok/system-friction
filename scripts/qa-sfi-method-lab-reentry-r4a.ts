import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  METHOD_LAB_REENTRY_BOUNDARIES,
  METHOD_LAB_REENTRY_CONTRACT_VERSION,
  METHOD_LAB_REENTRY_DELTA_DIMENSIONS,
  buildMethodLabReentryPreregistration,
  buildMethodLabReentryRun,
  compareMethodLabReentryExecutions,
  freezeMethodLabReentryT0,
  hashMethodLabReentryValue,
  prepareMethodLabReentryInvocation,
  recordMethodLabReentryExecution,
  type MethodLabReentryConfiguration,
  type MethodLabReentryMeasurements,
} from '../src/lib/method-lab/reentryEngine';
import type { CognitiveTwinStateTransition } from '../src/core/cognitive-twin/stateContract';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const engine = read('src/lib/method-lab/reentryEngine.ts');
const persistence = read('src/lib/method-lab/reentryPersistence.ts');
const experimentPersistence = read('src/lib/method-lab/experimentPersistence.ts');
const statePersistence = read('src/core/cognitive-twin/statePersistence.ts');
const adaptiveRuntime = read('src/lib/sfi/cognitive-runtime/adaptiveTaskGraphRuntime.ts');
const verifyWorkflow = read('.github/workflows/sfi-verify.yml');

assert.equal(METHOD_LAB_REENTRY_CONTRACT_VERSION, 'SFI-METHOD-LAB-REENTRY-1.0');
for (const boundary of [
  'MODEL CONTEXT != TWIN MEMORY',
  'SIMULATION != OBSERVATION',
  'REENTRY != OBSERVATION',
  'RESULT != CANON',
  'ACCEPTED LEARNING != CANON',
]) {
  assert.ok(METHOD_LAB_REENTRY_BOUNDARIES.includes(boundary as (typeof METHOD_LAB_REENTRY_BOUNDARIES)[number]), `reentry_boundary_missing:${boundary}`);
  assert.ok(engine.includes(boundary), `reentry_source_boundary_missing:${boundary}`);
}
assert.deepEqual(
  METHOD_LAB_REENTRY_DELTA_DIMENSIONS.map((dimension) => dimension.label),
  ['Δattention', 'Δevidence_selection', 'Δhypothesis_generation', 'Δcontradiction_detection', 'Δuncertainty', 'Δdecision', 'Δintervention', 'Δprediction', 'Δoutcome'],
);
for (const axis of ['MODEL', 'PASSPORT', 'EVIDENCE_SET', 'TWIN_STATE', 'EXPERIMENT_CONFIGURATION']) {
  assert.ok(engine.includes(`'${axis}'`), `reentry_configuration_axis_missing:${axis}`);
}
assert.match(engine, /executeMethodLabReentryVariant/);
assert.match(engine, /trajectoryId[\s\S]*taskGraphRef[\s\S]*capabilityDecisionRefs[\s\S]*modelSelectionRefs[\s\S]*modelExecutionRefs/);
assert.match(adaptiveRuntime, /taskGraphFromContext/);
assert.match(adaptiveRuntime, /contextWithTaskGraph/);
assert.match(persistence, /persistMethodLabExperimentPreregistration/);
assert.match(persistence, /persistMethodLabExperimentRun/);
assert.match(persistence, /METHOD_LAB_REENTRY_CANNOT_PERSIST_OBSERVED_RESULT/);
assert.doesNotMatch(persistence, /createServiceSupabaseClient|\.from\(/, 'Reentry persistence must reuse Method Lab persistence rather than create a second store.');
assert.match(experimentPersistence, /\.from\('sfi_lab_analyses'\)/);
assert.doesNotMatch(experimentPersistence, /\.update\(|\.upsert\(|\.delete\(/, 'Method Lab preregistration/run history must remain insert-only in this contract.');
assert.match(statePersistence, /emitEpistemicEvent/);
assert.match(statePersistence, /cognitive_twin\.state\.transition_recorded/);
assert.match(verifyWorkflow, /qa-sfi-cognitive-twin-reentry\.ts/);

const transition: CognitiveTwinStateTransition = {
  contractVersion: 'SFI-COGNITIVE-TWIN-STATE-1.0',
  transitionId: 'qa-r4a-transition-1',
  subjectRef: 'case:qa-r4a',
  t0: {
    at: '2026-09-01T12:00:00.000Z',
    state: { mode: 'baseline', confidence: 0.4 },
    availableEvidence: [
      { ref: 'evidence:t0:a', epistemicClass: 'OBSERVED', observedAt: '2026-09-01T10:00:00.000Z' },
      { ref: 'evidence:t0:b', epistemicClass: 'DECLARED', observedAt: null },
    ],
    attentionConfiguration: { focus: ['evidence:t0:a'] },
    decision: { action: 'WAIT' },
    prediction: { expected: 'signal-a' },
    worldVector: { institutional: 0.5 },
    methodConfiguration: { method: 'qa-r4a' },
  },
  t1: {
    at: '2026-09-05T12:00:00.000Z',
    outcome: { futureInformation: 'must-not-enter-reentry-t0' },
    outcomeEvidenceRefs: ['evidence:t1:outcome'],
    error: null,
    contradiction: null,
    deltaCognition: { learnedLater: true },
    state: { mode: 'later-state' },
  },
  lineageRefs: ['event:twin:prior'],
  createdAt: '2026-09-05T12:01:00.000Z',
  boundary: 'MODEL_CONTEXT_IS_NOT_TWIN_MEMORY',
};

const t0 = freezeMethodLabReentryT0({ transition });
const t0Again = freezeMethodLabReentryT0({ transition });
assert.equal(t0.t0Hash, t0Again.t0Hash, 'frozen T0 must hash reproducibly');
assert.equal((t0 as unknown as Record<string, unknown>).t1, undefined, 'reentry T0 must not expose T1');
assert.equal(t0.cutoff, transition.t0.at);
assert.equal(t0.sourceTransitionRef, transition.transitionId);
assert.deepEqual(t0.sourceLineageRefs, transition.lineageRefs);
assert.ok(Object.isFrozen(t0) && Object.isFrozen(t0.twinT0) && Object.isFrozen(t0.twinT0.state), 'T0 must be deeply frozen');
assert.throws(() => freezeMethodLabReentryT0({
  transition: {
    ...transition,
    transitionId: 'qa-r4a-future-evidence',
    t0: {
      ...transition.t0,
      availableEvidence: [{ ref: 'evidence:future', epistemicClass: 'OBSERVED', observedAt: '2026-09-02T12:00:00.000Z' }],
    },
  },
}), /METHOD_LAB_REENTRY_T0_FUTURE_EVIDENCE_FORBIDDEN/);

const controlConfiguration: MethodLabReentryConfiguration = {
  configurationId: 'config:control',
  model: { provider: 'provider-a', model: 'model-a', version: '2026-09-01' },
  passport: { id: 'passport:qa', version: '1.0' },
  evidenceSetRefs: ['evidence:t0:a'],
  twinState: { ref: 'twin-state:baseline', stateHash: 'twin-state-hash-a' },
  experimentConfiguration: { temperature: 0, promptPolicy: 'bounded' },
  seed: 17,
  adaptiveCapabilityPolicy: 'ALLOW_GOVERNED',
};

function measurements(value: number): MethodLabReentryMeasurements {
  return Object.fromEntries(METHOD_LAB_REENTRY_DELTA_DIMENSIONS.map(({ key }, index) => [
    key,
    { availability: 'MEASURED', value: value + index, basisRefs: ['evidence:t0:a'] },
  ])) as MethodLabReentryMeasurements;
}

function executionFor(configuration: MethodLabReentryConfiguration, value: number, runId: string) {
  const invocation = prepareMethodLabReentryInvocation({ t0, configuration });
  assert.ok(Object.isFrozen(invocation) && Object.isFrozen(invocation.t0) && Object.isFrozen(invocation.configuration), 'runtime invocation must remain frozen');
  const experimentConfigurationHash = hashMethodLabReentryValue({
    experimentConfiguration: configuration.experimentConfiguration,
    seed: configuration.seed,
    adaptiveCapabilityPolicy: configuration.adaptiveCapabilityPolicy,
  });
  return recordMethodLabReentryExecution({
    experimentId: 'experiment:qa-r4a',
    runId,
    invocation,
    startedAt: '2026-09-06T12:00:00.000Z',
    finishedAt: '2026-09-06T12:01:00.000Z',
    lineageRefs: ['event:method-lab:qa'],
    output: {
      measurements: measurements(value),
      epistemicClass: 'DERIVED',
      limitations: ['QA fixture demonstrates contract mechanics, not a claim about real-world causality.'],
      runtimeReceipt: {
        trajectoryId: `trajectory:${runId}`,
        taskGraphRef: `task-graph:${runId}`,
        capabilityDecisionRefs: [`capability-decision:${runId}`],
        modelSelectionRefs: [`model-selection:${runId}`],
        modelExecutionRefs: [`model-execution:${runId}`],
        resolvedConfiguration: {
          model: configuration.model,
          passportRef: `${configuration.passport.id}@${configuration.passport.version}`,
          evidenceSetRefs: configuration.evidenceSetRefs,
          twinState: configuration.twinState,
          experimentConfigurationHash,
        },
      },
    },
  });
}

const control = executionFor(controlConfiguration, 10, 'run:control');
const reproducibleControl = executionFor(controlConfiguration, 10, 'run:control-repeat');
assert.equal(control.t0Hash, t0.t0Hash);
assert.equal(control.semanticHash, reproducibleControl.semanticHash, 'same case + same T0 + same configuration + same measured result must be reproducible independently of run receipts');
assert.notEqual(control.executionHash, reproducibleControl.executionHash, 'distinct execution receipts must retain distinct execution lineage');
assert.equal(control.epistemicClass, 'DERIVED');
assert.equal(control.canonicalMutation, false);
assert.equal(control.authorityCeiling, 'RECOMMEND');
assert.equal(control.observationBoundary, 'REENTRY_NEVER_INHERITS_OBSERVED');
for (const ref of [transition.transitionId, 'event:twin:prior', 'event:method-lab:qa', 'task-graph:run:control', 'capability-decision:run:control', 'model-selection:run:control', 'model-execution:run:control']) {
  assert.ok(control.lineageRefs.includes(ref), `reentry_lineage_missing:${ref}`);
}

const singleAxisVariants: Array<[string, MethodLabReentryConfiguration]> = [
  ['MODEL', { ...controlConfiguration, configurationId: 'config:model', model: { ...controlConfiguration.model, model: 'model-b' } }],
  ['PASSPORT', { ...controlConfiguration, configurationId: 'config:passport', passport: { id: 'passport:qa-alt', version: '2.0' } }],
  ['EVIDENCE_SET', { ...controlConfiguration, configurationId: 'config:evidence', evidenceSetRefs: ['evidence:t0:a', 'evidence:t0:b'] }],
  ['TWIN_STATE', { ...controlConfiguration, configurationId: 'config:twin', twinState: { ref: 'twin-state:alternate', stateHash: 'twin-state-hash-b' } }],
  ['EXPERIMENT_CONFIGURATION', { ...controlConfiguration, configurationId: 'config:experiment', experimentConfiguration: { temperature: 0.2, promptPolicy: 'bounded' } }],
];

for (const [axis, configuration] of singleAxisVariants) {
  const variant = executionFor(configuration, 20, `run:${axis.toLowerCase()}`);
  const comparison = compareMethodLabReentryExecutions(control, variant);
  assert.deepEqual(comparison.changedAxes, [axis]);
  assert.equal(comparison.attributionMode, 'CONTROLLED_SINGLE_FACTOR');
  assert.equal(comparison.candidateCause, axis);
  assert.equal(comparison.causalClaim, 'CONFIGURATION_ATTRIBUTION_ONLY_NOT_CAUSAL_PROOF');
  for (const { key, label } of METHOD_LAB_REENTRY_DELTA_DIMENSIONS) {
    assert.equal(comparison.deltas[key].label, label);
    assert.equal(comparison.deltas[key].observability, 'COMPARABLE');
    assert.equal(comparison.deltas[key].changed, true);
    assert.deepEqual(comparison.deltas[key].attributedTo, [axis]);
  }
}

const confounded = compareMethodLabReentryExecutions(control, executionFor({
  ...controlConfiguration,
  configurationId: 'config:confounded',
  model: { ...controlConfiguration.model, model: 'model-c' },
  passport: { id: 'passport:confounded', version: '3.0' },
}, 30, 'run:confounded'));
assert.deepEqual(confounded.changedAxes, ['MODEL', 'PASSPORT']);
assert.equal(confounded.attributionMode, 'CONFOUNDED_MULTI_FACTOR');
assert.equal(confounded.candidateCause, null);

const unexplained = compareMethodLabReentryExecutions(control, executionFor(controlConfiguration, 11, 'run:unexplained'));
assert.deepEqual(unexplained.changedAxes, []);
assert.equal(unexplained.attributionMode, 'UNEXPLAINED_EXECUTION_VARIANCE');
const unchanged = compareMethodLabReentryExecutions(control, reproducibleControl);
assert.equal(unchanged.attributionMode, 'NO_CONFIG_OR_OUTPUT_CHANGE');

const secondT0 = freezeMethodLabReentryT0({
  transition: {
    ...transition,
    transitionId: 'qa-r4a-transition-2',
    t0: { ...transition.t0, at: '2026-09-01T13:00:00.000Z' },
  },
});
const secondInvocation = prepareMethodLabReentryInvocation({ t0: secondT0, configuration: controlConfiguration });
const secondExecution = recordMethodLabReentryExecution({
  experimentId: 'experiment:qa-r4a',
  runId: 'run:second-t0',
  invocation: secondInvocation,
  startedAt: '2026-09-06T12:00:00.000Z',
  finishedAt: '2026-09-06T12:01:00.000Z',
  output: {
    measurements: measurements(10),
    epistemicClass: 'DERIVED',
    limitations: ['QA'],
    runtimeReceipt: {
      trajectoryId: 'trajectory:second-t0',
      taskGraphRef: 'task-graph:second-t0',
      capabilityDecisionRefs: ['capability-decision:second-t0'],
      modelSelectionRefs: ['model-selection:second-t0'],
      modelExecutionRefs: ['model-execution:second-t0'],
      resolvedConfiguration: {
        model: controlConfiguration.model,
        passportRef: `${controlConfiguration.passport.id}@${controlConfiguration.passport.version}`,
        evidenceSetRefs: controlConfiguration.evidenceSetRefs,
        twinState: controlConfiguration.twinState,
        experimentConfigurationHash: hashMethodLabReentryValue({
          experimentConfiguration: controlConfiguration.experimentConfiguration,
          seed: controlConfiguration.seed,
          adaptiveCapabilityPolicy: controlConfiguration.adaptiveCapabilityPolicy,
        }),
      },
    },
  },
});
assert.throws(() => compareMethodLabReentryExecutions(control, secondExecution), /METHOD_LAB_REENTRY_COMPARISON_T0_MISMATCH/);

const preregistration = buildMethodLabReentryPreregistration({
  experimentId: 'experiment:qa-r4a',
  t0,
  control: controlConfiguration,
  variants: singleAxisVariants.map(([, configuration]) => configuration),
  hypothesis: 'Controlled cognitive configuration changes produce measurable same-case reentry deltas.',
  nullHypothesis: 'The controlled configuration changes produce no measurable reentry deltas.',
  methodVersion: '1.0',
  systemDescription: 'QA same-case cognitive reentry subject',
  falsificationCondition: 'No preregistered dimension differs under a controlled variant.',
  preregisteredAt: '2026-09-05T12:00:00.000Z',
  preregisteredBy: 'SFI-02-QA',
  returnWindow: { opensAt: '2026-09-06T00:00:00.000Z', closesAt: '2026-10-06T00:00:00.000Z', required: false },
});
assert.equal(preregistration.experimentType, 'REENTRY');
assert.equal(preregistration.T0.cutoff, t0.cutoff);
assert.ok(preregistration.T0.frozenInputRefs.includes(t0.sourceTransitionRef));
assert.deepEqual(preregistration.EXPECTED_SIGNAL.measures, METHOD_LAB_REENTRY_DELTA_DIMENSIONS.map((dimension) => dimension.label));
assert.equal(preregistration.canonicalMutation, false);

const modelComparison = compareMethodLabReentryExecutions(control, executionFor(singleAxisVariants[0][1], 20, 'run:model-for-method-lab'));
const run = buildMethodLabReentryRun({
  preregistration,
  execution: control,
  comparison: modelComparison,
  codeRef: 'HEAD:src/lib/method-lab/reentryEngine.ts',
  createdAt: '2026-09-06T12:02:00.000Z',
});
assert.equal(run.artifacts.EXECUTED.experimentType, 'REENTRY');
assert.notEqual(run.artifacts.RESULT.epistemicClass, 'OBSERVED');
assert.equal(run.artifacts.CONTRAST.status, 'NOT_APPLICABLE');
assert.equal(run.artifacts.CONTRAST.realityReturn, null);
assert.equal(run.canonicalMutation, false);
assert.equal(run.observationBoundary, 'SIMULATION_NEVER_INHERITS_OBSERVED');
assert.match(JSON.stringify(run.artifacts.RESULT.payload), /REENTRY != OBSERVATION/);
assert.match(JSON.stringify(run.artifacts.RESULT.payload), /RESULT != CANON/);

console.log('SFI R4-A WS-02 Reentry Engine QA: PASS');
console.log('- frozen T0 is reproducible, deeply immutable and excludes T1');
console.log('- same-case semantic reentry is reproducible while execution receipts retain distinct lineage');
console.log('- all nine delta dimensions are measured when observable');
console.log('- model/passport/evidence/Twin/experiment configuration are distinguished as controlled axes without overclaiming causal proof');
console.log('- REENTRY remains non-observational, non-canonical and authority-bounded to RECOMMEND');
console.log('- persistence reuses sfi_lab_analyses + existing Twin/epistemic lineage owners; no second store or event universe');
