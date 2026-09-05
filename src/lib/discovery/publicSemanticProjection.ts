import {
  SFI_CANONICAL_OBJECT_CONTRACT,
  SFI_CANONICAL_OBJECT_REGISTRY,
  canonicalPublicationDisposition,
  publicProjectionForCanonicalObject,
  validateCanonicalObjectRegistry,
  type SfiCanonicalEpistemicState,
  type SfiCanonicalMissingField,
  type SfiCanonicalObjectRecord,
  type SfiCanonicalObjectType,
  type SfiCanonicalPublicProjection,
} from './canonicalObjectRegistry';

export const SFI_PUBLIC_SEMANTIC_PROJECTION_CONTRACT = 'SFI-PUBLIC-SEMANTIC-PROJECTION-1.0' as const;
export const SFI_EVIDENCE_CAPSULE_CONTRACT = 'SFI-EVIDENCE-CAPSULE-1.0' as const;

export const SFI_PUBLIC_SEMANTIC_OBJECT_TYPES = [
  'CONCEPT',
  'METHOD',
  'INSTRUMENT',
  'REPORT',
  'PAPER',
  'SOFTWARE',
  'RELEASE',
  'RETURN',
] as const satisfies readonly SfiCanonicalObjectType[];

export type SfiPublicSemanticObjectType = (typeof SFI_PUBLIC_SEMANTIC_OBJECT_TYPES)[number];
export type SfiPublicSemanticSchemaType =
  | 'DefinedTerm'
  | 'CreativeWork'
  | 'Report'
  | 'ScholarlyArticle'
  | 'SoftwareSourceCode';

export type SfiEvidenceCapsuleOrigin = 'OBSERVATION' | 'DECLARED' | 'DERIVED' | 'MODEL_OUTPUT';
export type SfiEvidenceCapsuleDisposition = 'PUBLISH' | 'BLOCK';

export interface SfiPublicSemanticJsonLd {
  '@context': 'https://schema.org';
  '@type': SfiPublicSemanticSchemaType;
  '@id': string;
  identifier: string;
  url: string;
  name: string;
  description: string;
  version: string;
  inLanguage: string;
  author: string[];
  license?: string;
}

export interface SfiPublicSemanticProjection {
  contract: typeof SFI_PUBLIC_SEMANTIC_PROJECTION_CONTRACT;
  sourceContract: typeof SFI_CANONICAL_OBJECT_CONTRACT;
  representationClass: 'EXTERNAL_REPRESENTATION';
  object: SfiCanonicalPublicProjection;
  jsonLd: SfiPublicSemanticJsonLd;
}

export interface SfiEvidenceCapsuleRequest {
  id: string;
  claim: string;
  evidenceRefs: string[];
  observedAt: string | null;
  producedAt: string | null;
  origin: SfiEvidenceCapsuleOrigin;
}

export interface SfiEvidenceCapsule {
  contract: typeof SFI_EVIDENCE_CAPSULE_CONTRACT;
  id: string;
  type: SfiCanonicalObjectType;
  state: SfiCanonicalEpistemicState;
  object: {
    id: string;
    objectKey: string;
    objectType: SfiCanonicalObjectType;
  };
  observedAt: string | null;
  producedAt: string | null;
  claim: string;
  evidenceRefs: string[];
  method: string[];
  limitations: string[];
  missing: SfiCanonicalMissingField[];
  related: string[];
  lineage: string[];
  version: string;
  canonicalUrl: string;
  origin: SfiEvidenceCapsuleOrigin;
}

const JSON_LD_TYPE_BY_OBJECT: Record<SfiPublicSemanticObjectType, SfiPublicSemanticSchemaType> = {
  CONCEPT: 'DefinedTerm',
  METHOD: 'CreativeWork',
  INSTRUMENT: 'CreativeWork',
  REPORT: 'Report',
  PAPER: 'ScholarlyArticle',
  SOFTWARE: 'SoftwareSourceCode',
  RELEASE: 'CreativeWork',
  RETURN: 'CreativeWork',
};

function clean(value: string): string {
  return value.trim();
}

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function isIsoDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function isPublicSemanticObjectType(value: SfiCanonicalObjectType): value is SfiPublicSemanticObjectType {
  return (SFI_PUBLIC_SEMANTIC_OBJECT_TYPES as readonly SfiCanonicalObjectType[]).includes(value);
}

function cloneMissing(entries: readonly SfiCanonicalMissingField[]): SfiCanonicalMissingField[] {
  return entries.map((entry) => ({ ...entry }));
}

export function publicSemanticJsonLdForCanonicalObject(record: SfiCanonicalObjectRecord): SfiPublicSemanticJsonLd | null {
  if (!isPublicSemanticObjectType(record.objectType)) return null;
  const projection = publicProjectionForCanonicalObject(record);
  if (!projection) return null;

  return {
    '@context': 'https://schema.org',
    '@type': JSON_LD_TYPE_BY_OBJECT[record.objectType],
    '@id': projection.canonicalUrl,
    identifier: projection.id,
    url: projection.canonicalUrl,
    name: projection.title,
    description: projection.summary,
    version: projection.version,
    inLanguage: projection.language,
    author: [...projection.authors],
    ...(projection.license ? { license: projection.license } : {}),
  };
}

