import assert from 'node:assert/strict';
import test from 'node:test';
import type { SfiAudioRenderReceipt } from './acoustic/acousticPackageContract';
import {
  SFI_AUDIO_CAPABILITIES,
  SFI_AUDIO_RESULT_RECEIPT_CONTRACT,
  SFI_GOVERNED_AUDIO_CLOSED_LOOP_CONTRACT,
  evaluateAudioCandidate,
  planLocalizedAudioRerender,
  type SfiAudioEvaluation,
  type SfiAudioObservation,
  type SfiAudioStemState,
} from './closedLoop';

function renderReceipt(runId: string, hashChar: string): SfiAudioRenderReceipt {
  const hash = `sha256:${hashChar.repeat(64)}` as `sha256:${string}`;
  return {
    contract: 'SFI-AUDIO-RENDER-RECEIPT-1.0', runId, packageRef: 'fixture:package', packageHash: hash, packageVersion: '1.0.0', manifestHash: hash,
    instrumentRef: 'instrument:fixture', mappingRef: 'fixture:package#instrument.sfz', mappingHash: hash,
    sampleRefs: [{ ref: 'fixture:sample', sha256: hash }], performanceRef: `performance:${runId}`, performanceHash: hash, performanceVersion: '1.0.0',
    adapter: { id: 'SFI-SFZ-ADAPTER', version: '1.0.0' }, output: { ref: `artifact:${runId}`, sha256: hash, epistemicClass: 'GENERATED_RENDER' },
    renderParameters: { sampleRate: 48000, bitDepth: 24, resampler: 'LINEAR', overflowPolicy: 'HARD_CLIP_SAFETY_ONLY', supportedSfzOpcodes: ['sample'] },
    metrics: { sampleRate: 48000, bitDepth: 24, channels: 1, frameCount: 48000, durationSeconds: 1, peak: 0.5, rms: 0.1, renderedEventCount: 1 },
    rightsAssertions: { instrumentRightsStatus: 'EXECUTION_ALLOWED', materialRightsEligibility: 'ELIGIBLE', materialRightsEvidenceRefs: ['fixture:rights'], institutionalAuthorization: { authorizationRef: 'fixture:auth', authorityClass: 'EXECUTE_REVERSIBLE', authorized: true }, culturalReferenceUsedAsExecutableMaterial: false, publicAccessUsedAsExecutionRightsEvidence: false },
    lineage: { sourceReferenceId: 'fixture:source', parentPackageRef: null, packageMaterializationRefs: ['fixture:materialization'], performanceSourceRefs: ['fixture:score'] },
    startedAt: '2026-09-07T14:00:00.000Z', finishedAt: '2026-09-07T14:00:01.000Z',
    cleanup: { state: 'CLEANED', workspaceRefHash: hash, existedBeforeCleanup: true, existsAfterCleanup: false, cleanedAt: '2026-09-07T14:00:01.000Z', error: null },
  };
}

const stem: SfiAudioStemState = {
  stemId: 'stem:fixture', role: 'MELODY', performanceRef: 'performance:fixture', instrumentRef: 'instrument:fixture', renderReceipt: renderReceipt('run:fixture', 'a'), metricOwnership: ['fad', 'mihm'],
};

function observation(metrics: SfiAudioObservation['metrics'], metricEvidence: SfiAudioObservation['metricEvidence'] = {}): SfiAudioObservation {
  return { observationId: 'obs:fixture', epistemicClass: 'OBSERVATION', observedAt: '2026-09-07T14:02:00.000Z', sourceRef: 'artifact:fixture', metrics, metricEvidence, limitations: [] };
}

test('closed-loop contracts require canonical receipt verification', () => {
  assert.equal(SFI_GOVERNED_AUDIO_CLOSED_LOOP_CONTRACT, 'SFI-GOVERNED-AUDIO-CLOSED-LOOP-1.2');
  assert.equal(SFI_AUDIO_RESULT_RECEIPT_CONTRACT, 'SFI-AUDIO-RESULT-RECEIPT-1.2');
  assert.equal(SFI_AUDIO_CAPABILITIES.length, 11);
});

