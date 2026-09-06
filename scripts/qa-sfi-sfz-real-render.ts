import assert from 'node:assert/strict';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  SFI_ACOUSTIC_INSTRUMENT_PACKAGE_CONTRACT,
  SFI_AUDIO_RENDER_RECEIPT_CONTRACT,
  SFI_SFZ_ADAPTER_ID,
  SFI_SFZ_ADAPTER_VERSION,
  assertRenderReceipt,
  sha256Bytes,
  type SfiAudioPerformance,
  type SfiRenderRightsAssertion,
} from '../src/lib/studio/audio/acoustic/acousticPackageContract';
import { executeSfzAcousticRender } from '../src/lib/studio/audio/acoustic/executeSfzRender';
import { decodePcm24Wav } from '../src/lib/studio/audio/acoustic/wavPcm';

type ExpectedRender = {
  contract: 'SFI-AUDIO-REAL-SFZ-FIXTURE-1.0';
  adapter: string;
  outputSha256: `sha256:${string}`;
  metrics: {
    sampleRate: 48000; bitDepth: 24; channels: 1 | 2; frameCount: number; durationSeconds: number; peak: number; rms: number; renderedEventCount: number;
  };
};

const QA_RIGHTS: SfiRenderRightsAssertion = {
  instrumentRightsStatus: 'EXECUTION_ALLOWED',
  materialRightsEligibility: 'ELIGIBLE',
  materialRightsEvidenceRefs: ['fixture:rights:sfi-generated-qa-tone-v1'],
  institutionalAuthorization: {
    authorizationRef: 'fixture:authorization:ws06-r4a-execute-reversible',
    authorityClass: 'EXECUTE_REVERSIBLE',
    authorized: true,
  },
  culturalReferenceUsedAsExecutableMaterial: false,
  publicAccessUsedAsExecutionRightsEvidence: false,
};

async function pathExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const packageRoot = resolve('fixtures/audio/sfi-acoustic-instrument-package-1.0');
  const performance = JSON.parse(await readFile(resolve(packageRoot, 'performance.json'), 'utf8')) as SfiAudioPerformance;
  const expected = JSON.parse(await readFile(resolve(packageRoot, 'expected-render.json'), 'utf8')) as ExpectedRender;
  const artifactRoot = resolve('build/sfi-audio/ws06-r4a');
  const artifactPath = resolve(artifactRoot, 'real-sfz-render.wav');
  const receiptPath = resolve(artifactRoot, 'real-sfz-render-receipt.json');
  await rm(artifactRoot, { recursive: true, force: true });
  await mkdir(artifactRoot, { recursive: true });

  const receipt = await executeSfzAcousticRender({
    runId: 'ws06-r4a-real-sfz-fixture-v1',
    packageRoot,
    packageRef: 'repo:fixtures/audio/sfi-acoustic-instrument-package-1.0',
    performance,
    performanceRef: 'fixture:performance:ws06-r4a-real-sfz-fixture-v1',
    rightsAssertions: QA_RIGHTS,
    artifactPath,
    artifactRef: 'ci-artifact:ws06-r4a/real-sfz-render.wav',
  });

  assertRenderReceipt(receipt);
  assert.equal(receipt.contract, SFI_AUDIO_RENDER_RECEIPT_CONTRACT);
  assert.equal(receipt.adapter.id, SFI_SFZ_ADAPTER_ID);
  assert.equal(receipt.adapter.version, SFI_SFZ_ADAPTER_VERSION);
  assert.equal(receipt.output.epistemicClass, 'GENERATED_RENDER');
  assert.equal(receipt.rightsAssertions.materialRightsEligibility, 'ELIGIBLE');
  assert.equal(receipt.rightsAssertions.institutionalAuthorization.authorized, true);
  assert.equal(receipt.rightsAssertions.culturalReferenceUsedAsExecutableMaterial, false);
  assert.equal(receipt.rightsAssertions.publicAccessUsedAsExecutionRightsEvidence, false);
  assert.equal(receipt.cleanup.state, 'CLEANED');
  assert.equal(receipt.cleanup.existedBeforeCleanup, true);
  assert.equal(receipt.cleanup.existsAfterCleanup, false);
  assert.equal(receipt.cleanup.error, null);
  assert.equal(receipt.metrics.frameCount, expected.metrics.frameCount);
  assert.equal(receipt.metrics.renderedEventCount, 3);

  const artifact = await readFile(artifactPath);
  const wav = decodePcm24Wav(artifact);
  assert.equal(wav.sampleRate, 48000);
  assert.equal(wav.bitDepth, 24);
  assert.equal(wav.channels, 1);
  assert.equal(wav.frames, expected.metrics.frameCount);
  const actualHash = sha256Bytes(artifact);
  assert.equal(actualHash, receipt.output.sha256);
  assert.equal(actualHash, expected.outputSha256);
  assert.deepEqual(receipt.metrics, expected.metrics);
  assert.equal(expected.adapter, `${SFI_SFZ_ADAPTER_ID}@${SFI_SFZ_ADAPTER_VERSION}`);

  const manifest = JSON.parse(await readFile(resolve(packageRoot, 'manifest.json'), 'utf8')) as { contract: string };
  assert.equal(manifest.contract, SFI_ACOUSTIC_INSTRUMENT_PACKAGE_CONTRACT);

  assert.equal(await pathExists(artifactPath), true);
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    contract: 'SFI-AUDIO-REAL-SFZ-1.0',
    status: 'PASS',
    packageContract: SFI_ACOUSTIC_INSTRUMENT_PACKAGE_CONTRACT,
    adapter: `${SFI_SFZ_ADAPTER_ID}@${SFI_SFZ_ADAPTER_VERSION}`,
    output: { ref: receipt.output.ref, sha256: receipt.output.sha256, bytes: artifact.byteLength },
    metrics: receipt.metrics,
    cleanup: receipt.cleanup,
    rightsBoundary: {
      materialRightsEligibility: receipt.rightsAssertions.materialRightsEligibility,
      institutionalAuthorizationRef: receipt.rightsAssertions.institutionalAuthorization.authorizationRef,
      publicAccessUsedAsExecutionRightsEvidence: false,
      culturalReferenceUsedAsExecutableMaterial: false,
    },
    epistemicClass: receipt.output.epistemicClass,
    receiptPath: 'build/sfi-audio/ws06-r4a/real-sfz-render-receipt.json',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
