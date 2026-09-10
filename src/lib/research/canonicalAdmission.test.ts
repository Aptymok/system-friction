import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SFI_CANONICAL_OBJECT_REGISTRY,
  canonicalPublicationDisposition,
  publicProjectionForCanonicalObject,
  validateCanonicalObject,
} from '../discovery/canonicalObjectRegistry';
import { publicSemanticJsonLdForCanonicalObject } from '../discovery/publicSemanticProjection';
import { researchGraphProjectionForCanonicalObjects } from './researchGraphProjection';
import { publicResearchLandingForSlug } from './publicResearchLanding';
import {
  SFI_DT_001_CANONICAL_ADMISSION_CANDIDATE,
  SFI_DT_001_OBSERVED_RESEARCH_ASSET,
  SFI_RESEARCH_CANONICAL_ADMISSION_CANDIDATES,
  SFI_RESEARCH_CANONICAL_ADMISSION_CONTRACT,
} from './canonicalAdmission';

test('SFI-DT-001 is reconstructed as a valid review candidate without publication promotion', () => {
  const admission = SFI_DT_001_CANONICAL_ADMISSION_CANDIDATE;
  const record = admission.candidate;

  assert.equal(admission.contract, SFI_RESEARCH_CANONICAL_ADMISSION_CONTRACT);
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

test('observed public availability does not make SFI-DT-001 publicable', () => {
  const record = SFI_DT_001_CANONICAL_ADMISSION_CANDIDATE.candidate;
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
  const record = SFI_DT_001_CANONICAL_ADMISSION_CANDIDATE.candidate;
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

test('admission queue is separate from canonical registry until SFI-00 admits a reviewed object', () => {
  assert.equal(SFI_RESEARCH_CANONICAL_ADMISSION_CANDIDATES.length, 1);
  assert.equal(SFI_RESEARCH_CANONICAL_ADMISSION_CANDIDATES[0]?.candidate.id, 'SFI-DT-001');
  assert.equal(SFI_CANONICAL_OBJECT_REGISTRY.some((record) => record.id === 'SFI-DT-001'), false);
});

test('source descriptor preserves the observed conflicting publication labels and immutable provenance', () => {
  assert.equal(SFI_DT_001_OBSERVED_RESEARCH_ASSET.declaredPublicationLabel, 'PROPOSED · ACTIVE / Official Technical Proposal');
  assert.equal(SFI_DT_001_OBSERVED_RESEARCH_ASSET.authors.length, 0);
  assert.equal(SFI_DT_001_OBSERVED_RESEARCH_ASSET.license, null);
  assert.equal(SFI_DT_001_OBSERVED_RESEARCH_ASSET.sourceRefs.length, 5);
  assert.ok(SFI_DT_001_OBSERVED_RESEARCH_ASSET.sourceRefs.every((ref) => ref.startsWith('https://github.com/Aptymok/system-friction/')));
});
