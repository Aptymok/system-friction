import assert from 'node:assert/strict';
import test from 'node:test';
import { SFI_PUBLIC_PROFILE } from '../public/institutionProfile';
import {
  SFI_CANONICAL_OBJECT_CONTRACT,
  canonicalObjectKey,
  canonicalUrlFor,
  type SfiCanonicalObjectRecord,
  type SfiCanonicalObjectType,
} from '../discovery/canonicalObjectRegistry';
import {
  SFI_PUBLIC_RESEARCH_LANDING_CONTRACT,
  publicResearchLandingForSlug,
} from './publicResearchLanding';

function fixture(objectType: SfiCanonicalObjectType, slug: string): SfiCanonicalObjectRecord {
  const sourceRef = `source:fixture:${objectType.toLowerCase()}:${slug}`;
  return {
    contract: SFI_CANONICAL_OBJECT_CONTRACT,
    id: `fixture-${objectType.toLowerCase()}-${slug}`,
    objectKey: canonicalObjectKey(objectType, slug),
    objectType,
    slug,
    canonicalUrl: canonicalUrlFor(objectType, slug),
    title: `Fixture ${objectType}`,
    summary: `Public landing fixture for ${objectType}.`,
    bodyRef: null,
    epistemicState: 'DECLARED',
    version: '1.0.0',
    language: 'en',
    authors: ['Observed Author'],
    methods: [],
    relatedObjects: [],
    sourceRefs: [sourceRef],
    publicState: 'PUBLIC',
    license: 'CC BY 4.0',
    createdAt: '2026-09-09T00:00:00.000Z',
    updatedAt: '2026-09-09T00:00:00.000Z',
    entity: {
      entityId: SFI_PUBLIC_PROFILE.institution.entityId,
      relation: 'PUBLISHED_BY',
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
    rights: { state: 'OPEN' },
    evidenceIdentity: { state: 'VALID', refs: [sourceRef] },
    limitations: [],
    missing: [],
  };
}

test('PUBLICATION resolves only through /publications canonical landing', () => {
  const record = fixture('PUBLICATION', 'fixture-publication');
  const landing = publicResearchLandingForSlug('PUBLICATION', record.slug, [record]);
  assert.ok(landing);
  assert.equal(landing?.contract, SFI_PUBLIC_RESEARCH_LANDING_CONTRACT);
  assert.equal(landing?.canonicalNamespace, '/publications');
  assert.equal(landing?.canonicalUrl, 'https://systemfriction.org/publications/fixture-publication');
  assert.equal(landing?.node.objectType, 'PUBLICATION');
  assert.equal(publicResearchLandingForSlug('RESEARCH', record.slug, [record]), null);
});

test('REPORT and PAPER resolve through /research without crossing into publications', () => {
  for (const objectType of ['REPORT', 'PAPER'] as const) {
    const record = fixture(objectType, `fixture-${objectType.toLowerCase()}`);
    const landing = publicResearchLandingForSlug('RESEARCH', record.slug, [record]);
    assert.ok(landing, objectType);
    assert.equal(landing?.canonicalNamespace, '/research', objectType);
    assert.equal(landing?.node.objectType, objectType, objectType);
    assert.equal(publicResearchLandingForSlug('PUBLICATION', record.slug, [record]), null, objectType);
  }
});

test('nonpublic canonical records never resolve as public landing pages', () => {
  const record = fixture('PUBLICATION', 'private-publication');
  record.publicState = 'PRIVATE';
  record.publication.state = 'DRAFT';
  record.eligibility.privacyClass = 'PRIVATE';
  record.eligibility.publicEligible = false;
  record.eligibility.securityEligible = false;
  assert.equal(publicResearchLandingForSlug('PUBLICATION', record.slug, [record]), null);
});

test('invalid or ambiguous canonical source fails closed', () => {
  const first = fixture('REPORT', 'ambiguous');
  const second = fixture('PAPER', 'ambiguous');
  assert.throws(
    () => publicResearchLandingForSlug('RESEARCH', 'ambiguous', [first, second]),
    /invalid_canonical_object_source/,
  );
});

test('invalid slug and absent object return not found without inference', () => {
  assert.equal(publicResearchLandingForSlug('PUBLICATION', '../escape', []), null);
  assert.equal(publicResearchLandingForSlug('PUBLICATION', 'not-observed', []), null);
});

test('landing preserves citation and epistemic boundaries from the research graph', () => {
  const record = fixture('PUBLICATION', 'citation-lineage');
  record.methods = ['MIHM'];
  record.limitations = ['Fixture limitation.'];
  const landing = publicResearchLandingForSlug('PUBLICATION', record.slug, [record]);
  assert.ok(landing);
  assert.deepEqual(landing?.citation.sourceRefs, record.sourceRefs);
  assert.deepEqual(landing?.citation.limitations, record.limitations);
  assert.deepEqual(landing?.node.methods, ['MIHM']);
  assert.deepEqual(landing?.boundary, {
    landingIsProjectionNotCanon: true,
    landingDoesNotCreatePublicationState: true,
    landingDoesNotCreateEvidence: true,
    missingObjectReturnsNotFound: true,
    invalidCanonicalRegistryFailsClosed: true,
  });
});
