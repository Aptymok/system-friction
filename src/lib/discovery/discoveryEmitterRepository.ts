import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { discoveryEmissionReceipt } from './discoveryEmitter';

export async function persistDiscoveryEmissionReceipt(objectKey: string, actorId: string) {
  const receipt = discoveryEmissionReceipt(objectKey);
  const service = createServiceSupabaseClient();

  const existing = await service
    .from('sfi_external_representations')
    .select('id,created_at')
    .eq('canonical_object_key', receipt.objectKey)
    .eq('representation_kind', 'DISCOVERY_EMISSION')
    .eq('state', 'READY')
    .eq('content_hash', receipt.contentHash)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing.error) throw new Error(`SFI_DISCOVERY_EMISSION_READ_FAILED:${existing.error.message}`);
  if (existing.data?.id) {
    return { receipt, representationId: String(existing.data.id), replay: true };
  }

  const inserted = await service.from('sfi_external_representations').insert({
    canonical_object_key: receipt.objectKey,
    representation_kind: 'DISCOVERY_EMISSION',
    state: 'READY',
    external_url: null,
    content_hash: receipt.contentHash,
    receipt,
    lineage: receipt.lineage,
    observed_at: null,
    created_by: actorId,
  }).select('id').single();
  if (inserted.error || !inserted.data?.id) throw new Error(`SFI_DISCOVERY_EMISSION_PERSIST_FAILED:${inserted.error?.message ?? 'unknown'}`);

  return { receipt, representationId: String(inserted.data.id), replay: false };
}
