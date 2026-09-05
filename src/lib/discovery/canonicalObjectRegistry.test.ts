import assert from 'node:assert/strict';
import test from 'node:test';
import { SFI_PUBLIC_PROFILE } from '../public/institutionProfile';
import {
  SFI_CANONICAL_OBJECT_CONTRACT,
  SFI_CANONICAL_OBJECT_TYPES,
  canonicalObjectKey,
  canonicalPublicationDisposition,
  canonicalUrlFor,
  publicCanonicalObjectUrls,
  publicProjectionForCanonicalObject,
  validateCanonicalObject,
  validateCanonicalObjectRegistry,
  type SfiCanonicalObjectRecord,
  type SfiCanonicalObjectType,
} from './canonicalObjectRegistry';

function fixture(objectType: SfiCanonicalObjectType, suffix = objectType.toLowerCase()): SfiCanonicalObjectRecord {
  const slug = `fixture-${suffix.replace(/_/g, '-')}`;
  return {
    contract: SFI_CANONICAL_OBJECT_CONTRACT,
    id: `sfi-object-${suffix}`,
    objectKey: canonicalObjectKey(objectType, slug),
    objectType,
    slug,
    canonicalUrl: canonicalUrlFor(objectType, slug),
    title: `Fixture ${objectType}`,
    summary: `Deterministic ${objectType} canonical-object fixture.`,
    bodyRef: null,
    epistemicState: objectType === 'OBSERVATION' || objectType === 'RETURN' ? 'OBSERVED' : 'DECLARED',
    version: '1.0.0',
    language: 'en',
    authors: ['System Friction Institute'],
    methods: [],
    relatedObjects: [],
    sourceRefs: [`source:fixture:${suffix}`],
    publicState: 'PUBLIC',
    license: 'CC BY 4.0',
    createdAt: '2026-09-05T00:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z',
    entity: {
      entityId: SFI_PUBLIC_PROFILE.institution.entityId,
      relation: objectType === 'OBSERVATION' || objectType === 'RETURN' ? 'OBSERVED_BY' : 'PUBLISHED_BY',
    },
    publication: {
      state: 'PUBLISHED',
      explicit: true,
    },
    eligibility: {
      privacyClass: 'PUBLIC',
      publicEligible: true,
      securityEligible: true,
    },
    rights: {
      state: 'OPEN',
    },
    limitations: [],
    missing: [],
  };
}

function clone(record: SfiCanonicalObjectRecord): SfiCanonicalObjectRecord {
  return JSON.parse(JSON.stringify(record)) as SfiCanonicalObjectRecord;
}

test('all frozen canonical object types validate and project under explicit publication', () => {
  assert.deepEqual(SFI_CANONICAL_OBJECT_TYPES, [
    'CONCEPT', 'METHOD', 'INSTRUMENT', 'OBSERVATION', 'DATASET', 'REPORT',
    'PAPER', 'SOFTWARE', 'RELEASE', 'RETURN', 'PUBLICATION',
  ]);

  for (const objectType of SFI_CANONICAL_OBJECT_TYPES) {
    const record = fixture(objectType);
    assert.deepEqual(validateCanonicalObject(record), [], objectType);
    assert.equal(canonicalPublicationDisposition(record).disposition, 'PUBLISH', objectType);
    const projection = publicProjectionForCanonicalObject(record);
    assert.ok(projection, objectType);
    assert.equal(projection?.canonicalUrl, record.canonicalUrl, objectType);
    assert.equal(projection?.publicState, 'PUBLIC', objectType);
    assert.equal(projection?.publicationState, 'PUBLISHED', objectType);
  }
});

test('publication is explicit and fail closed for review/private state', () => {
  const review = fixture('REPORT', 'review');
  review.publicState = 'REVIEW_REQUIRED';
  review.publication.state = 'REVIEWED';
  review.eligibility.publicEligible = false;
  assert.deepEqual(validateCanonicalObject(review), []);
  assert.equal(canonicalPublicationDisposition(review).disposition, 'BLOCK');
  assert.equal(publicProjectionForCanonicalObject(review), null);

  const privateRecord = fixture('DATASET', 'private');
  privateRecord.publicState = 'PRIVATE';
  privateRecord.publication.state = 'DRAFT';
  privateRecord.eligibility.privacyClass = 'PRIVATE';
  privateRecord.eligibility.publicEligible = false;
  privateRecord.eligibility.securityEligible = false;
  assert.deepEqual(validateCanonicalObject(privateRecord), []);
  assert.equal(canonicalPublicationDisposition(privateRecord).disposition, 'BLOCK');
  assert.equal(publicProjectionForCanonicalObject(privateRecord), null);
});

