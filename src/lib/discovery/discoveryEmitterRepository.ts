import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { discoveryEmissionReceipt } from './discoveryEmitter';

type DurableRepresentation = {
  id: string;
  state: string;
  created_at: string;
};

async function findDurableRepresentation(
  service: ReturnType<typeof createServiceSupabaseClient>,
  objectKey: string,
  contentHash: string,
): Promise<DurableRepresentation | null> {
  const existing = await service
    .from('sfi_external_representations')
    .select('id,state,created_at')
    .eq('canonical_object_key', objectKey)
    .eq('representation_kind', 'DISCOVERY_EMISSION')
    .eq('content_hash', contentHash)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing.error) throw new Error(`SFI_DISCOVERY_EMISSION_READ_FAILED:${existing.error.message}`);
  if (!existing.data?.id) return null;
  return {
    id: String(existing.data.id),
    state: String(existing.data.state),
    created_at: String(existing.data.created_at),
  };
}

export async function persistDiscoveryEmissionReceipt(objectKey: string, actorId: string) {
  const receipt = discoveryEmissionReceipt(objectKey);
  const service = createServiceSupabaseClient();

  const existing = await findDurableRepresentation(service, receipt.objectKey, receipt.contentHash);
  if (existing) {
    return {
      receipt,
      representationId: existing.id,
      durableState: existing.state,
      replay: true,
    };
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
  }).select('id,state,created_at').single();

  if (inserted.error) {
    if (inserted.error.code === '23505') {
      const concurrent = await findDurableRepresentation(service, receipt.objectKey, receipt.contentHash);
      if (concurrent) {
        return {
          receipt,
          representationId: concurrent.id,
          durableState: concurrent.state,
          replay: true,
        };
      }
    }
    throw new Error(`SFI_DISCOVERY_EMISSION_PERSIST_FAILED:${inserted.error.message}`);
  }
  if (!inserted.data?.id) throw new Error('SFI_DISCOVERY_EMISSION_PERSIST_FAILED:missing_inserted_id');

  return {
    receipt,
    representationId: String(inserted.data.id),
    durableState: String(inserted.data.state ?? 'READY'),
    replay: false,
  };
}
