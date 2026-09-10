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
assert.match(requestEvidence, /readEvidenceReadiness/, 'request_evidence must expose slot-aware readiness');
assert.match(requestEvidence, /evidenceJobId/, 'request_evidence must expose the generated acquisition job');
assert.match(requestEvidence, /nextExpectedEvent/, 'request_evidence must declare what event is expected next');
assert.match(requestEvidence, /rootActionRequired/, 'request_evidence must expose whether a sovereign decision is required');

assert.match(workflow, /runPublicResearch/, 'automatic evidence acquisition must reuse the governed public research capability');
assert.match(workflow, /proposalType:\s*'evidence_candidate'/, 'retrieved sources must be staged as traceable evidence candidates');
assert.match(workflow, /decision_authority:\s*'controller'/, 'working source intake must remain operational');
assert.match(workflow, /human_approval_required:\s*false/, 'working source intake must not require founder approval');
assert.match(workflow, /operational_use_allowed:\s*true/, 'working sources must be usable for ordinary analysis');
assert.match(workflow, /WORKING_SOURCE_ONLY/, 'working-source epistemic boundary must be explicit');
assert.match(workflow, /contentHash:\s*null/, 'retrieval references must not fabricate byte/content identity');
assert.match(workflow, /REFERENCE_ONLY/, 'manual URL intake must remain reference-only when content was not fetched');
assert.doesNotMatch(workflow, /ROOT_EVIDENCE_DECISION/, 'ordinary evidence readiness must not route to ROOT');
assert.match(workflow, /rootActionRequired: false/, 'source review must not create a sovereign human task');
assert.doesNotMatch(workflow, /fetch\(parsed/, 'manual URL intake must not server-fetch arbitrary user supplied URLs');
assert.match(workflow, /export type EvidenceSlot/, 'evidence requirements must be represented as visible slots');
for (const source of ['ENOE', 'DENUE', 'EMEC', 'INPC']) assert.ok(workflow.includes(`key: '${source}'`), `INEGI slot inference missing: ${source}`);
for (const state of ['MISSING', 'CANDIDATE', 'ACCEPTED']) assert.ok(workflow.includes(`'${state}'`), `evidence slot state missing: ${state}`);
assert.match(workflow, /usable === slots\.length/, 'all traceable working-source slots must be able to satisfy operational readiness');
assert.match(workflow, /expected_field_delta->payload->>parentProposalId/, 'evidence candidate lookup must scope by parent');

assert.match(candidateRoute, /action === 'search'/, 'candidate route must support governed search/retry');
assert.match(candidateRoute, /action === 'add_url'/, 'candidate route must support manual URL staging');
assert.match(candidateRoute, /evidenceReadiness/, 'candidate route must return slot readiness');

// Legacy ROOT acceptance/rejection remains available only when an explicit
// canonical evidence admission is actually desired. It is not part of ordinary
// case readiness anymore.
assert.match(acceptRoute, /requireRootActor\('root\.evidence_candidate\.accept'\)/, 'canonical evidence admission must remain ROOT-only');
assert.match(acceptRoute, /new URL\('\/api\/root\/evidence'/, 'canonical acceptance must reuse the canonical evidence writer');
assert.match(acceptRoute, /Acceptance does not automatically verify every claim/, 'canonical source admission must not auto-verify source claims');
assert.match(acceptRoute, /canonicalPromotionAllowed:\s*false/, 'canonical evidence admission must not grant canon promotion');
assert.match(rejectRoute, /requireRootActor\('root\.evidence_candidate\.reject'\)/, 'explicit canonical rejection remains ROOT-only');
assert.match(rejectRoute, /canonicalPromotionAllowed:\s*false/, 'candidate rejection must not mutate canon authority');

assert.match(externalRoute, /authorizeExternalRequest\(request, 'propose'\)/, 'external source registration must remain scoped');
assert.match(externalRoute, /humanApprovalRequired:\s*false/, 'external working source submission must not require human approval');
assert.match(externalRoute, /operationalUseAllowed:\s*true/, 'external working source must be usable for bounded analysis');
assert.match(externalRoute, /executionAllowed:\s*false/, 'source registration must never authorize execution');
assert.match(externalRoute, /canonicalPromotionAllowed:\s*false/, 'source registration must never promote canon');

assert.ok(openapi.paths?.['/api/external/v1/evidence-candidates']?.post, 'OpenAPI must advertise evidence candidate submission');
assert.equal(openapi.paths['/api/external/v1/evidence-candidates'].post['x-sfi-scope'], 'propose', 'evidence candidate GPT action must use propose scope');
assert.match(manifest, /working sources without ROOT source approval/, 'manifest must publish operational source-use authority');

assert.match(reviewPage, /RootEvidenceReviewConsole/, 'legacy canonical evidence review route may remain available');
assert.match(reviewConsole, /ROOT NO APRUEBA FUENTES/, 'default ROOT evidence UI must state that ordinary source review is not a founder task');
assert.doesNotMatch(reviewConsole, /ACEPTAR COMO EVIDENCIA/, 'default evidence lane must not expose routine acceptance control');
assert.doesNotMatch(reviewConsole, />RECHAZAR</, 'default evidence lane must not expose routine rejection control');
assert.match(reviewConsole, /AGREGAR URL/, 'evidence UI may permit optional source contribution');
assert.match(reviewConsole, /BUSCAR \/ REINTENTAR/, 'evidence UI must permit acquisition retry');
assert.match(reviewConsole, /NECESIDAD DE EVIDENCIA/, 'evidence UI must show what information is needed');
assert.match(reviewConsole, /Tu intervención: ninguna por revisión de fuentes/, 'evidence UI must state the human boundary plainly');

console.log(JSON.stringify({
  ok: true,
  invariants: {
    requestEvidenceStartsAcquisition: true,
    workingSourceCanSupportOperationalReadiness: true,
    evidenceSlotsVisible: true,
    sourceReviewHumanApprovalRequired: false,
    canonicalEvidenceAdmissionStillRootOnly: true,
    manualUrlReferenceOnly: true,
    externalAgentCanRegisterWorkingSource: true,
    externalAgentCanPromoteCanon: false,
    executionAllowedBySourceFlow: false,
  },
}, null, 2));
