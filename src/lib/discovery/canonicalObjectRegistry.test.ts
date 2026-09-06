import assert from 'node:assert/strict';
import test from 'node:test';
import { SFI_PUBLIC_PROFILE } from '../public/institutionProfile';
import {
  SFI_CANONICAL_OBJECT_CONTRACT,
  SFI_CANONICAL_OBJECT_TYPES,
  canonicalObjectKey,
  canonicalPublicationDisposition,
  canonicalPublicabilityAssessment,
  canonicalUrlFor,
  publicCanonicalObjectUrls,
  publicProjectionForCanonicalObject,
  validateCanonicalObject,
  validateCanonicalObjectRegistry,
  type SfiCanonicalObjectRecord,
  type SfiCanonicalObjectType,
} from './canonicalObjectRegistry';
import {
  SFI_EVIDENCE_CAPSULE_CONTRACT,
  SFI_PUBLIC_SEMANTIC_OBJECT_TYPES,
  SFI_PUBLIC_SEMANTIC_PROJECTION_CONTRACT,
  evidenceCapsuleDisposition,
  evidenceCapsuleForCanonicalObject,
  publicSemanticJsonLdForCanonicalObject,
  publicSemanticProjectionForCanonicalObject,
  publicSemanticProjectionsForCanonicalObjects,
} from './publicSemanticProjection';

