import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SFI_CANONICAL_OBJECT_REGISTRY,
  canonicalPublicationDisposition,
  publicProjectionForCanonicalObject,
  validateCanonicalObject,
} from '../discovery/canonicalObjectRegistry';
import { publicSemanticJsonLdForCanonicalObject } from '../discovery/publicSemanticProjection';
import { getSfiLibraryDocuments } from '../sfi/library/manifest';
import { researchGraphProjectionForCanonicalObjects } from './researchGraphProjection';
import { publicResearchLandingForSlug } from './publicResearchLanding';
import {
  researchCanonicalAdmissionCandidates,
  sfiDt001CanonicalAdmissionCandidate,
  SFI_RESEARCH_CANONICAL_ADMISSION_CONTRACT,
} from './canonicalAdmission';

test('SFI-DT-001 admission is derived from its existing Library owner', () => {
  const document = getSfiLibraryDocuments().find((entry) => entry.id === 'SFI-DT-001');
  assert.ok(document);
  assert.ok(document.canonicalAdmission);
  assert.equal(document.canonicalAdmission.contract, 'SFI-LIBRARY-CANONICAL-ADMISSION-1.0');
  assert.equal(document.status, 'published_static');
  assert.equal(document.canonicalAdmission.staticAvailabilityState, 'PUBLICLY_ACCESSIBLE_NOT_CANONICALLY_PUBLISHED');

  const admission = sfiDt001CanonicalAdmissionCandidate();
  const record = admission.candidate;
  assert.equal(admission.contract, SFI_RESEARCH_CANONICAL_ADMISSION_CONTRACT);
  assert.equal(admission.owner.owner, 'SFI_LIBRARY_MANIFEST');
  assert.equal(admission.owner.documentId, document.id);
  assert.equal(admission.owner.publicPath, document.publicPath);
  assert.equal(admission.admission.state, 'REVIEW_REQUIRED');
  assert.equal(admission.admission.automaticAdmission, false);
  assert.equal(admission.admission.automaticPublication, false);
  assert.deepEqual(validateCanonicalObject(record), []);
  assert.equal(record.id, 'SFI-DT-001');
  assert.equal(record.objectType, 'PUBLICATION');
  assert.equal(record.publicState, 'REVIEW_REQUIRED');
  assert.equal(record.publication.state, 'DRAFT');
  assert.equal(record.epistemicState, 'DECLARED');
  assert.equal(record.rights.state, 'UNKNOWN');
  assert.equal(record.license, null);
  assert.deepEqual(record.authors, []);
  assert.equal(record.canonicalUrl, 'https://systemfriction.org/publications/sfi-dt-001-longitudinal-observation-framework');
});

test('review snapshot is deeply frozen and cannot be promoted by direct mutation', () => {
  const admission = sfiDt001CanonicalAdmissionCandidate();
  assert.equal(Object.isFrozen(admission), true);
  assert.equal(Object.isFrozen(admission.owner), true);
  assert.equal(Object.isFrozen(admission.admission), true);
  assert.equal(Object.isFrozen(admission.candidate), true);
  assert.equal(Object.isFrozen(admission.candidate.publication), true);
  assert.equal(Object.isFrozen(admission.candidate.eligibility), true);
  assert.equal(Object.isFrozen(admission.candidate.rights), true);
  assert.equal(Object.isFrozen(admission.candidate.evidenceIdentity), true);
  assert.equal(Object.isFrozen(admission.candidate.sourceRefs), true);
  assert.equal(Object.isFrozen(admission.candidate.missing), true);
  assert.throws(() => {
    (admission.candidate as { publicState: string }).publicState = 'PUBLIC';
  }, TypeError);
  assert.equal(admission.candidate.publicState, 'REVIEW_REQUIRED');
});

test('observed static availability does not make SFI-DT-001 publicable', () => {
  const record = sfiDt001CanonicalAdmissionCandidate().candidate;
  const disposition = canonicalPublicationDisposition(record);
  assert.equal(disposition.disposition, 'BLOCK');
  assert.ok(disposition.reasons.includes('PUBLICABILITY_RIGHTS_NOT_CLEARED'));
  assert.ok(disposition.reasons.includes('PUBLICABILITY_GOVERNANCE_NOT_PUBLICABLE'));
  assert.ok(disposition.reasons.includes('PUBLICABILITY_EVIDENCE_IDENTITY_INVALID'));
  assert.equal(publicProjectionForCanonicalObject(record), null);
  assert.equal(publicSemanticJsonLdForCanonicalObject(record), null);
  assert.deepEqual(researchGraphProjectionForCanonicalObjects([record]).nodes, []);
  assert.equal(publicResearchLandingForSlug('PUBLICATION', record.slug, [record]), null);
});

test('candidate preserves explicit metadata gaps rather than inventing author, license or approval', () => {
  const record = sfiDt001CanonicalAdmissionCandidate().candidate;
  const missing = new Map(record.missing.map((entry) => [entry.field, entry]));
  assert.ok(missing.has('authors'));
  assert.ok(missing.has('license'));
  assert.ok(missing.has('publication_approval'));
  assert.equal(record.sourceRefs.includes(missing.get('authors')!.sourceRef), true);
  assert.equal(record.sourceRefs.includes(missing.get('license')!.sourceRef), true);
  assert.equal(record.sourceRefs.includes(missing.get('publication_approval')!.sourceRef), true);
  assert.equal(JSON.stringify(record).includes('doi'), false);
  assert.equal(JSON.stringify(record).includes('orcid'), false);
  assert.equal(JSON.stringify(record).includes('ror'), false);
});

test('admission candidates are projected from Library and remain separate from canonical registry', () => {
  const candidates = researchCanonicalAdmissionCandidates();
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.owner.owner, 'SFI_LIBRARY_MANIFEST');
  assert.equal(candidates[0]?.candidate.id, 'SFI-DT-001');
  assert.equal(Object.isFrozen(candidates), true);
  assert.equal(SFI_CANONICAL_OBJECT_REGISTRY.some((record) => record.id === 'SFI-DT-001'), false);
});

test('document time comes from file-specific Git observations, not package timestamp', () => {
  const document = getSfiLibraryDocuments().find((entry) => entry.id === 'SFI-DT-001');
  assert.ok(document?.canonicalAdmission);
  const metadata = document.canonicalAdmission;
  const record = sfiDt001CanonicalAdmissionCandidate().candidate;
  assert.equal(metadata.declaredPublicationLabel, 'PROPOSED · ACTIVE / Official Technical Proposal');
  assert.equal(metadata.authors.length, 0);
  assert.equal(metadata.license, null);
  assert.equal(metadata.firstObservedAt, '2026-06-29T15:45:09Z');
  assert.equal(metadata.firstObservedRef.endsWith('/commit/9c782ad85e3c185372d6a91ecb59374d4bf80386'), true);
  assert.equal(metadata.lastObservedAt, '2026-08-01T11:50:08Z');
  assert.equal(metadata.lastObservedRef.endsWith('/commit/ee3a6d23b026b7ac894e77f496a2a5c8e9491fde'), true);
  assert.equal(record.createdAt, metadata.firstObservedAt);
  assert.equal(record.updatedAt, metadata.lastObservedAt);
  assert.notEqual(record.createdAt, '2026-06-28T21:59:20.715630+00:00');
  assert.ok(metadata.sourceRefs.every((ref) => ref.startsWith('https://github.com/Aptymok/system-friction/')));
});
