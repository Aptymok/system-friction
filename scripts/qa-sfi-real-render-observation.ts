import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  assertRenderReceipt,
  type SfiAudioRenderReceipt,
} from '../src/lib/studio/audio/acoustic/acousticPackageContract';
import {
  evaluateAudioCandidate,
  type SfiAudioCulturalTarget,
  type SfiAudioStemState,
} from '../src/lib/studio/audio/closedLoop';
import {
  SFI_AUDIO_WAV_OBSERVATION_CONTRACT,
  observeRenderedWavBytes,
} from '../src/lib/studio/audio/closedLoopObservation';

async function main() {
  const artifactRoot = resolve('build/sfi-audio/ws06-r4a');
  const artifactPath = resolve(artifactRoot, 'real-sfz-render.wav');
  const receiptPath = resolve(artifactRoot, 'real-sfz-render-receipt.json');
  const observationPath = resolve(artifactRoot, 'real-sfz-render-observation.json');

  const [wavBytes, receiptText] = await Promise.all([
    readFile(artifactPath),
    readFile(receiptPath, 'utf8'),
  ]);
  const receipt = JSON.parse(receiptText) as SfiAudioRenderReceipt;
  assertRenderReceipt(receipt);

  const observation = observeRenderedWavBytes({
    observationId: `observation:${receipt.runId}:rendered-wav`,
    sourceRef: receipt.output.ref,
    wavBytes,
    observedAt: receipt.finishedAt,
  });

  assert.equal(observation.contract, SFI_AUDIO_WAV_OBSERVATION_CONTRACT);
  assert.equal(observation.epistemicClass, 'OBSERVATION');
  assert.equal(observation.sourceEpistemicClass, 'GENERATED_RENDER');
  assert.equal(observation.sourceSha256, receipt.output.sha256);
  assert.equal(observation.culturalEvidenceEligible, false);
  assert.equal(observation.acoustic.probe.sampleRate, 48000);
  assert.equal(observation.acoustic.probe.bitsPerSample, 24);
  assert.equal(observation.acoustic.probe.channels, 1);
  assert.ok(observation.acoustic.featureCount > 0, 'real render must produce measured acoustic features');
  assert.deepEqual(observation.metrics, {});
  assert.deepEqual(observation.metricStates, {
    fad: 'NOT_OBSERVED',
    wsv: 'NOT_OBSERVED',
    mihm: 'NOT_OBSERVED',
    cvf: 'NOT_OBSERVED',
  });

  const target: SfiAudioCulturalTarget = {
    targetId: 'ws06:qa:measurement-plane-required',
    evidenceRefs: ['issue:404'],
    metrics: {
      fad: { min: 0 },
      wsv: { min: 0 },
      mihm: { min: 0 },
      cvf: { min: 0 },
    },
  };
  const stem: SfiAudioStemState = {
    stemId: 'stem:ws06-real-sfz-fixture',
    role: 'QA_ACOUSTIC_FIXTURE',
    performanceRef: receipt.performanceRef,
    instrumentRef: receipt.instrumentRef,
    renderReceipt: receipt,
    metricOwnership: ['fad', 'wsv', 'mihm', 'cvf'],
  };
  const evaluation = evaluateAudioCandidate(target, observation, [stem]);
  assert.equal(evaluation.state, 'FAIL');
  assert.deepEqual(
    evaluation.failures.map((failure) => [failure.metric, failure.reason]),
    [
      ['fad', 'MISSING_OBSERVATION'],
      ['wsv', 'MISSING_OBSERVATION'],
      ['mihm', 'MISSING_OBSERVATION'],
      ['cvf', 'MISSING_OBSERVATION'],
    ],
  );

  const evidence = {
    contract: 'SFI-AUDIO-REAL-REOBSERVATION-QA-1.0',
    status: 'PASS',
    render: {
      runId: receipt.runId,
      outputRef: receipt.output.ref,
      outputSha256: receipt.output.sha256,
      epistemicClass: receipt.output.epistemicClass,
    },
    observation,
    governedMetricEvaluation: evaluation,
    conclusion: 'REAL_WAV_REOBSERVED; GOVERNED_FAD_WSV_MIHM_CVF_PLANE_REMAINS_MISSING_AND_FAILS_CLOSED',
  };

  await writeFile(observationPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    contract: evidence.contract,
    status: evidence.status,
    observationId: observation.observationId,
    acousticFeatureCount: observation.acoustic.featureCount,
    sourceSha256: observation.sourceSha256,
    metricStates: observation.metricStates,
    evaluationState: evaluation.state,
    observationPath: 'build/sfi-audio/ws06-r4a/real-sfz-render-observation.json',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
