import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { canonicalPublicationDisposition, publicProjectionForCanonicalObject } from '../src/lib/discovery/canonicalObjectRegistry';
import { publicSemanticJsonLdForCanonicalObject } from '../src/lib/discovery/publicSemanticProjection';
import { publicResearchLandingForSlug } from '../src/lib/research/publicResearchLanding';
import { researchGraphProjectionForCanonicalObjects } from '../src/lib/research/researchGraphProjection';
import {
  SFI_DT_001_CANONICAL_ADMISSION_CANDIDATE,
  SFI_RESEARCH_CANONICAL_ADMISSION_CANDIDATES,
  SFI_RESEARCH_CANONICAL_ADMISSION_CONTRACT,
} from '../src/lib/research/canonicalAdmission';

const htmlPath = 'public/library/SFI-DT-001_Longitudinal_Observation_Framework.html';
const pdfPath = 'public/library/pdf/SFI-DT-001_Longitudinal_Observation_Framework.pdf';
const read = (path: string) => readFileSync(path, 'utf8');

function main() {
  assert.equal(SFI_RESEARCH_CANONICAL_ADMISSION_CONTRACT, 'SFI-RESEARCH-CANONICAL-ADMISSION-1.0');
  assert.equal(SFI_RESEARCH_CANONICAL_ADMISSION_CANDIDATES.length, 1);
  assert.equal(existsSync(htmlPath), true, 'observed source HTML missing');
  assert.equal(existsSync(pdfPath), true, 'observed source PDF missing');

  const html = read(htmlPath);
  const libraryReadme = read('public/library/README.md');
  const manifest = JSON.parse(read('public/library/manifest.json')) as { version?: string; created_at?: string; documents?: string[] };
  const citation = read('CITATION.cff');
  const candidate = SFI_DT_001_CANONICAL_ADMISSION_CANDIDATE.candidate;

  assert.match(html, /SYSTEM FRICTION INSTITUTE<br>OFFICIAL PUBLICATION/);
  assert.match(html, /PROPOSED · ACTIVE/);
  assert.match(html, /Official Technical Proposal/);
  assert.match(html, /<html lang="es">/);
  assert.match(libraryReadme, /SFI-DT-001_Longitudinal_Observation_Framework\.html.*official institutional publication/i);
  assert.equal(manifest.version, '1.0');
  assert.equal(manifest.created_at, '2026-06-28T21:59:20.715630+00:00');
  assert.equal(manifest.documents?.includes('SFI-DT-001_Longitudinal_Observation_Framework.html'), true);

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

  const disposition = canonicalPublicationDisposition(candidate);
  assert.equal(disposition.disposition, 'BLOCK');
  assert.equal(publicProjectionForCanonicalObject(candidate), null);
  assert.equal(publicSemanticJsonLdForCanonicalObject(candidate), null);
  assert.deepEqual(researchGraphProjectionForCanonicalObjects([candidate]).nodes, []);
  assert.equal(publicResearchLandingForSlug('PUBLICATION', candidate.slug, [candidate]), null);

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-RESEARCH-CANONICAL-ADMISSION-QA-1.0',
    candidateId: candidate.id,
    observedSourceState: 'PROPOSED_ACTIVE_TECHNICAL_PROPOSAL',
    canonicalCandidateState: candidate.publicState,
    normalizedPublicationState: candidate.publication.state,
    authorIdentity: 'MISSING',
    rightsLicense: 'MISSING',
    evidenceIdentity: candidate.evidenceIdentity.state,
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