function fixture(objectType: SfiCanonicalObjectType, suffix = objectType.toLowerCase()): SfiCanonicalObjectRecord {
  const slug = `fixture-${suffix.replace(/_/g, '-')}`;
  const sourceRef = `source:fixture:${suffix}`;
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
    sourceRefs: [sourceRef],
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
    evidenceIdentity: {
      state: 'VALID',
      refs: [sourceRef],
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
    assert.deepEqual(canonicalPublicabilityAssessment(record), {
      privacy: 'PUBLIC',
      rights: 'CLEARED',
      governance: 'PUBLICABLE',
      evidenceIdentity: 'VALID',
    }, objectType);
    const projection = publicProjectionForCanonicalObject(record);
    assert.ok(projection, objectType);
    assert.equal(projection?.canonicalUrl, record.canonicalUrl, objectType);
    assert.equal(projection?.publicState, 'PUBLIC', objectType);
    assert.equal(projection?.publicationState, 'PUBLISHED', objectType);
    assert.deepEqual(projection?.publicability, {
      privacy: 'PUBLIC',
      rights: 'CLEARED',
      governance: 'PUBLICABLE',
      evidenceIdentity: 'VALID',
    }, objectType);
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
  record.evidenceIdentity.refs = ['epistemic_event:evt-1'];
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
  missing.evidenceIdentity.refs = ['source:required-field-a'];
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

test('rights privacy governance and evidence identity form a four-axis fail-closed gate', () => {
  const restricted = fixture('PUBLICATION', 'restricted');
  restricted.rights.state = 'RESTRICTED';
  assert.equal(canonicalPublicabilityAssessment(restricted).rights, 'NOT_CLEARED');
  assert.ok(validateCanonicalObject(restricted).includes('PUBLIC_RIGHTS_NOT_ELIGIBLE'));

  const internal = fixture('PUBLICATION', 'internal');
  internal.eligibility.privacyClass = 'INTERNAL';
  assert.equal(canonicalPublicabilityAssessment(internal).privacy, 'NOT_PUBLIC');
  assert.ok(validateCanonicalObject(internal).includes('PUBLIC_REQUIRES_PUBLIC_PRIVACY'));

  const governanceBlocked = fixture('REPORT', 'governance-blocked');
  governanceBlocked.eligibility.publicEligible = false;
  assert.equal(canonicalPublicabilityAssessment(governanceBlocked).governance, 'NOT_PUBLICABLE');
  assert.equal(publicProjectionForCanonicalObject(governanceBlocked), null);

  const invalidEvidenceIdentity = fixture('REPORT', 'evidence-identity-invalid');
  invalidEvidenceIdentity.evidenceIdentity.state = 'UNKNOWN';
  assert.equal(canonicalPublicabilityAssessment(invalidEvidenceIdentity).evidenceIdentity, 'INVALID');
  assert.ok(validateCanonicalObject(invalidEvidenceIdentity).includes('PUBLIC_EVIDENCE_IDENTITY_REQUIRED'));
  assert.equal(publicProjectionForCanonicalObject(invalidEvidenceIdentity), null);

  const evidenceOutsideLineage = fixture('REPORT', 'evidence-outside-lineage');
  evidenceOutsideLineage.evidenceIdentity.refs = ['source:not-declared'];
  assert.ok(validateCanonicalObject(evidenceOutsideLineage).includes('EVIDENCE_IDENTITY_REF_NOT_IN_LINEAGE'));
  assert.equal(canonicalPublicabilityAssessment(evidenceOutsideLineage).evidenceIdentity, 'INVALID');
});

test('semantic projection supports the bounded R3 durable object types and never becomes canon', () => {
  assert.deepEqual(SFI_PUBLIC_SEMANTIC_OBJECT_TYPES, [
    'CONCEPT', 'METHOD', 'INSTRUMENT', 'REPORT', 'PAPER', 'SOFTWARE', 'RELEASE', 'RETURN',
  ]);

  for (const objectType of SFI_PUBLIC_SEMANTIC_OBJECT_TYPES) {
    const record = fixture(objectType, `semantic-${objectType.toLowerCase()}`);
    const projection = publicSemanticProjectionForCanonicalObject(record);
    assert.ok(projection, objectType);
    assert.equal(projection?.contract, SFI_PUBLIC_SEMANTIC_PROJECTION_CONTRACT);
    assert.equal(projection?.sourceContract, SFI_CANONICAL_OBJECT_CONTRACT);
    assert.equal(projection?.representationClass, 'EXTERNAL_REPRESENTATION');
    assert.equal(projection?.object.canonicalUrl, record.canonicalUrl);
  }

  assert.equal(publicSemanticProjectionForCanonicalObject(fixture('OBSERVATION')), null);
  assert.equal(publicSemanticProjectionForCanonicalObject(fixture('DATASET')), null);
  assert.equal(publicSemanticProjectionForCanonicalObject(fixture('PUBLICATION')), null);
});

test('object-specific JSON-LD is bounded and contains no fabricated identity identifiers', () => {
  const expected = new Map<SfiCanonicalObjectType, string>([
    ['CONCEPT', 'DefinedTerm'],
    ['METHOD', 'CreativeWork'],
    ['INSTRUMENT', 'CreativeWork'],
    ['REPORT', 'Report'],
    ['PAPER', 'ScholarlyArticle'],
    ['SOFTWARE', 'SoftwareSourceCode'],
    ['RELEASE', 'CreativeWork'],
    ['RETURN', 'CreativeWork'],
  ]);

  for (const [objectType, schemaType] of expected) {
    const jsonLd = publicSemanticJsonLdForCanonicalObject(fixture(objectType, `jsonld-${objectType.toLowerCase()}`));
    assert.ok(jsonLd, objectType);
    assert.equal(jsonLd?.['@type'], schemaType, objectType);
    const serialized = JSON.stringify(jsonLd).toLowerCase();
    for (const forbidden of ['sameas', 'doi', 'orcid', 'ror']) assert.equal(serialized.includes(forbidden), false, `${objectType}:${forbidden}`);
    assert.notEqual(jsonLd?.['@type'], 'Organization', objectType);
  }
});

test('semantic projection is derived only from canonical publicable state', () => {
  const publicRecord = fixture('REPORT', 'semantic-public');
  const privateRecord = fixture('REPORT', 'semantic-private');
  privateRecord.publicState = 'PRIVATE';
  privateRecord.publication.state = 'DRAFT';
  privateRecord.eligibility.privacyClass = 'PRIVATE';
  privateRecord.eligibility.publicEligible = false;
  privateRecord.eligibility.securityEligible = false;

  const projections = publicSemanticProjectionsForCanonicalObjects([privateRecord, publicRecord]);
  assert.deepEqual(projections.map((projection) => projection.object.id), [publicRecord.id]);
});

test('Evidence Capsule preserves contract fields and canonical lineage', () => {
  const record = fixture('REPORT', 'capsule-report');
  record.methods = ['method:mihm'];
  record.limitations = ['Bounded fixture limitation.'];
  record.relatedObjects = ['sfi-object-related'];
  const sourceRef = record.sourceRefs[0]!;

  const capsule = evidenceCapsuleForCanonicalObject(record, {
    id: 'capsule:report:1',
    claim: 'The bounded report claim is supported by the declared evidence reference.',
    evidenceRefs: [sourceRef],
    observedAt: null,
    producedAt: '2026-09-05T01:00:00.000Z',
    origin: 'DECLARED',
  });

  assert.ok(capsule);
  assert.equal(capsule?.contract, SFI_EVIDENCE_CAPSULE_CONTRACT);
  assert.equal(capsule?.type, 'REPORT');
  assert.equal(capsule?.state, record.epistemicState);
  assert.equal(capsule?.object.id, record.id);
  assert.equal(capsule?.producedAt, '2026-09-05T01:00:00.000Z');
  assert.deepEqual(capsule?.evidenceRefs, [sourceRef]);
  assert.deepEqual(capsule?.method, record.methods);
  assert.deepEqual(capsule?.limitations, record.limitations);
  assert.deepEqual(capsule?.related, record.relatedObjects);
  assert.deepEqual(capsule?.lineage, [record.id, ...record.sourceRefs]);
  assert.equal(capsule?.canonicalUrl, record.canonicalUrl);
});

test('MISSING is metadata, never promoted into capsule evidence', () => {
  const record = fixture('REPORT', 'capsule-missing');
  const admittedRef = record.sourceRefs[0]!;
  const missingRef = 'source:fixture:missing-field';
  record.sourceRefs.push(missingRef);
  record.evidenceIdentity.refs.push(missingRef);
  record.missing = [{ field: 'sample_size', reason: 'Not disclosed.', sourceRef: missingRef }];

  const blocked = evidenceCapsuleDisposition(record, {
    id: 'capsule:missing:blocked',
    claim: 'Invalid attempt to use missing state as evidence.',
    evidenceRefs: [missingRef],
    observedAt: null,
    producedAt: '2026-09-05T01:00:00.000Z',
    origin: 'DECLARED',
  });
  assert.equal(blocked.disposition, 'BLOCK');
  assert.ok(blocked.reasons.includes('MISSING_REF_CANNOT_BE_EVIDENCE'));

  const capsule = evidenceCapsuleForCanonicalObject(record, {
    id: 'capsule:missing:separated',
    claim: 'Admitted evidence remains separate from documented missing information.',
    evidenceRefs: [admittedRef],
    observedAt: null,
    producedAt: '2026-09-05T01:00:00.000Z',
    origin: 'DECLARED',
  });
  assert.ok(capsule);
  assert.deepEqual(capsule?.evidenceRefs, [admittedRef]);
  assert.deepEqual(capsule?.missing, record.missing);

  const missingObject = fixture('REPORT', 'capsule-missing-object');
  missingObject.epistemicState = 'MISSING';
  missingObject.missing = [{ field: 'outcome', reason: 'Outcome is not observed.', sourceRef: missingObject.sourceRefs[0]! }];
  assert.equal(evidenceCapsuleForCanonicalObject(missingObject, {
    id: 'capsule:missing-object',
    claim: 'Missing cannot be an evidence capsule.',
    evidenceRefs: [missingObject.sourceRefs[0]!],
    observedAt: null,
    producedAt: '2026-09-05T01:00:00.000Z',
    origin: 'DECLARED',
  }), null);
});

test('MODEL OUTPUT != OBSERVATION and RETURN requires reality observation', () => {
  const observed = fixture('RETURN', 'return-boundary');
  const sourceRef = observed.sourceRefs[0]!;

  const modelOutput = evidenceCapsuleDisposition(observed, {
    id: 'capsule:model-output',
    claim: 'A model output cannot be reclassified as an observed RETURN.',
    evidenceRefs: [sourceRef],
    observedAt: '2026-09-05T01:00:00.000Z',
    producedAt: null,
    origin: 'MODEL_OUTPUT',
  });
  assert.equal(modelOutput.disposition, 'BLOCK');
  assert.ok(modelOutput.reasons.includes('MODEL_OUTPUT_CANNOT_BE_OBSERVATION'));
  assert.ok(modelOutput.reasons.includes('MODEL_OUTPUT_CANNOT_HAVE_OBSERVED_STATE'));
  assert.ok(modelOutput.reasons.includes('RETURN_REQUIRES_REALITY_OBSERVATION'));

  const realReturn = evidenceCapsuleForCanonicalObject(observed, {
    id: 'capsule:return:observed',
    claim: 'RETURN is admitted only with an observed temporal coordinate.',
    evidenceRefs: [sourceRef],
    observedAt: '2026-09-05T01:00:00.000Z',
    producedAt: null,
    origin: 'OBSERVATION',
  });
  assert.ok(realReturn);
  assert.equal(realReturn?.origin, 'OBSERVATION');
  assert.equal(realReturn?.observedAt, '2026-09-05T01:00:00.000Z');
});
