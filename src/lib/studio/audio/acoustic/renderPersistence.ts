import 'server-only';
import { requireFounder } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { assertNoRawAudioPersistence } from '../materialRegistryContract';
import { assertRenderReceipt, type SfiAudioRenderReceipt } from './acousticPackageContract';

async function writeSfiAudioRenderReceipt(receipt: SfiAudioRenderReceipt, ownerId: string) {
  assertRenderReceipt(receipt);
  assertNoRawAudioPersistence(receipt);
  if (!ownerId.trim()) throw new Error('SFI_AUDIO_RENDER_RECEIPT_OWNER_REQUIRED');
  const db = createServiceSupabaseClient();

  const { data, error } = await db
    .from('sfi_audio_render_runs')
    .insert({
      owner_id: ownerId,
      run_id: receipt.runId,
      receipt_contract: receipt.contract,
      instrument_id: receipt.instrumentRef,
      source_reference_id: receipt.lineage.sourceReferenceId,
      package_ref: receipt.packageRef,
      package_hash: receipt.packageHash,
      package_version: receipt.packageVersion,
      manifest_hash: receipt.manifestHash,
      mapping_ref: receipt.mappingRef,
      mapping_hash: receipt.mappingHash,
      sample_refs: receipt.sampleRefs,
      performance_ref: receipt.performanceRef,
      performance_hash: receipt.performanceHash,
      performance_version: receipt.performanceVersion,
      adapter_id: receipt.adapter.id,
      adapter_version: receipt.adapter.version,
      output_ref: receipt.output.ref,
      output_hash: receipt.output.sha256,
      output_epistemic_class: receipt.output.epistemicClass,
      render_parameters: receipt.renderParameters,
      metrics: receipt.metrics,
      rights_assertions: receipt.rightsAssertions,
      institutional_authorization_ref: receipt.rightsAssertions.institutionalAuthorization.authorizationRef,
      lineage: receipt.lineage,
      cleanup_state: receipt.cleanup.state,
      cleanup_workspace_ref_hash: receipt.cleanup.workspaceRefHash,
      cleanup_existed_before: receipt.cleanup.existedBeforeCleanup,
      cleanup_exists_after: receipt.cleanup.existsAfterCleanup,
      cleanup_error: receipt.cleanup.error,
      cleanup_at: receipt.cleanup.cleanedAt,
      started_at: receipt.startedAt,
      finished_at: receipt.finishedAt,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(`SFI_AUDIO_RENDER_RECEIPT_WRITE_FAILED:${error?.message ?? 'no_row_returned'}`);
  return data as Record<string, unknown>;
}

export async function persistSfiAudioRenderReceiptForOwner(receipt: SfiAudioRenderReceipt, ownerId: string) {
  return writeSfiAudioRenderReceipt(receipt, ownerId);
}

export async function persistSfiAudioRenderReceipt(receipt: SfiAudioRenderReceipt) {
  const founder = await requireFounder();
  return writeSfiAudioRenderReceipt(receipt, founder.user.id);
}
