import 'server-only';

import { randomUUID } from 'node:crypto';
import {
  SFI_ARTIFACT_IDENTITY_CONTRACT,
  SFI_MANIFESTATION_CONTRACT,
  SFI_MOPS_CERTIFICATE_CONTRACT,
  artifactIdentityIsPubliclyVerifiable,
  assertStableArtifactId,
  type SfiArtifactIdentityV1,
  type SfiArtifactManifestationV1,
  type SfiArtifactScopeType,
  type SfiManifestationVerification,
} from '@/core/artifacts/sfiArtifactIdentity';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;
function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }

function identityFromRow(row: Row): SfiArtifactIdentityV1 {
  return {
    contract: SFI_ARTIFACT_IDENTITY_CONTRACT,
    artifactId: String(row.artifact_id),
    ownerId: String(row.owner_id),
    tenantId: text(row.tenant_id),
    sourceObjectId: text(row.source_object_id),
    attractorKey: text(row.attractor_key),
    projectKey: text(row.project_key),
    nodeKey: text(row.node_key),
    objectLabel: String(row.object_label),
    version: String(row.version),
    mediaType: String(row.media_type),
    exactHash: text(row.exact_hash_algorithm) && text(row.exact_hash_value) ? { algorithm: String(row.exact_hash_algorithm), value: String(row.exact_hash_value) } : null,
    perceptualFingerprint: text(row.perceptual_algorithm) && text(row.perceptual_value) ? { algorithm: String(row.perceptual_algorithm), value: String(row.perceptual_value) } : null,
    lineageRootHash: text(row.lineage_root_hash),
    analysisSnapshotHash: text(row.analysis_snapshot_hash),
    mihmSnapshotHash: text(row.mihm_snapshot_hash),
    visibility: String(row.visibility) as SfiArtifactIdentityV1['visibility'],
    certificateStatus: String(row.certificate_status) as SfiArtifactIdentityV1['certificateStatus'],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function manifestationFromRow(row: Row): SfiArtifactManifestationV1 {
  return {
    contract: SFI_MANIFESTATION_CONTRACT,
    id: String(row.id),
    artifactId: text(row.artifact_id),
    ownerId: String(row.owner_id),
    tenantId: text(row.tenant_id),
    scopeType: String(row.scope_type) as SfiArtifactScopeType,
    scopeKey: String(row.scope_key),
    platform: String(row.platform),
    externalUrl: String(row.external_url),
    platformObjectId: text(row.platform_object_id),
    relationType: String(row.relation_type) as SfiArtifactManifestationV1['relationType'],
    verification: String(row.verification) as SfiManifestationVerification,
    observedAt: text(row.observed_at),
    metadata: record(row.metadata),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function upsertArtifactManifestation(input: {
  ownerId: string;
  tenantId?: string | null;
  artifactId?: string | null;
  scopeType: SfiArtifactScopeType;
  scopeKey: string;
  platform: string;
  externalUrl: string;
  platformObjectId?: string | null;
  relationType: SfiArtifactManifestationV1['relationType'];
  verification?: SfiManifestationVerification;
  observedAt?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const url = new URL(input.externalUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('SFI_MANIFESTATION_URL_INVALID');
  const artifactId = input.artifactId ? assertStableArtifactId(input.artifactId) : null;
  const service = createServiceSupabaseClient();
  const result = await service.from('sfi_artifact_manifestations').upsert({
    owner_id: input.ownerId,
    tenant_id: input.tenantId ?? null,
    artifact_id: artifactId,
    scope_type: input.scopeType,
    scope_key: input.scopeKey.trim(),
    platform: input.platform.trim().toLowerCase(),
    external_url: url.toString(),
    platform_object_id: input.platformObjectId?.trim() || null,
    relation_type: input.relationType,
    verification: input.verification ?? 'DECLARED',
    observed_at: input.observedAt ?? null,
    metadata: input.metadata ?? {},
    updated_at: new Date().toISOString(),
  }, { onConflict: 'owner_id,external_url' }).select('*').single();
  if (result.error || !result.data) throw new Error(`SFI_MANIFESTATION_WRITE_FAILED:${result.error?.message ?? 'unknown'}`);
  return manifestationFromRow(result.data as Row);
}

export async function listOwnerManifestations(ownerId: string, scopeKey?: string | null) {
  const service = createServiceSupabaseClient();
  let query = service.from('sfi_artifact_manifestations').select('*').eq('owner_id', ownerId).order('created_at', { ascending: true });
  if (scopeKey?.trim()) query = query.eq('scope_key', scopeKey.trim());
  const result = await query;
  if (result.error) throw new Error(`SFI_MANIFESTATION_READ_FAILED:${result.error.message}`);
  return ((result.data ?? []) as Row[]).map(manifestationFromRow);
}

export async function createArtifactIdentity(input: Omit<SfiArtifactIdentityV1, 'contract' | 'createdAt' | 'updatedAt'>) {
  const artifactId = assertStableArtifactId(input.artifactId);
  const service = createServiceSupabaseClient();
  const existing = await service.from('sfi_artifact_identities').select('*').eq('artifact_id', artifactId).maybeSingle();
  if (existing.error) throw new Error(`SFI_ARTIFACT_IDENTITY_READ_FAILED:${existing.error.message}`);
  if (existing.data) {
    const current = identityFromRow(existing.data as Row);
    if (current.ownerId !== input.ownerId) throw new Error('SFI_ARTIFACT_IDENTITY_OWNER_CONFLICT');
    return current;
  }
  const result = await service.from('sfi_artifact_identities').insert({
    artifact_id: artifactId,
    owner_id: input.ownerId,
    tenant_id: input.tenantId,
    source_object_id: input.sourceObjectId,
    attractor_key: input.attractorKey,
    project_key: input.projectKey,
    node_key: input.nodeKey,
    object_label: input.objectLabel,
    version: input.version,
    media_type: input.mediaType,
    exact_hash_algorithm: input.exactHash?.algorithm ?? null,
    exact_hash_value: input.exactHash?.value ?? null,
    perceptual_algorithm: input.perceptualFingerprint?.algorithm ?? null,
    perceptual_value: input.perceptualFingerprint?.value ?? null,
    lineage_root_hash: input.lineageRootHash,
    analysis_snapshot_hash: input.analysisSnapshotHash,
    mihm_snapshot_hash: input.mihmSnapshotHash,
    visibility: input.visibility,
    certificate_status: input.certificateStatus,
  }).select('*').single();
  if (result.error || !result.data) throw new Error(`SFI_ARTIFACT_IDENTITY_WRITE_FAILED:${result.error?.message ?? 'unknown'}`);
  return identityFromRow(result.data as Row);
}

export async function readPublicMopsCertificate(artifactIdInput: string) {
  const artifactId = assertStableArtifactId(artifactIdInput);
  const service = createServiceSupabaseClient();
  const artifactResult = await service.from('sfi_artifact_identities').select('*').eq('artifact_id', artifactId).maybeSingle();
  if (artifactResult.error) throw new Error(`SFI_ARTIFACT_PUBLIC_READ_FAILED:${artifactResult.error.message}`);
  if (!artifactResult.data) return null;
  const artifact = identityFromRow(artifactResult.data as Row);
  if (!artifactIdentityIsPubliclyVerifiable(artifact)) return null;
  const manifestationResult = await service.from('sfi_artifact_manifestations').select('*').eq('artifact_id', artifactId).order('created_at', { ascending: true });
  if (manifestationResult.error) throw new Error(`SFI_MANIFESTATION_PUBLIC_READ_FAILED:${manifestationResult.error.message}`);
  const manifestations = ((manifestationResult.data ?? []) as Row[]).map(manifestationFromRow);
  return {
    contract: SFI_MOPS_CERTIFICATE_CONTRACT,
    artifact,
    manifestations,
    exactIdentityVerified: Boolean(artifact.exactHash),
    publicLineage: [
      ...(artifact.attractorKey ? [{ relation: 'ATTRACTOR', ref: artifact.attractorKey }] : []),
      ...(artifact.projectKey ? [{ relation: 'PROJECT', ref: artifact.projectKey }] : []),
      ...(artifact.nodeKey ? [{ relation: 'NODE', ref: artifact.nodeKey }] : []),
      ...(artifact.sourceObjectId ? [{ relation: 'SOURCE_OBJECT', ref: artifact.sourceObjectId }] : []),
    ],
    issuedAt: new Date().toISOString(),
  };
}

export function mintArtifactId(input: { projectKey?: string | null; nodeKey?: string | null; mediaType: string; version: string }) {
  const project = (input.projectKey ?? 'SFI').replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase() || 'SFI';
  const node = (input.nodeKey ?? 'OBJECT').replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase() || 'OBJECT';
  const media = input.mediaType.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase() || 'ARTIFACT';
  const version = input.version.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase() || '1';
  return assertStableArtifactId(`SFI:MOPS:${project}:${node}:${media}:${version}:${randomUUID().slice(0, 8).toUpperCase()}`);
}
