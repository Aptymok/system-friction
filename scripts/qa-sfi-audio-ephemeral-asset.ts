import assert from 'node:assert/strict';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {
  SFI_AUDIO_EPHEMERAL_ASSET_CONTRACT,
  assertRenderReceipt,
  type SfiAudioRenderReceipt,
} from '../src/lib/studio/audio/acoustic/acousticPackageContract';
import {
  cleanupEphemeralAudioWorkspace,
  createEphemeralAudioWorkspace,
} from '../src/lib/studio/audio/acoustic/ephemeralWorkspace';

const migrationPath = 'supabase/migrations/20260906221500_create_sfi_audio_render_runs.sql';
const persistencePath = 'src/lib/studio/audio/acoustic/renderPersistence.ts';
const executionPath = 'src/lib/studio/audio/acoustic/executeSfzRender.ts';
const contractPath = 'src/lib/studio/audio/acoustic/acousticPackageContract.ts';
const workflowPath = '.github/workflows/sfi-audio-material-execution.yml';

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const [migration, persistence, execution, contract, workflow] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile(persistencePath, 'utf8'),
    readFile(executionPath, 'utf8'),
    readFile(contractPath, 'utf8'),
    readFile(workflowPath, 'utf8'),
  ]);

  assert.ok(contract.includes("SFI_AUDIO_EPHEMERAL_ASSET_CONTRACT = 'SFI-AUDIO-EPHEMERAL-ASSET-1.0'"));
  assert.equal(SFI_AUDIO_EPHEMERAL_ASSET_CONTRACT, 'SFI-AUDIO-EPHEMERAL-ASSET-1.0');

  for (const token of [
    'create table if not exists public.sfi_audio_render_runs',
    'instrument_id uuid not null references public.sfi_instruments(id) on delete restrict',
    'source_reference_id uuid references public.sfi_cultural_references(id) on delete restrict',
    'package_version text not null',
    'performance_version text not null',
    'render_parameters jsonb not null',
    "output_epistemic_class = 'GENERATED_RENDER'",
    "cleanup_state in ('CLEANED', 'FAILED')",
    'alter table public.sfi_audio_render_runs enable row level security',
    'alter table public.sfi_audio_render_runs force row level security',
    'grant select on public.sfi_audio_render_runs to authenticated',
    'SFI_AUDIO_RENDER_RECEIPT_IMMUTABLE',
  ]) assert.ok(migration.includes(token), `ephemeral_receipt_migration_missing:${token}`);

  assert.equal(/\bbytea\b/i.test(migration), false, 'raw_audio_bytea_forbidden');
  assert.equal(/\bstorage\./i.test(migration), false, 'new_storage_owner_forbidden');
  assert.equal(/\b(audio|sample|media)_?bytes\b/i.test(migration), false, 'raw_audio_bytes_column_forbidden');
  assert.equal(/grant\s+(?:select\s*,\s*)?(insert|update|delete)/i.test(migration), false, 'authenticated_receipt_dml_forbidden');

  for (const token of [
    "import 'server-only'",
    'requireFounder',
    'assertNoRawAudioPersistence(receipt)',
    "from('sfi_audio_render_runs')",
    'institutional_authorization_ref',
    'output_epistemic_class',
  ]) assert.ok(persistence.includes(token), `receipt_persistence_boundary_missing:${token}`);

  for (const token of [
    'createEphemeralAudioWorkspace',
    'cleanupEphemeralAudioWorkspace',
    "epistemicClass: 'GENERATED_RENDER'",
    'institutionalAuthorization.authorizationRef',
    'copyFile(workspaceOutput, input.artifactPath)',
  ]) assert.ok(execution.includes(token), `ephemeral_execution_boundary_missing:${token}`);

  assert.ok(workflow.includes('SFI-AUDIO-EPHEMERAL-ASSET-1.0'), 'sfi_verify_ephemeral_gate_missing');
  assert.ok(workflow.includes('qa-sfi-audio-ephemeral-asset.ts'), 'sfi_verify_ephemeral_script_missing');
  assert.ok(workflow.includes('qa-sfi-sfz-real-render.ts'), 'sfi_verify_real_render_script_missing');
  assert.ok(workflow.includes('sfi-audio-real-sfz-render'), 'real_render_artifact_upload_missing');

  const base = resolve(tmpdir(), 'sfi-ws06-ephemeral-qa');
  await mkdir(base, { recursive: true });
  const workspace = await createEphemeralAudioWorkspace(base);
  await mkdir(workspace.renderRoot, { recursive: true });
  const sentinel = join(workspace.renderRoot, 'sentinel.txt');
  await writeFile(sentinel, 'ephemeral-only\n', 'utf8');
  assert.equal(await exists(workspace.root), true);
  const cleanup = await cleanupEphemeralAudioWorkspace(workspace);
  assert.equal(cleanup.state, 'CLEANED');
  assert.equal(cleanup.existedBeforeCleanup, true);
  assert.equal(cleanup.existsAfterCleanup, false);
  assert.equal(cleanup.error, null);
  assert.equal(await exists(workspace.root), false);

  const receiptShape = {
    contract: 'SFI-AUDIO-RENDER-RECEIPT-1.0',
    runId: 'qa-failed-cleanup-shape',
    packageRef: 'fixture:package',
    packageHash: `sha256:${'1'.repeat(64)}`,
    packageVersion: '1.0.0',
    manifestHash: `sha256:${'2'.repeat(64)}`,
    instrumentRef: '00000000-0000-4000-8000-000000000601',
    mappingRef: 'fixture:mapping',
    mappingHash: `sha256:${'3'.repeat(64)}`,
    sampleRefs: [{ ref: 'fixture:sample', sha256: `sha256:${'4'.repeat(64)}` }],
    performanceRef: 'fixture:performance',
    performanceHash: `sha256:${'5'.repeat(64)}`,
    performanceVersion: '1.0.0',
    adapter: { id: 'SFI-SFZ-ADAPTER', version: '1.0.0' },
    output: { ref: 'fixture:output', sha256: `sha256:${'6'.repeat(64)}`, epistemicClass: 'GENERATED_RENDER' },
    renderParameters: { sampleRate: 48000, bitDepth: 24, resampler: 'LINEAR', overflowPolicy: 'HARD_CLIP_SAFETY_ONLY', supportedSfzOpcodes: ['sample'] },
    metrics: { sampleRate: 48000, bitDepth: 24, channels: 1, frameCount: 1, durationSeconds: 1 / 48000, peak: 0, rms: 0, renderedEventCount: 1 },
    rightsAssertions: {
      instrumentRightsStatus: 'EXECUTION_ALLOWED',
      materialRightsEligibility: 'ELIGIBLE',
      materialRightsEvidenceRefs: ['fixture:rights'],
      institutionalAuthorization: { authorizationRef: 'fixture:authorization', authorityClass: 'EXECUTE_REVERSIBLE', authorized: true },
      culturalReferenceUsedAsExecutableMaterial: false,
      publicAccessUsedAsExecutionRightsEvidence: false,
    },
    lineage: { sourceReferenceId: null, parentPackageRef: null, packageMaterializationRefs: [], performanceSourceRefs: ['fixture:source'] },
    startedAt: '2026-09-06T00:00:00.000Z',
    finishedAt: '2026-09-06T00:00:01.000Z',
    cleanup: {
      state: 'FAILED',
      workspaceRefHash: `sha256:${'7'.repeat(64)}`,
      existedBeforeCleanup: true,
      existsAfterCleanup: true,
      cleanedAt: '2026-09-06T00:00:01.100Z',
      error: 'fixture-cleanup-failure',
    },
  } as SfiAudioRenderReceipt;
  assert.equal(assertRenderReceipt(receiptShape).cleanup.state, 'FAILED');

  console.log(JSON.stringify({
    contract: SFI_AUDIO_EPHEMERAL_ASSET_CONTRACT,
    status: 'PASS',
    durableOwner: 'public.sfi_audio_render_runs',
    durableRawAudioBytes: false,
    artifactWorkspace: 'EPHEMERAL',
    cleanup,
    failedCleanupRepresentable: true,
    outputEpistemicClass: 'GENERATED_RENDER',
    rightsEligibilityIsInstitutionalAuthorization: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
