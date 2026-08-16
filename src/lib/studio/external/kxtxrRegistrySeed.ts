import type { SfiArtifactManifestationV1, SfiArtifactScopeType } from '@/core/artifacts/sfiArtifactIdentity';

export const KXTXR_ATTRACTOR_STATEMENT = 'NUEVO VECTOR CULTURAL QUE DEFINE NUEVAS GENERACIONES DE INTERACCIÓN ENTRE FRECUENCIAS DE DIFERENTES DIMENSIONES' as const;
export const KXTXR_GRAPHIC_ATLAS = {
  project: 'KXTXR',
  collection: 'GRAPHIC_ATLAS',
  objectPolicy: 'EACH_IMAGE_IS_FIRST_CLASS_OBJECT',
  relationPolicy: 'IMAGE_OBJECTS_MAY_HAVE_MULTIPLE_EXTERNAL_MANIFESTATIONS',
} as const;

export type KxtxrExternalSeed = {
  key: string;
  scopeType: SfiArtifactScopeType;
  scopeKey: string;
  platform: string;
  externalUrl: string;
  relationType: SfiArtifactManifestationV1['relationType'];
  objectResolution: 'PROJECT' | 'PENDING_OBJECT_MATCH';
  metadata: Record<string, unknown>;
};

export const KXTXR_EXTERNAL_SEED: readonly KxtxrExternalSeed[] = [
  {
    key: 'kxtxr-public-system-surface',
    scopeType: 'PROJECT',
    scopeKey: 'KXTXR',
    platform: 'web',
    externalUrl: 'https://kxtxr.vercel.app/',
    relationType: 'PUBLIC_SYSTEM_SURFACE',
    objectResolution: 'PROJECT',
    metadata: { project: 'KXTXR', evidenceRole: 'PUBLIC_SYSTEM_SURFACE' },
  },
  {
    key: 'kxtxr-source-repository',
    scopeType: 'PROJECT',
    scopeKey: 'KXTXR',
    platform: 'github',
    externalUrl: 'https://github.com/Aptymok/kxtxr',
    relationType: 'SOURCE_REPOSITORY',
    objectResolution: 'PROJECT',
    metadata: { project: 'KXTXR', evidenceRole: 'TECHNICAL_HISTORICAL_SOURCE' },
  },
  {
    key: 'kxtxr-instagram-channel',
    scopeType: 'PROJECT',
    scopeKey: 'KXTXR',
    platform: 'instagram',
    externalUrl: 'https://www.instagram.com/_kxtxr/',
    relationType: 'EXTERNAL_CHANNEL',
    objectResolution: 'PROJECT',
    metadata: { project: 'KXTXR', handle: '_kxtxr' },
  },
  {
    key: 'kxtxr-tiktok-channel',
    scopeType: 'PROJECT',
    scopeKey: 'KXTXR',
    platform: 'tiktok',
    externalUrl: 'https://tiktok.com/@_kxtxr',
    relationType: 'EXTERNAL_CHANNEL',
    objectResolution: 'PROJECT',
    metadata: { project: 'KXTXR', handle: '_kxtxr' },
  },
  {
    key: 'kxtxr-linktree-router',
    scopeType: 'PROJECT',
    scopeKey: 'KXTXR',
    platform: 'linktree',
    externalUrl: 'https://linktr.ee/kxtxr',
    relationType: 'ROUTED_BY',
    objectResolution: 'PROJECT',
    metadata: { project: 'KXTXR', evidenceRole: 'EXTERNAL_ROUTING_SURFACE' },
  },
  {
    key: 'kxtxr-youtube-jtepor-aqwgy',
    scopeType: 'PROJECT',
    scopeKey: 'KXTXR',
    platform: 'youtube',
    externalUrl: 'https://youtu.be/JTepOraQwGY?si=cnj6G7nYnXSKy0z9',
    relationType: 'PUBLISHED_AS',
    objectResolution: 'PENDING_OBJECT_MATCH',
    metadata: { project: 'KXTXR', platformObjectId: 'JTepOraQwGY', objectRelation: 'PENDING_RESOLUTION' },
  },
] as const;
