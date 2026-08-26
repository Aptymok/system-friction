import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

const workflow = read('src/lib/evidence/evidenceCandidates.ts');
const requestEvidence = read('src/app/api/sfi/proposals/[id]/request-evidence/route.ts');
const candidateRoute = read('src/app/api/sfi/proposals/[id]/evidence-candidates/route.ts');
const acceptRoute = read('src/app/api/sfi/proposals/[id]/evidence-candidates/[candidateId]/accept/route.ts');
const rejectRoute = read('src/app/api/sfi/proposals/[id]/evidence-candidates/[candidateId]/reject/route.ts');
const externalRoute = read('src/app/api/external/v1/evidence-candidates/route.ts');
const manifest = read('src/app/api/external/v1/manifest/route.ts');
const openapi = JSON.parse(read('public/openapi.json')) as Record<string, any>;
const reviewPage = read('src/app/root/evidence-review/page.tsx');
const reviewConsole = read('src/components/sfi/RootEvidenceCandidateLane.tsx');

assert.match(requestEvidence, /searchEvidenceCandidates/, 'request_evidence must start or attempt evidence acquisition');
assert.match(requestEvidence, /review_required/, 'request_evidence must expose review-required readiness when candidates exist');
assert.match(requestEvidence, /fail-soft/, 'acquisition failure must not erase the governance decision');

assert.match(workflow, /runPublicResearch/, 'automatic evidence acquisition must reuse the governed public research capability');
assert.match(workflow, /proposalType:\s*'evidence_candidate'/, 'retrieved sources must be staged as evidence_candidate proposals');
assert.match(workflow, /decision_authority:\s*'root_only'/, 'evidence candidates must be ROOT-only decisions');
assert.match(workflow, /CANDIDATE_ONLY/, 'candidate/evidence epistemic boundary must be explicit');
assert.match(workflow, /contentHash:\s*null/, 'retrieval references must not fabricate byte/content identity');
assert.match(workflow, /REFERENCE_ONLY/, 'manual/external URL intake must remain reference-only before ROOT review');
assert.doesNotMatch(workflow, /fetch\(parsed/, 'manual URL candidate intake must not server-fetch arbitrary user supplied URLs');

assert.match(candidateRoute, /action === 'search'/, 'candidate route must support governed search/retry');
assert.match(candidateRoute, /action === 'add_url'/, 'candidate route must support manual URL staging');

assert.match(acceptRoute, /requireRootActor\('root\.evidence_candidate\.accept'\)/, 'candidate acceptance must be ROOT-only');
assert.match(acceptRoute, /new URL\('\/api\/root\/evidence'/, 'candidate acceptance must reuse the canonical root evidence writer');
assert.match(acceptRoute, /status:\s*'accepted'/, 'candidate must close as accepted only after canonical persistence');
assert.match(acceptRoute, /Acceptance does not automatically verify every claim/, 'evidence acceptance must not auto-verify source claims');

assert.match(rejectRoute, /requireRootActor\('root\.evidence_candidate\.reject'\)/, 'candidate rejection must be ROOT-only');
assert.match(rejectRoute, /status:\s*'rejected'/, 'candidate rejection must preserve a governed rejected state');

assert.match(externalRoute, /authorizeExternalRequest\(request, 'propose'\)/, 'external agents may only propose evidence candidates');
assert.match(externalRoute, /humanApprovalRequired:\s*true/, 'external evidence candidate submission must require human approval');
assert.match(externalRoute, /executionAllowed:\s*false/, 'external evidence candidate submission must never authorize execution');

assert.ok(openapi.paths?.['/api/external/v1/evidence-candidates']?.post, 'OpenAPI must advertise evidence candidate submission');
assert.equal(openapi.paths['/api/external/v1/evidence-candidates'].post['x-sfi-scope'], 'propose', 'evidence candidate GPT action must use propose scope');
assert.match(manifest, /evidence-candidate/, 'external manifest must advertise the candidate operation');
assert.match(manifest, /ROOT accept\/reject/, 'manifest must preserve ROOT evidence authority');

assert.match(reviewPage, /RootEvidenceReviewConsole/, 'ROOT must expose a dedicated evidence review route');
assert.match(reviewConsole, /ACEPTAR COMO EVIDENCIA/, 'ROOT evidence UI must provide explicit candidate acceptance');
assert.match(reviewConsole, /RECHAZAR/, 'ROOT evidence UI must provide explicit candidate rejection');
assert.match(reviewConsole, /AGREGAR URL/, 'ROOT evidence UI must permit manual candidate URLs');
assert.match(reviewConsole, /BUSCAR \/ REINTENTAR/, 'ROOT evidence UI must permit acquisition retry');

console.log(JSON.stringify({
  ok: true,
  invariants: {
    requestEvidenceStartsAcquisition: true,
    searchProducesCandidatesNotEvidence: true,
    candidateDecisionAuthority: 'ROOT_ONLY',
    canonicalEvidenceWriterReused: true,
    manualUrlReferenceOnly: true,
    externalAgentCanProposeCandidate: true,
    externalAgentCanAcceptCandidate: false,
    executionAllowedByCandidateFlow: false,
    rootReviewSurface: '/root/evidence-review',
  },
}, null, 2));
