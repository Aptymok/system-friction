import assert from 'node:assert/strict';
import test from 'node:test';
import type { SfiAudioRenderReceipt } from './acoustic/acousticPackageContract';
import {
  SFI_AUDIO_CAPABILITIES,
  SFI_AUDIO_RESULT_RECEIPT_CONTRACT,
  SFI_GOVERNED_AUDIO_CLOSED_LOOP_CONTRACT,
  createAudioResultReceipt,
  evaluateAudioCandidate,
  planLocalizedAudioRerender,
  type SfiAudioObservation,
  type SfiAudioStemState,
} from './closedLoop';

function renderReceipt(runId: string, hashChar: string, performanceRef: string, instrumentRef: string): SfiAudioRenderReceipt {
  const hash = `sha256:${hashChar.repeat(64)}` as `sha256:${string}`;
  return {
    contract: 'SFI-AUDIO-RENDER-RECEIPT-1.0',
    runId,
    packageRef: 'fixture:package',
    packageHash: hash,
    packageVersion: '1.0.0',
    manifestHash: hash,
    instrumentRef,
    mappingRef: 'fixture:package#instrument.sfz',
    mappingHash: hash,
    sampleRefs: [{ ref: 'fixture:package#samples/a.wav', sha256: hash }],
    performanceRef,
    performanceHash: hash,
    performanceVersion: '1.0.0',
    adapter: { id: 'SFI-SFZ-ADAPTER', version: '1.0.0' },
    output: { ref: `artifact:${runId}`, sha256: hash, epistemicClass: 'GENERATED_RENDER' },
    renderParameters: {
      sampleRate: 48000,
      bitDepth: 24,
      resampler: 'LINEAR',
      overflowPolicy: 'HARD_CLIP_SAFETY_ONLY',
      supportedSfzOpcodes: ['sample'],
    },
    metrics: {
      sampleRate: 48000,
      bitDepth: 24,
      channels: 1,
      frameCount: 48000,
      durationSeconds: 1,
      peak: 0.5,
      rms: 0.1,
      renderedEventCount: 1,
    },
    rightsAssertions: {
      instrumentRightsStatus: 'EXECUTION_ALLOWED',
      materialRightsEligibility: 'ELIGIBLE',
      materialRightsEvidenceRefs: ['fixture:rights'],
      institutionalAuthorization: { authorizationRef: 'fixture:auth', authorityClass: 'EXECUTE_REVERSIBLE', authorized: true },
      culturalReferenceUsedAsExecutableMaterial: false,
      publicAccessUsedAsExecutionRightsEvidence: false,
    },
    lineage: {
      sourceReferenceId: 'fixture:source',
      parentPackageRef: null,
      packageMaterializationRefs: ['fixture:materialization'],
      performanceSourceRefs: ['fixture:score'],
    },
    startedAt: '2026-09-07T14:00:00.000Z',
    finishedAt: '2026-09-07T14:00:01.000Z',
    cleanup: {
      state: 'CLEANED',
      workspaceRefHash: hash,
      existedBeforeCleanup: true,
      existsAfterCleanup: false,
      cleanedAt: '2026-09-07T14:00:01.000Z',
      error: null,
    },
  };
}

const sourceObservation: SfiAudioObservation = {
  observationId: 'obs:source',
  epistemicClass: 'OBSERVATION',
  observedAt: '2026-09-07T14:00:00.000Z',
  sourceRef: 'source:voice',
  metrics: { fad: 0.44, wsv: 0.52, mihm: 0.38 },
  limitations: [],
};
const renderedObservation: SfiAudioObservation = {
  observationId: 'obs:render:1',
  epistemicClass: 'OBSERVATION',
  observedAt: '2026-09-07T14:02:00.000Z',
  sourceRef: 'artifact:mix:1',
  metrics: { fad: 0.61, wsv: 0.7, mihm: 0.42, cvf: 0.72 },
  limitations: [],
};
const finalObservation: SfiAudioObservation = {
  observationId: 'obs:render:2',
  epistemicClass: 'OBSERVATION',
  observedAt: '2026-09-07T14:04:00.000Z',
  sourceRef: 'artifact:mix:2',
  metrics: { fad: 0.61, wsv: 0.7, mihm: 0.68, cvf: 0.72 },
  limitations: [],
};

const initialMelody = renderReceipt('run:melody:1', 'a', 'performance:melody:1', 'instrument:melody');
const initialRhythm = renderReceipt('run:rhythm:1', 'b', 'performance:rhythm:1', 'instrument:rhythm');
const rerenderedMelody = renderReceipt('run:melody:2', 'c', 'performance:melody:2', 'instrument:melody');

