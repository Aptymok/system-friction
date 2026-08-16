import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;
function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }

export type SfiManifestationObservationSnapshot = {
  id: string;
  manifestationId: string;
  ownerId: string;
  tenantId: string | null;
  observedAt: string;
  source: string;
  verification: 'OBSERVED' | 'PARTIAL' | 'UNAVAILABLE';
  metrics: Record<string, unknown>;
  contentFingerprint: Record<string, unknown>;
  rawPayloadPersisted: boolean;
  createdAt: string;
};

function fromRow(row: Row): SfiManifestationObservationSnapshot {
  return {
    id: String(row.id),
    manifestationId: String(row.manifestation_id),
    ownerId: String(row.owner_id),
    tenantId: text(row.tenant_id),
    observedAt: String(row.observed_at),
    source: String(row.source),
    verification: String(row.verification) as SfiManifestationObservationSnapshot['verification'],
    metrics: record(row.metrics),
    contentFingerprint: record(row.content_fingerprint),
    rawPayloadPersisted: row.raw_payload_persisted === true,
    createdAt: String(row.created_at),
  };
}

export async function recordManifestationObservation(input: {
  manifestationId: string;
  ownerId: string;
  tenantId?: string | null;
  observedAt: string;
  source: string;
  verification: SfiManifestationObservationSnapshot['verification'];
  metrics?: Record<string, unknown>;
  contentFingerprint?: Record<string, unknown>;
  rawPayloadPersisted?: boolean;
}) {
  const observedAt = new Date(input.observedAt);
  if (Number.isNaN(observedAt.getTime())) throw new Error('SFI_MANIFESTATION_OBSERVED_AT_INVALID');
  const service = createServiceSupabaseClient();
  const manifestation = await service.from('sfi_artifact_manifestations').select('id,owner_id,tenant_id').eq('id', input.manifestationId).maybeSingle();
  if (manifestation.error) throw new Error(`SFI_MANIFESTATION_SNAPSHOT_PARENT_READ_FAILED:${manifestation.error.message}`);
  if (!manifestation.data) throw new Error('SFI_MANIFESTATION_NOT_FOUND');
  if (String(manifestation.data.owner_id) !== input.ownerId) throw new Error('SFI_MANIFESTATION_SNAPSHOT_OWNER_CONFLICT');
  const result = await service.from('sfi_artifact_manifestation_snapshots').upsert({
    manifestation_id: input.manifestationId,
    owner_id: input.ownerId,
    tenant_id: input.tenantId ?? manifestation.data.tenant_id ?? null,
    observed_at: observedAt.toISOString(),
    source: input.source.trim(),
    verification: input.verification,
    metrics: input.metrics ?? {},
    content_fingerprint: input.contentFingerprint ?? {},
    raw_payload_persisted: input.rawPayloadPersisted === true,
  }, { onConflict: 'manifestation_id,observed_at,source' }).select('*').single();
  if (result.error || !result.data) throw new Error(`SFI_MANIFESTATION_SNAPSHOT_WRITE_FAILED:${result.error?.message ?? 'unknown'}`);
  return fromRow(result.data as Row);
}

export async function listManifestationObservations(manifestationId: string, ownerId: string) {
  const service = createServiceSupabaseClient();
  const result = await service.from('sfi_artifact_manifestation_snapshots').select('*').eq('manifestation_id', manifestationId).eq('owner_id', ownerId).order('observed_at', { ascending: true });
  if (result.error) throw new Error(`SFI_MANIFESTATION_SNAPSHOT_READ_FAILED:${result.error.message}`);
  return ((result.data ?? []) as Row[]).map(fromRow);
}