test('private state cannot become public by publication inheritance', () => {
  const record = fixture('SOFTWARE', 'private-inheritance');
  record.publicState = 'PRIVATE';
  record.eligibility.privacyClass = 'PRIVATE';
  record.eligibility.publicEligible = false;
  const errors = validateCanonicalObject(record);
  assert.ok(errors.includes('PUBLISHED_REQUIRES_PUBLIC_STATE'));
  assert.equal(canonicalPublicationDisposition(record).disposition, 'BLOCK');
});

test('internal event lineage alone cannot create a public object', () => {
  const record = fixture('OBSERVATION', 'event-only');
  record.sourceRefs = ['epistemic_event:evt-1'];
  const errors = validateCanonicalObject(record);
  assert.ok(errors.includes('PUBLIC_CANNOT_DERIVE_ONLY_FROM_INTERNAL_EVENT'));
  assert.equal(publicProjectionForCanonicalObject(record), null);
});

test('MISSING remains explicit and requires lineage instead of fabrication', () => {
  const invalid = fixture('REPORT', 'missing-invalid');
  invalid.epistemicState = 'MISSING';
  assert.ok(validateCanonicalObject(invalid).includes('MISSING_STATE_REQUIRES_LINEAGE'));

  const missing = fixture('REPORT', 'missing-valid');
  missing.epistemicState = 'MISSING';
  missing.sourceRefs = ['source:required-field-a'];
  missing.missing = [{ field: 'sample_size', reason: 'Source does not disclose sample size.', sourceRef: 'source:required-field-a' }];
  assert.deepEqual(validateCanonicalObject(missing), []);
  const projection = publicProjectionForCanonicalObject(missing);
  assert.equal(projection?.epistemicState, 'MISSING');
  assert.deepEqual(projection?.missing, missing.missing);
});

test('missing entries must point to declared lineage', () => {
  const record = fixture('DATASET', 'missing-lineage');
  record.missing = [{ field: 'license_detail', reason: 'Not supplied.', sourceRef: 'source:not-declared' }];
  assert.ok(validateCanonicalObject(record).includes('MISSING_SOURCE_NOT_IN_LINEAGE'));
});

test('canonical URL is deterministic and competing canon is rejected', () => {
  const record = fixture('METHOD', 'canonical-url');
  record.canonicalUrl = 'https://systemfriction.org/alternate/method';
  assert.ok(validateCanonicalObject(record).includes('CANONICAL_URL_MISMATCH'));

  const first = fixture('PAPER', 'duplicate-canon');
  const second = clone(first);
  second.id = 'sfi-object-duplicate-canon-second';
  const registryErrors = validateCanonicalObjectRegistry([first, second]);
  assert.ok(registryErrors.some((error) => error.endsWith(':DUPLICATE_OBJECT_KEY')));
  assert.ok(registryErrors.some((error) => error.endsWith(':DUPLICATE_CANONICAL_URL')));
});

test('registry public URL projection includes only valid explicitly public records', () => {
  const publicRecord = fixture('CONCEPT', 'public-url');
  const privateRecord = fixture('CONCEPT', 'private-url');
  privateRecord.publicState = 'PRIVATE';
  privateRecord.publication.state = 'DRAFT';
  privateRecord.eligibility.privacyClass = 'PRIVATE';
  privateRecord.eligibility.publicEligible = false;
  privateRecord.eligibility.securityEligible = false;

  assert.deepEqual(publicCanonicalObjectUrls([publicRecord, privateRecord]), [publicRecord.canonicalUrl]);
});

test('rights and privacy gates block accidental public projection', () => {
  const restricted = fixture('PUBLICATION', 'restricted');
  restricted.rights.state = 'RESTRICTED';
  assert.ok(validateCanonicalObject(restricted).includes('PUBLIC_RIGHTS_NOT_ELIGIBLE'));

  const internal = fixture('PUBLICATION', 'internal');
  internal.eligibility.privacyClass = 'INTERNAL';
  assert.ok(validateCanonicalObject(internal).includes('PUBLIC_REQUIRES_PUBLIC_PRIVACY'));
});