const initialStems: SfiAudioStemState[] = [
  {
    stemId: 'stem:melody', role: 'MELODY', performanceRef: initialMelody.performanceRef,
    instrumentRef: initialMelody.instrumentRef, renderReceipt: initialMelody, metricOwnership: ['mihm', 'cvf'],
  },
  {
    stemId: 'stem:rhythm', role: 'RHYTHM', performanceRef: initialRhythm.performanceRef,
    instrumentRef: initialRhythm.instrumentRef, renderReceipt: initialRhythm, metricOwnership: ['fad', 'wsv'],
  },
];

const target = {
  targetId: 'target:cultural:1',
  evidenceRefs: ['evidence:reference:1'],
  metrics: { fad: { min: 0.55 }, wsv: { min: 0.65 }, mihm: { min: 0.6 }, cvf: { min: 0.65 } },
};

test('closed-loop contracts and governed capabilities are explicit', () => {
  assert.equal(SFI_GOVERNED_AUDIO_CLOSED_LOOP_CONTRACT, 'SFI-GOVERNED-AUDIO-CLOSED-LOOP-1.0');
  assert.equal(SFI_AUDIO_RESULT_RECEIPT_CONTRACT, 'SFI-AUDIO-RESULT-RECEIPT-1.0');
  assert.equal(SFI_AUDIO_CAPABILITIES.length, 11);
  assert.ok(SFI_AUDIO_CAPABILITIES.includes('audio_candidate_evaluator'));
  assert.ok(SFI_AUDIO_CAPABILITIES.includes('audio_renderer'));
});

test('candidate evaluation localizes failure to the owning stem', () => {
  const evaluation = evaluateAudioCandidate(target, renderedObservation, initialStems);
  assert.equal(evaluation.state, 'FAIL');
  assert.deepEqual(evaluation.failures.map((failure) => failure.metric), ['mihm']);
  const plan = planLocalizedAudioRerender(initialStems, evaluation);
  assert.deepEqual(plan.rerenderStemIds, ['stem:melody']);
  assert.deepEqual(plan.preservedStemReceipts.map((item) => item.stemId), ['stem:rhythm']);
});

test('localized rerender preserves unaffected material and emits RETURN_PASS only after observation', () => {
  const finalStems: SfiAudioStemState[] = [
    {
      ...initialStems[0],
      performanceRef: rerenderedMelody.performanceRef,
      renderReceipt: rerenderedMelody,
    },
    initialStems[1],
  ];
  const receipt = createAudioResultReceipt({
    resultId: 'audio:return:1',
    sourceRef: 'source:voice',
    scoreRef: 'score:1',
    target,
    sourceObservation,
    renderedObservation,
    finalObservation,
    initialStems,
    finalStems,
    rerenderReceipts: [rerenderedMelody],
  });
  assert.equal(receipt.state, 'RETURN_PASS');
  assert.equal(receipt.evaluationBefore.state, 'FAIL');
  assert.equal(receipt.evaluationAfter.state, 'PASS');
  assert.deepEqual(receipt.localizedRerender.rerenderStemIds, ['stem:melody']);
  assert.equal(receipt.unaffectedStemPreservationVerified, true);
  assert.equal(receipt.generatedOutputRemainsNonObservation, true);
  assert.deepEqual(receipt.rerenderRunIds, ['run:melody:2']);
});

test('generated render cannot be substituted for external observation', () => {
  assert.throws(() => evaluateAudioCandidate(target, {
    ...renderedObservation,
    epistemicClass: 'GENERATED_RENDER',
  } as unknown as SfiAudioObservation, initialStems), /SFI_AUDIO_EXTERNAL_OBSERVATION_REQUIRED/);
});

test('changing an unaffected stem fails closed', () => {
  const changedRhythm = renderReceipt('run:rhythm:2', 'd', 'performance:rhythm:2', 'instrument:rhythm');
  assert.throws(() => createAudioResultReceipt({
    resultId: 'audio:return:bad',
    sourceRef: 'source:voice',
    scoreRef: 'score:1',
    target,
    sourceObservation,
    renderedObservation,
    finalObservation,
    initialStems,
    finalStems: [
      { ...initialStems[0], performanceRef: rerenderedMelody.performanceRef, renderReceipt: rerenderedMelody },
      { ...initialStems[1], performanceRef: changedRhythm.performanceRef, renderReceipt: changedRhythm },
    ],
    rerenderReceipts: [rerenderedMelody],
  }), /SFI_AUDIO_UNAFFECTED_STEM_CHANGED/);
});
