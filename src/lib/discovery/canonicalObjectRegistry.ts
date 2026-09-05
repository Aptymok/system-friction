import type { PublicationStatus } from '../system/contracts';
import { SFI_PUBLIC_PROFILE } from '../public/institutionProfile';

export const SFI_CANONICAL_OBJECT_CONTRACT = 'SFI-CANONICAL-OBJECT-1.0' as const;

export const SFI_CANONICAL_OBJECT_TYPES = [
  'CONCEPT',
  'METHOD',
  'INSTRUMENT',
  'OBSERVATION',
  'DATASET',
  'REPORT',
  'PAPER',
  'SOFTWARE',
  'RELEASE',
  'RETURN',
  'PUBLICATION',
] as const;

export type SfiCanonicalObjectType = (typeof SFI_CANONICAL_OBJECT_TYPES)[number];
export type SfiCanonicalPublicState = 'PRIVATE' | 'REVIEW_REQUIRED' | 'PUBLIC';
export type SfiCanonicalPrivacyClass = 'PUBLIC' | 'INTERNAL' | 'PRIVATE';
export type SfiCanonicalRightsState = 'OPEN' | 'RESTRICTED' | 'UNKNOWN' | 'NOT_APPLICABLE';
export type SfiCanonicalEntityRelation = 'DEFINED_BY' | 'OBSERVED_BY' | 'PUBLISHED_BY' | 'MAINTAINED_BY';
export type SfiCanonicalPublicationDisposition = 'PUBLISH' | 'BLOCK';

export const SFI_CANONICAL_EPISTEMIC_STATES = [
  'OBSERVED',
  'DECLARED',
  'DERIVED',
  'INFERRED',
  'PROJECTED',
  'SIMULATED',
  'MISSING',
  'ARCHIVED',
  'CANONICAL',
] as const;

export type SfiCanonicalEpistemicState = (typeof SFI_CANONICAL_EPISTEMIC_STATES)[number];

