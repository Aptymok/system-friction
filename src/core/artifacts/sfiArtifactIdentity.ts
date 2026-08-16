export const SFI_ARTIFACT_IDENTITY_CONTRACT = 'SFI-ARTIFACT-IDENTITY-1.0' as const;
export const SFI_MANIFESTATION_CONTRACT = 'SFI-ARTIFACT-MANIFESTATION-1.0' as const;
export const SFI_MOPS_CERTIFICATE_CONTRACT = 'SFI-MOPS-EVIDENCE-CERTIFICATE-1.0' as const;

export type SfiArtifactVisibility = 'PRIVATE' | 'PUBLIC';
export type SfiArtifactCertificateStatus = 'DRAFT' | 'VERIFIED' | 'SUPERSEDED' | 'REVOKED';
export type SfiArtifactScopeType = 'ATTRACTOR' | 'PROJECT' | 'NODE' | 'OBJECT' | 'ARTIFACT';
export type SfiManifestationVerification = 'DECLARED' | 'VERIFIED' | 'UNAVAILABLE' | 'MISMATCH';

export type SfiArtifactIdentityV1 = {
  contract: typeof SFI_ARTIFACT_IDENTITY_CONTRACT;
  artifactId: string;
  ownerId: string;
  tenantId: string | null;
  sourceObjectId: string | null;
  attractorKey: string | null;
  projectKey: string | null;
  nodeKey: string | null;
  objectLabel: string;
  version: string;
  mediaType: string;
  exactHash: { algorithm: string; value: string } | null;
  perceptualFingerprint: { algorithm: string; value: string } | null;
  lineageRootHash: string | null;
  analysisSnapshotHash: string | null;
  mihmSnapshotHash: string | null;
  visibility: SfiArtifactVisibility;
  certificateStatus: SfiArtifactCertificateStatus;
  createdAt: string;
  updatedAt: string;
};

export type SfiArtifactManifestationV1 = {
  contract: typeof SFI_MANIFESTATION_CONTRACT;
  id: string;
  artifactId: string | null;
  ownerId: string;
  tenantId: string | null;
  scopeType: SfiArtifactScopeType;
  scopeKey: string;
  platform: string;
  externalUrl: string;
  platformObjectId: string | null;
  relationType: 'PUBLISHED_AS' | 'ROUTED_BY' | 'SOURCE_REPOSITORY' | 'PUBLIC_SYSTEM_SURFACE' | 'EXTERNAL_CHANNEL' | 'ATLAS_COLLECTION' | 'DERIVATIVE';
  verification: SfiManifestationVerification;
  observedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type SfiMopsEvidenceCertificateV1 = {
  contract: typeof SFI_MOPS_CERTIFICATE_CONTRACT;
  artifact: SfiArtifactIdentityV1;
  manifestations: SfiArtifactManifestationV1[];
  exactIdentityVerified: boolean;
  publicLineage: Array<{ relation: string; ref: string }>;
  issuedAt: string;
};

export function assertStableArtifactId(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!/^SFI:[A-Z0-9:_-]{8,180}$/.test(normalized)) throw new Error('SFI_ARTIFACT_ID_INVALID');
  return normalized;
}

export function artifactIdentityIsPubliclyVerifiable(value: SfiArtifactIdentityV1) {
  return value.visibility === 'PUBLIC' && value.certificateStatus === 'VERIFIED';
}