test('missing measurement fails without scheduling a rerender', async () => {
  const result = await evaluateAudioCandidate({ targetId: 'target:1', evidenceRefs: ['issue:404'], metrics: { mihm: { methodRef: 'MIHM:F_s', min: 0.5 } } }, observation({}), [stem]);
  assert.equal(result.state, 'FAIL');
  assert.deepEqual(result.failures[0]?.reason, 'MISSING_OBSERVATION');
  assert.deepEqual(result.failures[0]?.affectedStemIds, []);
  assert.deepEqual(planLocalizedAudioRerender([stem], result).rerenderStemIds, []);
});

test('caller-authored FAD metadata cannot authenticate a metric', async () => {
  const result = await evaluateAudioCandidate({ targetId: 'target:fad', evidenceRefs: ['issue:404'], metrics: { fad: { methodRef: 'FAD:identity_invariant', min: 0.2 } } }, observation({ fad: 0.9 }, {
    fad: { owner: 'FAD', epistemicClass: 'DERIVED', methodRef: 'FAD:identity_invariant', sourceRef: 'caller:x', receiptRef: 'caller:x', evidenceRefs: ['caller:x'] },
  }), [stem]);
  assert.equal(result.state, 'FAIL');
  assert.equal(result.failures[0]?.reason, 'UNVERIFIED_MEASUREMENT');
  assert.deepEqual(result.failures[0]?.affectedStemIds, []);
});

test('wrong owner cannot authenticate another metric and provenance failure never rerenders', async () => {
  const result = await evaluateAudioCandidate({ targetId: 'target:cvf', evidenceRefs: ['issue:404'], metrics: { cvf: { methodRef: 'SCOREFRICTION:cvphi', min: 0.2 } } }, observation({ cvf: 0.9 }, {
    cvf: { owner: 'MIHM', epistemicClass: 'DERIVED', methodRef: 'SCOREFRICTION:cvphi', sourceRef: 'caller:x', receiptRef: 'caller:x', evidenceRefs: ['caller:x'] },
  }), [stem]);
  assert.equal(result.failures[0]?.reason, 'UNVERIFIED_MEASUREMENT');
  assert.deepEqual(result.failures[0]?.affectedStemIds, []);
  assert.deepEqual(planLocalizedAudioRerender([stem], result).rerenderStemIds, []);
});

test('method identity is mandatory and prevents ambiguous MIHM-family comparison', async () => {
  await assert.rejects(() => evaluateAudioCandidate({ targetId: 'target:bad', evidenceRefs: [], metrics: { mihm: { methodRef: '', min: 0.2 } } }, observation({ mihm: 0.5 }), [stem]), /SFI_AUDIO_TARGET_METHOD_REF_REQUIRED:mihm/);
});

test('localized rerender planner changes only stems attached to an authenticated acoustic failure', () => {
  const verifiedFailure: SfiAudioEvaluation = {
    targetId: 'target:verified', observationId: 'obs:verified', state: 'FAIL',
    failures: [{ metric: 'mihm', observed: 0.3, target: { methodRef: 'MIHM:F_s', min: 0.5 }, reason: 'BELOW_TARGET', affectedStemIds: ['stem:fixture'] }],
  };
  const plan = planLocalizedAudioRerender([stem], verifiedFailure);
  assert.deepEqual(plan.rerenderStemIds, ['stem:fixture']);
});

test('world-context mismatch is not assigned to an audio stem', () => {
  const contextFailure: SfiAudioEvaluation = {
    targetId: 'target:wsv', observationId: 'obs:wsv', state: 'FAIL',
    failures: [{ metric: 'wsv', observed: 0.2, target: { methodRef: 'WORLDSPECT:wsi', min: 0.5 }, reason: 'BELOW_TARGET', affectedStemIds: [] }],
  };
  assert.deepEqual(planLocalizedAudioRerender([stem], contextFailure).rerenderStemIds, []);
});