export function publicSemanticProjectionForCanonicalObject(record: SfiCanonicalObjectRecord): SfiPublicSemanticProjection | null {
  if (!isPublicSemanticObjectType(record.objectType)) return null;
  const object = publicProjectionForCanonicalObject(record);
  if (!object) return null;
  const jsonLd = publicSemanticJsonLdForCanonicalObject(record);
  if (!jsonLd) return null;

  return {
    contract: SFI_PUBLIC_SEMANTIC_PROJECTION_CONTRACT,
    sourceContract: SFI_CANONICAL_OBJECT_CONTRACT,
    representationClass: 'EXTERNAL_REPRESENTATION',
    object,
    jsonLd,
  };
}

export function publicSemanticProjectionsForCanonicalObjects(
  records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY,
): SfiPublicSemanticProjection[] {
  const errors = validateCanonicalObjectRegistry(records);
  if (errors.length > 0) throw new Error(`invalid_canonical_object_source:${errors.join('|')}`);

  return records
    .map(publicSemanticProjectionForCanonicalObject)
    .filter((projection): projection is SfiPublicSemanticProjection => projection !== null)
    .sort((left, right) => left.object.canonicalUrl.localeCompare(right.object.canonicalUrl));
}

export function evidenceCapsuleDisposition(
  record: SfiCanonicalObjectRecord,
  request: SfiEvidenceCapsuleRequest,
): { disposition: SfiEvidenceCapsuleDisposition; reasons: string[] } {
  const reasons: string[] = [];
  const push = (reason: string) => reasons.push(reason);
  const publication = canonicalPublicationDisposition(record);

  if (publication.disposition !== 'PUBLISH') push('CANONICAL_OBJECT_NOT_PUBLICABLE');
  if (!clean(request.id)) push('CAPSULE_ID_REQUIRED');
  if (!clean(request.claim)) push('CLAIM_REQUIRED');
  if (!unique(request.evidenceRefs)) push('EVIDENCE_REFS_DUPLICATE');
  if (request.evidenceRefs.length === 0) push('EVIDENCE_REFS_REQUIRED');
  if (request.evidenceRefs.some((ref) => !clean(ref))) push('EVIDENCE_REF_EMPTY');

  for (const evidenceRef of request.evidenceRefs) {
    if (!record.evidenceIdentity.refs.includes(evidenceRef)) push('EVIDENCE_REF_NOT_VALIDATED');
  }

  const missingRefs = new Set(record.missing.map((entry) => entry.sourceRef));
  if (request.evidenceRefs.some((ref) => missingRefs.has(ref))) push('MISSING_REF_CANNOT_BE_EVIDENCE');
  if (record.epistemicState === 'MISSING') push('MISSING_STATE_CANNOT_BE_EVIDENCE_CAPSULE');

  const hasObservedAt = request.observedAt !== null;
  const hasProducedAt = request.producedAt !== null;
  if (hasObservedAt === hasProducedAt) push('TEMPORAL_COORDINATE_REQUIRES_EXACTLY_ONE');
  if (request.observedAt !== null && !isIsoDate(request.observedAt)) push('OBSERVED_AT_INVALID');
  if (request.producedAt !== null && !isIsoDate(request.producedAt)) push('PRODUCED_AT_INVALID');

  if (request.origin === 'OBSERVATION' && !hasObservedAt) push('OBSERVATION_ORIGIN_REQUIRES_OBSERVED_AT');
  if (request.origin === 'MODEL_OUTPUT' && hasObservedAt) push('MODEL_OUTPUT_CANNOT_BE_OBSERVATION');
  if (request.origin === 'MODEL_OUTPUT' && record.epistemicState === 'OBSERVED') push('MODEL_OUTPUT_CANNOT_HAVE_OBSERVED_STATE');
  if (record.epistemicState === 'OBSERVED' && !hasObservedAt) push('OBSERVED_STATE_REQUIRES_OBSERVED_AT');
  if (record.objectType === 'RETURN' && (request.origin !== 'OBSERVATION' || !hasObservedAt)) {
    push('RETURN_REQUIRES_REALITY_OBSERVATION');
  }

  return {
    disposition: reasons.length === 0 ? 'PUBLISH' : 'BLOCK',
    reasons: [...new Set(reasons)].sort(),
  };
}

export function evidenceCapsuleForCanonicalObject(
  record: SfiCanonicalObjectRecord,
  request: SfiEvidenceCapsuleRequest,
): SfiEvidenceCapsule | null {
  if (evidenceCapsuleDisposition(record, request).disposition !== 'PUBLISH') return null;

  return {
    contract: SFI_EVIDENCE_CAPSULE_CONTRACT,
    id: request.id,
    type: record.objectType,
    state: record.epistemicState,
    object: {
      id: record.id,
      objectKey: record.objectKey,
      objectType: record.objectType,
    },
    observedAt: request.observedAt,
    producedAt: request.producedAt,
    claim: request.claim,
    evidenceRefs: [...request.evidenceRefs],
    method: [...record.methods],
    limitations: [...record.limitations],
    missing: cloneMissing(record.missing),
    related: [...record.relatedObjects],
    lineage: [...new Set([record.id, ...record.sourceRefs])],
    version: record.version,
    canonicalUrl: record.canonicalUrl,
    origin: request.origin,
  };
}