export interface SfiCanonicalObject {
  id: string;
  objectKey: string;
  objectType: SfiCanonicalObjectType;
  slug: string;
  canonicalUrl: string;
  title: string;
  summary: string;
  bodyRef: string | null;
  epistemicState: SfiCanonicalEpistemicState;
  version: string;
  language: string;
  authors: string[];
  methods: string[];
  relatedObjects: string[];
  sourceRefs: string[];
  publicState: SfiCanonicalPublicState;
  license: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SfiCanonicalMissingField {
  field: string;
  reason: string;
  sourceRef: string;
}

export interface SfiCanonicalObjectRecord extends SfiCanonicalObject {
  contract: typeof SFI_CANONICAL_OBJECT_CONTRACT;
  entity: {
    entityId: string;
    relation: SfiCanonicalEntityRelation;
  };
  publication: {
    state: PublicationStatus;
    explicit: true;
  };
  eligibility: {
    privacyClass: SfiCanonicalPrivacyClass;
    publicEligible: boolean;
    securityEligible: boolean;
  };
  rights: {
    state: SfiCanonicalRightsState;
  };
  limitations: string[];
  missing: SfiCanonicalMissingField[];
}

export interface SfiCanonicalPublicProjection {
  contract: typeof SFI_CANONICAL_OBJECT_CONTRACT;
  id: string;
  objectKey: string;
  objectType: SfiCanonicalObjectType;
  canonicalUrl: string;
  entityId: string;
  entityRelation: SfiCanonicalEntityRelation;
  title: string;
  summary: string;
  epistemicState: SfiCanonicalEpistemicState;
  version: string;
  language: string;
  authors: string[];
  methods: string[];
  relatedObjects: string[];
  sourceRefs: string[];
  publicState: 'PUBLIC';
  publicationState: 'PUBLISHED';
  license: string | null;
  limitations: string[];
  missing: SfiCanonicalMissingField[];
}

const OBJECT_NAMESPACE: Record<SfiCanonicalObjectType, string> = {
  CONCEPT: '/concepts',
  METHOD: '/methods',
  INSTRUMENT: '/instruments',
  OBSERVATION: '/observations',
  DATASET: '/datasets',
  REPORT: '/research',
  PAPER: '/research',
  SOFTWARE: '/software',
  RELEASE: '/releases',
  RETURN: '/returns',
  PUBLICATION: '/research',
};

const PUBLICATION_STATES: readonly PublicationStatus[] = [
  'DRAFT',
  'REVIEWED',
  'APPROVED_FOR_PUBLICATION',
  'PUBLISHED',
  'SUPERSEDED',
  'RETRACTED',
];

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SFI_ENTITY_ID = SFI_PUBLIC_PROFILE.institution.entityId;
const BASE = SFI_PUBLIC_PROFILE.institution.canonicalUrl;

function clean(value: string): string {
  return value.trim();
}

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function isIsoDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function isInternalEventRef(value: string): boolean {
  return /^(event|epistemic_event|internal_event):/i.test(clean(value));
}

export function canonicalObjectKey(objectType: SfiCanonicalObjectType, slug: string): string {
  if (!SFI_CANONICAL_OBJECT_TYPES.includes(objectType)) throw new Error(`unsupported_object_type:${objectType}`);
  if (!SLUG_PATTERN.test(slug)) throw new Error(`invalid_slug:${slug}`);
  return `${objectType.toLowerCase()}:${slug}`;
}

export function canonicalUrlFor(objectType: SfiCanonicalObjectType, slug: string): string {
  canonicalObjectKey(objectType, slug);
  return `${BASE}${OBJECT_NAMESPACE[objectType]}/${slug}`;
}

export function validateCanonicalObject(record: SfiCanonicalObjectRecord): string[] {
  const errors: string[] = [];
  const push = (code: string) => errors.push(code);

  if (record.contract !== SFI_CANONICAL_OBJECT_CONTRACT) push('CONTRACT_MISMATCH');
  if (!SFI_CANONICAL_OBJECT_TYPES.includes(record.objectType)) push('OBJECT_TYPE_UNSUPPORTED');
  if (!clean(record.id)) push('ID_REQUIRED');
  if (!SLUG_PATTERN.test(record.slug)) push('SLUG_INVALID');

  if (SFI_CANONICAL_OBJECT_TYPES.includes(record.objectType) && SLUG_PATTERN.test(record.slug)) {
    if (record.objectKey !== canonicalObjectKey(record.objectType, record.slug)) push('OBJECT_KEY_MISMATCH');
    if (record.canonicalUrl !== canonicalUrlFor(record.objectType, record.slug)) push('CANONICAL_URL_MISMATCH');
  }

  if (!clean(record.title)) push('TITLE_REQUIRED');
  if (!clean(record.summary)) push('SUMMARY_REQUIRED');
  if (!clean(record.version)) push('VERSION_REQUIRED');
  if (!clean(record.language)) push('LANGUAGE_REQUIRED');
  if (!SFI_CANONICAL_EPISTEMIC_STATES.includes(record.epistemicState)) push('EPISTEMIC_STATE_UNSUPPORTED');
  if (!['PRIVATE', 'REVIEW_REQUIRED', 'PUBLIC'].includes(record.publicState)) push('PUBLIC_STATE_UNSUPPORTED');
  if (!PUBLICATION_STATES.includes(record.publication.state)) push('PUBLICATION_STATE_UNSUPPORTED');
  if (record.publication.explicit !== true) push('PUBLICATION_MUST_BE_EXPLICIT');

  if (record.entity.entityId !== SFI_ENTITY_ID) push('CANONICAL_ENTITY_MISMATCH');
  if (!['DEFINED_BY', 'OBSERVED_BY', 'PUBLISHED_BY', 'MAINTAINED_BY'].includes(record.entity.relation)) push('ENTITY_RELATION_UNSUPPORTED');

  for (const [name, values] of [
    ['AUTHORS', record.authors],
    ['METHODS', record.methods],
    ['RELATED_OBJECTS', record.relatedObjects],
    ['SOURCE_REFS', record.sourceRefs],
    ['LIMITATIONS', record.limitations],
  ] as const) {
    if (!unique(values)) push(`${name}_DUPLICATE`);
    if (values.some((value) => !clean(value))) push(`${name}_EMPTY_VALUE`);
  }

  if (!isIsoDate(record.createdAt)) push('CREATED_AT_INVALID');
  if (!isIsoDate(record.updatedAt)) push('UPDATED_AT_INVALID');
  if (isIsoDate(record.createdAt) && isIsoDate(record.updatedAt) && Date.parse(record.updatedAt) < Date.parse(record.createdAt)) push('UPDATED_AT_BEFORE_CREATED_AT');

  const missingFields = new Set<string>();
  for (const missing of record.missing) {
    if (!clean(missing.field) || !clean(missing.reason) || !clean(missing.sourceRef)) push('MISSING_ENTRY_INCOMPLETE');
    if (missingFields.has(missing.field)) push('MISSING_ENTRY_DUPLICATE');
    missingFields.add(missing.field);
    if (clean(missing.sourceRef) && !record.sourceRefs.includes(missing.sourceRef)) push('MISSING_SOURCE_NOT_IN_LINEAGE');
  }
  if (record.epistemicState === 'MISSING' && record.missing.length === 0) push('MISSING_STATE_REQUIRES_LINEAGE');

  if (!['PUBLIC', 'INTERNAL', 'PRIVATE'].includes(record.eligibility.privacyClass)) push('PRIVACY_CLASS_UNSUPPORTED');
  if (!['OPEN', 'RESTRICTED', 'UNKNOWN', 'NOT_APPLICABLE'].includes(record.rights.state)) push('RIGHTS_STATE_UNSUPPORTED');
  if (record.rights.state === 'OPEN' && !clean(record.license ?? '')) push('OPEN_RIGHTS_REQUIRE_LICENSE');
  if (record.rights.state === 'NOT_APPLICABLE' && record.license !== null) push('NOT_APPLICABLE_RIGHTS_REQUIRE_NULL_LICENSE');

  if (record.publicState === 'PUBLIC') {
    if (record.publication.state !== 'PUBLISHED') push('PUBLIC_REQUIRES_PUBLISHED_STATE');
    if (record.eligibility.privacyClass !== 'PUBLIC') push('PUBLIC_REQUIRES_PUBLIC_PRIVACY');
    if (!record.eligibility.publicEligible) push('PUBLIC_ELIGIBILITY_REQUIRED');
    if (!record.eligibility.securityEligible) push('PUBLIC_SECURITY_ELIGIBILITY_REQUIRED');
    if (record.sourceRefs.length === 0) push('PUBLIC_LINEAGE_REQUIRED');
    if (record.sourceRefs.length > 0 && record.sourceRefs.every(isInternalEventRef)) push('PUBLIC_CANNOT_DERIVE_ONLY_FROM_INTERNAL_EVENT');
    if (record.rights.state === 'RESTRICTED' || record.rights.state === 'UNKNOWN') push('PUBLIC_RIGHTS_NOT_ELIGIBLE');
  } else if (record.publication.state === 'PUBLISHED') {
    push('PUBLISHED_REQUIRES_PUBLIC_STATE');
  }

  if (record.publicState === 'PRIVATE') {
    if (record.eligibility.publicEligible) push('PRIVATE_CANNOT_BE_PUBLIC_ELIGIBLE');
    if (record.eligibility.privacyClass === 'PUBLIC') push('PRIVATE_CANNOT_HAVE_PUBLIC_PRIVACY');
  }

  return [...new Set(errors)].sort();
}

export function canonicalPublicationDisposition(record: SfiCanonicalObjectRecord): {
  disposition: SfiCanonicalPublicationDisposition;
  reasons: string[];
} {
  const reasons = validateCanonicalObject(record);
  if (reasons.length) return { disposition: 'BLOCK', reasons };
  if (record.publicState !== 'PUBLIC') return { disposition: 'BLOCK', reasons: ['PUBLIC_STATE_NOT_PUBLIC'] };
  if (record.publication.state !== 'PUBLISHED') return { disposition: 'BLOCK', reasons: ['PUBLICATION_NOT_PUBLISHED'] };
  return { disposition: 'PUBLISH', reasons: [] };
}

export function publicProjectionForCanonicalObject(record: SfiCanonicalObjectRecord): SfiCanonicalPublicProjection | null {
  if (canonicalPublicationDisposition(record).disposition !== 'PUBLISH') return null;
  return {
    contract: SFI_CANONICAL_OBJECT_CONTRACT,
    id: record.id,
    objectKey: record.objectKey,
    objectType: record.objectType,
    canonicalUrl: record.canonicalUrl,
    entityId: record.entity.entityId,
    entityRelation: record.entity.relation,
    title: record.title,
    summary: record.summary,
    epistemicState: record.epistemicState,
    version: record.version,
    language: record.language,
    authors: [...record.authors],
    methods: [...record.methods],
    relatedObjects: [...record.relatedObjects],
    sourceRefs: [...record.sourceRefs],
    publicState: 'PUBLIC',
    publicationState: 'PUBLISHED',
    license: record.license,
    limitations: [...record.limitations],
    missing: record.missing.map((entry) => ({ ...entry })),
  };
}

export function validateCanonicalObjectRegistry(records: readonly SfiCanonicalObjectRecord[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const objectKeys = new Set<string>();
  const canonicalUrls = new Set<string>();

  records.forEach((record, index) => {
    for (const error of validateCanonicalObject(record)) errors.push(`${index}:${record.id || 'missing-id'}:${error}`);
    if (ids.has(record.id)) errors.push(`${index}:${record.id}:DUPLICATE_ID`);
    ids.add(record.id);
    if (objectKeys.has(record.objectKey)) errors.push(`${index}:${record.id}:DUPLICATE_OBJECT_KEY`);
    objectKeys.add(record.objectKey);
    if (canonicalUrls.has(record.canonicalUrl)) errors.push(`${index}:${record.id}:DUPLICATE_CANONICAL_URL`);
    canonicalUrls.add(record.canonicalUrl);
  });

  return [...new Set(errors)].sort();
}

export const SFI_CANONICAL_OBJECT_REGISTRY: readonly SfiCanonicalObjectRecord[] = Object.freeze([]);

export function publicCanonicalObjectUrls(records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY): string[] {
  if (validateCanonicalObjectRegistry(records).length) return [];
  return records
    .filter((record) => canonicalPublicationDisposition(record).disposition === 'PUBLISH')
    .map((record) => record.canonicalUrl);
}
