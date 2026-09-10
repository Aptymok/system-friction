import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { canonicalPublicationDisposition, publicProjectionForCanonicalObject } from '../src/lib/discovery/canonicalObjectRegistry';
import { publicSemanticJsonLdForCanonicalObject } from '../src/lib/discovery/publicSemanticProjection';
import { getSfiLibraryDocuments } from '../src/lib/sfi/library/manifest';
import { publicResearchLandingForSlug } from '../src/lib/research/publicResearchLanding';
import { researchGraphProjectionForCanonicalObjects } from '../src/lib/research/researchGraphProjection';
import {
  researchCanonicalAdmissionCandidates,
  sfiDt001CanonicalAdmissionCandidate,
  SFI_RESEARCH_CANONICAL_ADMISSION_CONTRACT,
} from '../src/lib/research/canonicalAdmission';

const htmlPath = 'public/library/SFI-DT-001_Longitudinal_Observation_Framework.html';
const pdfPath = 'public/library/pdf/SFI-DT-001_Longitudinal_Observation_Framework.pdf';
const read = (path: string) => readFileSync(path, 'utf8');

function main() {
  assert.equal(SFI_RESEARCH_CANONICAL_ADMISSION_CONTRACT, 'SFI-RESEARCH-CANONICAL-ADMISSION-1.1');
  const candidates = researchCanonicalAdmissionCandidates();
  assert.equal(candidates.length, 1);
  assert.equal(Object.isFrozen(candidates), true);
  assert.equal(existsSync(htmlPath), true, 'observed source HTML missing');
  assert.equal(existsSync(pdfPath), true, 'observed source PDF missing');

  const html = read(htmlPath);
  const libraryReadme = read('public/library/README.md');
  const packageManifest = JSON.parse(read('public/library/manifest.json')) as { version?: string; created_at?: string; documents?: string[] };
  const citation = read('CITATION.cff');
  const libraryDocument = getSfiLibraryDocuments().find((entry) => entry.id === 'SFI-DT-001');
  assert.ok(libraryDocument?.canonicalAdmission, 'SFI-DT-001 Library owner must carry canonical admission metadata');
  const ownerMetadata = libraryDocument.canonicalAdmission;
  const admission = sfiDt001CanonicalAdmissionCandidate();
  const candidate = admission.candidate;

  assert.match(html, /SYSTEM FRICTION INSTITUTE<br>OFFICIAL PUBLICATION/);
  assert.match(html, /PROPOSED · ACTIVE/);
  assert.match(html, /Official Technical Proposal/);
  assert.match(html, /<html lang="es">/);
  assert.match(libraryReadme, /SFI-DT-001_Longitudinal_Observation_Framework\.html.*official institutional publication/i);
  assert.equal(packageManifest.version, '1.0');
  assert.equal(packageManifest.created_at, '2026-06-28T21:59:20.715630+00:00');
  assert.equal(packageManifest.documents?.includes('SFI-DT-001_Longitudinal_Observation_Framework.html'), true);

  assert.equal(admission.owner.owner, 'SFI_LIBRARY_MANIFEST');
  assert.equal(admission.owner.documentId, libraryDocument.id);
  assert.equal(ownerMetadata.staticAvailabilityState, 'PUBLICLY_ACCESSIBLE_NOT_CANONICALLY_PUBLISHED');
  assert.equal(ownerMetadata.declaredPublicationLabel, 'PROPOSED · ACTIVE / Official Technical Proposal');
  assert.equal(ownerMetadata.firstObservedAt, '2026-06-29T15:45:09Z');
  assert.equal(ownerMetadata.firstObservedRef.endsWith('/commit/9c782ad85e3c185372d6a91ecb59374d4bf80386'), true);
  assert.equal(ownerMetadata.lastObservedAt, '2026-08-01T11:50:08Z');
  assert.equal(ownerMetadata.lastObservedRef.endsWith('/commit/ee3a6d23b026b7ac894e77f496a2a5c8e9491fde'), true);
  assert.equal(candidate.createdAt, ownerMetadata.firstObservedAt);
  assert.equal(candidate.updatedAt, ownerMetadata.lastObservedAt);
  assert.notEqual(candidate.createdAt, packageManifest.created_at, 'package timestamp cannot be assigned to document creation');

  assert.doesNotMatch(html, /<meta[^>]+name=["']author["']/i, 'human author metadata must not be inferred from institution branding');
  assert.doesNotMatch(html, /\blicense\b/i, 'work-specific license is not observed in SFI-DT-001 HTML');
  assert.match(citation, /"alias": "Aptymok"/);
  assert.equal(candidate.authors.includes('Aptymok'), false, 'repository software author alias must not be inherited as publication authorship');

  assert.equal(candidate.publicState, 'REVIEW_REQUIRED');
  assert.equal(candidate.publication.state, 'DRAFT');
  assert.equal(candidate.rights.state, 'UNKNOWN');
  assert.equal(candidate.license, null);
  assert.equal(candidate.evidenceIdentity.state, 'UNKNOWN');
  assert.equal(candidate.eligibility.publicEligible, false);
  assert.deepEqual([...candidate.missing.map((entry) => entry.field)].sort(), ['authors', 'license', 'publication_approval']);

  assert.equal(Object.isFrozen(admission), true);
  assert.equal(Object.isFrozen(candidate), true);
  assert.equal(Object.isFrozen(candidate.publication), true);
  assert.equal(Object.isFrozen(candidate.eligibility), true);
  assert.equal(Object.isFrozen(candidate.rights), true);
  assert.equal(Object.isFrozen(candidate.evidenceIdentity), true);
  assert.equal(Object.isFrozen(candidate.sourceRefs), true);
  assert.equal(Object.isFrozen(candidate.missing), true);

  const disposition = canonicalPublicationDisposition(candidate);
  assert.equal(disposition.disposition, 'BLOCK');
  assert.equal(publicProjectionForCanonicalObject(candidate), null);
  assert.equal(publicSemanticJsonLdForCanonicalObject(candidate), null);
  assert.deepEqual(researchGraphProjectionForCanonicalObjects([candidate]).nodes, []);
  assert.equal(publicResearchLandingForSlug('PUBLICATION', candidate.slug, [candidate]), null);

  const implementation = read('src/lib/research/canonicalAdmission.ts');
  assert.doesNotMatch(implementation, /SFI_RESEARCH_CANONICAL_ADMISSION_CANDIDATES\s*=/, 'research admission must not own a parallel candidate registry');
  assert.match(implementation, /getSfiLibraryDocuments\(\)/, 'candidate projection must derive from Library owner');
  assert.match(implementation, /deepFreeze/, 'review snapshot must be immutable at runtime');

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-RESEARCH-CANONICAL-ADMISSION-QA-1.1',
    owner: 'SFI_LIBRARY_MANIFEST',
    candidateId: candidate.id,
    observedSourceState: 'PROPOSED_ACTIVE_TECHNICAL_PROPOSAL',
    staticAvailabilityState: ownerMetadata.staticAvailabilityState,
    canonicalCandidateState: candidate.publicState,
    normalizedPublicationState: candidate.publication.state,
    documentFirstObservedAt: ownerMetadata.firstObservedAt,
    documentLastObservedAt: ownerMetadata.lastObservedAt,
    packageTimestampUsedAsDocumentCreation: false,
    authorIdentity: 'MISSING',
    rightsLicense: 'MISSING',
    evidenceIdentity: candidate.evidenceIdentity.state,
    immutableSnapshot: true,
    parallelCandidateRegistry: false,
    publicProjectionEmitted: false,
    researchGraphNodeEmitted: false,
    publicLandingResolvable: false,
    doiInvented: false,
    orcidInvented: false,
    rorInvented: false,
    automaticAdmission: false,
    automaticPublication: false,
  }, null, 2));
}

main();
