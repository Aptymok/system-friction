import { copyFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  SFI_AUDIO_RENDER_RECEIPT_CONTRACT,
  SFI_SFZ_ADAPTER_ID,
  SFI_SFZ_ADAPTER_VERSION,
  assertRenderReceipt,
  assertRenderRightsBoundary,
  canonicalJson,
  hashPerformance,
  sha256Bytes,
  sha256Text,
  type SfiAudioPerformance,
  type SfiAudioRenderReceipt,
  type SfiRenderRightsAssertion,
} from './acousticPackageContract';
import { cleanupEphemeralAudioWorkspace, createEphemeralAudioWorkspace } from './ephemeralWorkspace';
import { SFI_SFZ_SUPPORTED_OPCODES, SfiSfzAdapter, loadAndVerifyAcousticPackage } from './sfzAdapter';

export type SfiExecuteSfzRenderInput = {
  runId?: string;
  packageRoot: string;
  packageRef: string;
  performance: SfiAudioPerformance;
  performanceRef: string;
  rightsAssertions: SfiRenderRightsAssertion;
  artifactPath: string;
  artifactRef: string;
  workspaceBaseDirectory?: string;
};

export async function executeSfzAcousticRender(input: SfiExecuteSfzRenderInput): Promise<SfiAudioRenderReceipt> {
  const startedAt = new Date().toISOString();
  const workspace = await createEphemeralAudioWorkspace(input.workspaceBaseDirectory);
  let receipt: SfiAudioRenderReceipt | null = null;
  let thrown: unknown = null;

  try {
    await cp(input.packageRoot, workspace.packageRoot, { recursive: true, force: true, errorOnExist: false });
    await mkdir(workspace.renderRoot, { recursive: true });
    const loaded = await loadAndVerifyAcousticPackage(workspace.packageRoot);
    assertRenderRightsBoundary(loaded.manifest, input.rightsAssertions);

    const adapter = new SfiSfzAdapter();
    const render = await adapter.render(workspace.packageRoot, loaded.manifest, loaded.mappingText, input.performance);
    const workspaceOutput = join(workspace.renderRoot, 'render.wav');
    await writeFile(workspaceOutput, render.wav);

    await mkdir(dirname(input.artifactPath), { recursive: true });
    await copyFile(workspaceOutput, input.artifactPath);
    const durableArtifactBytes = await readFile(input.artifactPath);
    const outputHash = sha256Bytes(durableArtifactBytes);
    if (outputHash !== sha256Bytes(render.wav)) throw new Error('SFI_AUDIO_RENDER_ARTIFACT_COPY_HASH_MISMATCH');

    const performanceHash = hashPerformance(input.performance);
    const runId = input.runId ?? sha256Text(
      canonicalJson({
        packageHash: loaded.manifest.packageHash,
        performanceHash,
        adapter: `${SFI_SFZ_ADAPTER_ID}@${SFI_SFZ_ADAPTER_VERSION}`,
        authorizationRef: input.rightsAssertions.institutionalAuthorization.authorizationRef,
      }),
    ).slice('sha256:'.length, 'sha256:'.length + 32);

    receipt = {
      contract: SFI_AUDIO_RENDER_RECEIPT_CONTRACT,
      runId,
      packageRef: input.packageRef,
      packageHash: loaded.manifest.packageHash,
      packageVersion: loaded.manifest.packageVersion,
      manifestHash: loaded.manifestHash,
      instrumentRef: loaded.manifest.instrument.instrumentRef,
      mappingRef: `${input.packageRef}#${loaded.manifest.mapping.path}`,
      mappingHash: loaded.manifest.mapping.sha256,
      sampleRefs: loaded.manifest.samples.map((sample) => ({ ref: `${input.packageRef}#${sample.path}`, sha256: sample.sha256 })),
      performanceRef: input.performanceRef,
      performanceHash,
      performanceVersion: input.performance.performanceVersion,
      adapter: { id: SFI_SFZ_ADAPTER_ID, version: SFI_SFZ_ADAPTER_VERSION },
      output: {
        ref: input.artifactRef,
        sha256: outputHash,
        epistemicClass: 'GENERATED_RENDER',
      },
      renderParameters: {
        sampleRate: 48000,
        bitDepth: 24,
        resampler: 'LINEAR',
        overflowPolicy: 'HARD_CLIP_SAFETY_ONLY',
        supportedSfzOpcodes: [...SFI_SFZ_SUPPORTED_OPCODES],
      },
      metrics: render.metrics,
      rightsAssertions: input.rightsAssertions,
      lineage: {
        sourceReferenceId: loaded.manifest.lineage.sourceReferenceId,
        parentPackageRef: loaded.manifest.lineage.parentPackageRef,
        packageMaterializationRefs: [...loaded.manifest.lineage.materializationRefs],
        performanceSourceRefs: [...new Set(input.performance.events.map((event) => event.provenance.sourceRef))],
      },
      startedAt,
      finishedAt: new Date().toISOString(),
      cleanup: {
        state: 'FAILED',
        workspaceRefHash: workspace.workspaceRefHash,
        existedBeforeCleanup: true,
        existsAfterCleanup: true,
        cleanedAt: startedAt,
        error: 'SFI_AUDIO_CLEANUP_PENDING',
      },
    };
  } catch (cause) {
    thrown = cause;
  }

  const cleanup = await cleanupEphemeralAudioWorkspace(workspace);
  if (receipt) receipt.cleanup = cleanup;
  if (thrown) throw thrown;
  if (!receipt) throw new Error('SFI_AUDIO_RENDER_RECEIPT_MISSING');
  return assertRenderReceipt(receipt);
}
