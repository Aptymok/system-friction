import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

const casePolicy = read('src/lib/sfi/caseExecutionPolicy.ts');
const humanPolicy = read('src/lib/sfi/humanInteractionPolicy.ts');
const decisionBoundary = read('src/lib/governance/rootDecisionBoundary.ts');
const evidence = read('src/lib/evidence/evidenceCandidates.ts');
const evidenceExternal = read('src/app/api/external/v1/evidence-candidates/route.ts');
const evidenceUi = read('src/components/sfi/RootEvidenceCandidateLane.tsx');
const execute = read('src/app/api/external/v1/execute/route.ts');
const lab = read('src/app/api/external/v1/lab/route.ts');
const autoAdvance = read('src/lib/continuity/operationalAutoAdvance.ts');
const continuityRuntime = read('src/lib/continuity/runtime.ts');
const operationalNext = read('src/lib/root/interactiveOperationalNext.ts');
const heartbeat = read('src/app/api/cron/continuity-heartbeat/route.ts');
const bootstrap = read('src/app/api/external/v1/bootstrap/route.ts');
const manifest = read('src/app/api/external/v1/manifest/route.ts');
const openapiMerge = read('scripts/merge-openapi-sovereign-gates.mjs');
const finalOpenapiMerge = read('scripts/merge-openapi-authenticated-machine.mjs');
const hostBoundOpenapi = read('src/app/api/external/openapi/route.ts');
const oauthMetadata = read('src/app/.well-known/oauth-authorization-server/route.ts');
const protectedResourceMetadata = read('src/app/.well-known/oauth-protected-resource/route.ts');

for (const invariant of [
  'initialApprovalRequired: false',
  'routineWorkApprovalRequired: false',
  'evidenceSourceApprovalRequired: false',
  'methodSelectionApprovalRequired: false',
  'modelSelectionApprovalRequired: false',
  'internalExperimentApprovalRequired: false',
  'reportApprovalRequired: false',
  'caseClosureApprovalRequired: false',
]) assert.ok(casePolicy.includes(invariant), `case_policy_missing:${invariant}`);
assert.match(casePolicy, /AUTONOMOUS_UNTIL_SOVEREIGN_BOUNDARY/);
assert.match(casePolicy, /Ask the human only for a genuinely missing fact, source or choice/);

assert.match(humanPolicy, /DO_NOT_ASSUME_PROGRAMMING_OR_DATABASE_LITERACY/);
assert.match(humanPolicy, /unexplained acronyms or epistemic labels/);
assert.match(humanPolicy, /ordinary language first/);

for (const sovereign of ['INSTITUTIONAL_CHANGE', 'CAPABILITY_IMPLEMENTATION', 'LEARNING_PROMOTION', 'RESERVED_EXTERNAL_OPERATION']) {
  assert.ok(decisionBoundary.includes(`'${sovereign}'`), `sovereign_boundary_missing:${sovereign}`);
}
assert.match(decisionBoundary, /isMaterialExternalAction/);
assert.match(decisionBoundary, /return 'OPERATIONAL_WORK'/);

assert.match(evidence, /rootActionRequired: false/);
assert.doesNotMatch(evidence, /ROOT_EVIDENCE_DECISION/);
assert.match(evidence, /operational_use_allowed: true/);
assert.match(evidence, /WORKING_SOURCE_ONLY/);
assert.match(evidenceExternal, /humanApprovalRequired: false/);
assert.match(evidenceExternal, /operationalUseAllowed: true/);
assert.match(evidenceExternal, /canonicalPromotionAllowed: false/);

assert.match(evidenceUi, /ROOT DOES NOT APPROVE SOURCES/);
assert.doesNotMatch(evidenceUi, /ACCEPT AS EVIDENCE/);
assert.doesNotMatch(evidenceUi, /\/accept`/);
assert.doesNotMatch(evidenceUi, /\/reject`/);

assert.match(execute, /authorizeExternalRequest\(req, 'execute'\)/);
assert.doesNotMatch(execute, /body\.confirm !== true/);
assert.match(execute, /duplicateHumanConfirmationRequired: false/);
assert.match(execute, /proposalMustAlreadyBeQueued: true/);
assert.match(execute, /canonicalPromotionAllowed: false/);

assert.match(lab, /authorizeExternalRequest\(req, operationScope\(operation\)\)/);
assert.doesNotMatch(lab, /explicit_runtime_confirmation_required/);
assert.match(lab, /duplicateHumanConfirmationRequired: false/);

assert.match(autoAdvance, /classifyProposalDecisionBoundary/);
assert.match(autoAdvance, /decisionClass !== 'OPERATIONAL_WORK'/);
assert.match(autoAdvance, /decisionAuthority: 'controller'/);
assert.match(autoAdvance, /queueApprovedProposal/);
assert.match(autoAdvance, /dispatchQueuedProposal/);
assert.match(autoAdvance, /canonicalPromotionAllowed: false/);

assert.doesNotMatch(continuityRuntime, /ROOT must review candidates before persistence/);
assert.doesNotMatch(continuityRuntime, /evidence_accept_reject/);
assert.doesNotMatch(continuityRuntime, /proposal_accept_reject/);
assert.match(continuityRuntime, /evidence_classification_for_working_use/);
assert.match(continuityRuntime, /operational_authorization_and_queue/);
assert.match(continuityRuntime, /reserved_external_operation/);
assert.match(continuityRuntime, /owner: 'transition_watchdog'.*RETURN_RECONCILIATION/);

assert.doesNotMatch(operationalNext, /ROOT_EVIDENCE_DECISION/);
assert.doesNotMatch(operationalNext, /ROOT_CLOSE_OR_CANON_REVIEW/);
assert.match(operationalNext, /READY_TO_CLOSE/);
assert.match(operationalNext, /no es una aprobación/);
assert.match(operationalNext, /RESERVED_EXTERNAL_OPERATION/);

assert.match(heartbeat, /runOperationalAutoAdvance/);
assert.match(heartbeat, /operationalAutoAdvance/);
assert.match(heartbeat, /Routine evidence review, risk assessment, operational authorization, execution, RETURN, calibration and methodological closure proceed without founder approval/);

assert.match(bootstrap, /caseExecutionPolicy: SFI_CASE_EXECUTION_POLICY/);
assert.match(bootstrap, /decisionBoundary: SFI_ROOT_DECISION_BOUNDARY/);
assert.match(bootstrap, /Do not ask the human for initial approval/);
assert.match(bootstrap, /gptActionsOpenApi: '\/openapi\.json'/);
assert.match(bootstrap, /separateActionsProjection: false/);
assert.match(manifest, /working sources without ROOT source approval/);
assert.match(manifest, /no duplicate human confirmation is required/);
assert.match(openapiMerge, /AUTONOMOUS_UNTIL_SOVEREIGN_BOUNDARY/);
assert.match(openapiMerge, /required\.filter\(\(name\) => name !== 'confirm'\)/);
assert.match(openapiMerge, /classify and use as a working source without ROOT approval/);
assert.match(openapiMerge, /canonical evidence admission only when an explicit governed promotion boundary is crossed/);
assert.doesNotMatch(openapiMerge, /ROOT accept\/reject/);

// GPT Actions consumes one canonical OpenAPI document. OAuth stays declared in
// that document; authenticated MCP remains a separate protocol surface.
assert.match(finalOpenapiMerge, /const canonicalOrigin = 'https:\/\/www\.systemfriction\.org'/);
assert.match(finalOpenapiMerge, /gptActionsSchema: '\/openapi\.json'/);
assert.match(finalOpenapiMerge, /delete api\.paths\['\/api\/mcp\/authenticated'\]/);
assert.match(finalOpenapiMerge, /parameter\?\.in !== 'header'/);
assert.match(finalOpenapiMerge, /oauthSecurityDeclared/);
assert.match(finalOpenapiMerge, /separateActionsProjection: false/);
assert.doesNotMatch(finalOpenapiMerge, /openapi-actions\.json/);
assert.match(hostBoundOpenapi, /const SFI_ACTIONS_ORIGIN = 'https:\/\/www\.systemfriction\.org'/);
assert.match(hostBoundOpenapi, /authorizationCode\.authorizationUrl/);
assert.match(hostBoundOpenapi, /authorizationCode\.tokenUrl/);
assert.doesNotMatch(hostBoundOpenapi, /delete document\.components\.securitySchemes\.sfiOAuth/);
assert.ok(oauthMetadata.includes("const PUBLIC_ORIGIN = 'https://www.systemfriction.org'"), 'oauthMetadata must declare expected PUBLIC_ORIGIN');
assert.ok(oauthMetadata.includes("const WORKPLACE_ORIGIN = 'https://system-friction.vercel.app'"), 'oauthMetadata must declare expected WORKPLACE_ORIGIN');
assert.match(oauthMetadata, /requestedOrigin === WORKPLACE_ORIGIN/, 'OAuth issuer must match an explicitly allowed origin');
assert.ok(protectedResourceMetadata.includes("const PUBLIC_ORIGIN = 'https://www.systemfriction.org'"), 'protectedResourceMetadata must declare expected PUBLIC_ORIGIN');
assert.ok(protectedResourceMetadata.includes("const WORKPLACE_ORIGIN = 'https://system-friction.vercel.app'"), 'protectedResourceMetadata must declare expected WORKPLACE_ORIGIN');
assert.match(protectedResourceMetadata, /requestedOrigin === WORKPLACE_ORIGIN/, 'MCP resource audience must be bounded to an allowlisted origin');

// Legacy HTTP mutators must not bypass the authenticated governance boundary.
const amvChat = read('src/app/api/amv/chat/route.ts');
const paidAi = read('src/app/api/ai/route.ts');
const proposalAlign = read('src/app/api/sfi/proposals/[id]/align/route.ts');
assert.match(amvChat, /await requireAuthenticatedUser\(\)/, 'AMV writes require a real server-side session');
assert.match(amvChat, /sessionId: \`\$\{userId\}:\$\{input\.sessionId\}\`/, 'AMV transient memory must be isolated by authenticated owner');
assert.match(amvChat, /listAmvMemoryReferences\(\{ module: ownedInput\.module, sessionId: ownedInput\.sessionId/, 'AMV memory reads must use owner-scoped session');
assert.ok(amvChat.indexOf('await requireAuthenticatedUser()') < amvChat.indexOf('saveAmvMemory(result.memoryDelta)'), 'AMV must authorize before storing memory');
assert.match(paidAi, /await requireAuthenticatedUser\(\)/, 'legacy AI provider endpoint cannot be public');
assert.ok(paidAi.indexOf('await requireAuthenticatedUser()') < paidAi.indexOf('runAiTask({'), 'AI must authorize before paying a provider');
assert.match(paidAi, /checkRateLimit\(rateLimitKey\('legacy-ai-provider', userId\), 6, 60_000\)/, 'legacy provider has bounded per-user request volume');
assert.match(paidAi, /input\.length > 4_000/, 'AI provider input must be bounded');
assert.match(proposalAlign, /await requireGovernedActor\('acp\.proposals\.align'\)/, 'proposal alignment must use the governed actor gate');
assert.match(proposalAlign, /resolveProposalReviewerAuthority\(gate\.ctx\)/, 'proposal alignment must authorize a ROOT or controller reviewer');
assert.match(proposalAlign, /controllerCanDecideProposal\(proposal\)/, 'controller must not align sovereign-only proposals');
assert.ok(proposalAlign.indexOf('await requireGovernedActor(') < proposalAlign.indexOf(".from('sfi_proposal_alignment')"), 'proposal alignment must be authorized before writing');

// Public legacy endpoints must not allow anonymous institutional ledger writes.
const sfiEventRoute = read('src/app/api/sfi/events/route.ts');
const sfiRunRoute = read('src/app/api/sfi/run/route.ts');
assert.match(sfiEventRoute, /requireRootViewer\('root\.sfi\.events\.read'\)/, 'SFI ledger read requires ROOT observer');
assert.match(sfiEventRoute, /requireRootActor\('root\.sfi\.events\.append'\)/, 'SFI ledger write requires ROOT');
assert.ok(sfiEventRoute.indexOf("requireRootActor('root.sfi.events.append')") < sfiEventRoute.indexOf('await request.json()'), 'SFI events must authorize before parsing and appending');
assert.match(sfiEventRoute, /actorId: gate\.ctx\.user\.id/, 'SFI event appends require verified actor attribution');
assert.match(sfiRunRoute, /requireRootActor\('root\.sfi\.run\.execute'\)/, 'SFI run requires ROOT before executing');
assert.ok(sfiRunRoute.indexOf("requireRootActor('root.sfi.run.execute')") < sfiRunRoute.indexOf('await execute(input'), 'SFI run must authorize before pipeline side effects');
const sfiRunGet = sfiRunRoute.split('export async function GET() {')[1]?.split('export async function POST')[0] ?? '';
assert.match(sfiRunGet, /status: 405/, 'SFI run GET must reject execution');
assert.doesNotMatch(sfiRunGet, /await execute\(/, 'GET may not persist pipeline work');


// MOPH sessions use server-verified account ownership even with service-role storage.
const mophSessionRoute = read('src/app/api/moph/session/route.ts');
const mophSessionIdRoute = read('src/app/api/moph/session/[id]/route.ts');
const mophSessionStore = read('src/lib/moph/session-store.ts');
assert.equal((mophSessionRoute.match(/await requireAuthenticatedUser\(\)/g) ?? []).length, 2, 'MOPH writes and query reads require authentication');
assert.match(mophSessionIdRoute, /await requireAuthenticatedUser\(\)/, 'MOPH direct-id reads require authentication');
assert.match(mophSessionRoute, /account_consent_required/, 'anonymous persistence cannot silently create a user-owned record');
assert.match(mophSessionStore, /account_id: ownerId/, 'MOPH writes record verified account ownership');
assert.match(mophSessionStore, /function ownedSessionKey\(sessionKey: string, ownerId: string\)/, 'MOPH keys are namespaced per owner');
assert.match(mophSessionStore, /\.eq\('account_id', ownerId\)/, 'MOPH service-role reads must filter account ownership');
assert.match(mophSessionStore, /fallbackStore\(\)\.get\(storageKey\)/, 'MOPH fallback reads are owner-isolated');


// AMV learning was previously a public append into ROOT-visible logbook and an unguarded thought stream.
// Internal server-to-server library consumers remain unchanged; the external HTTP boundary is ROOT governed.
const amvLearningAppendRoute = read('src/app/api/amv/learning/append/route.ts');
const amvThoughtStreamRoute = read('src/app/api/amv/thoughts/live/route.ts');
assert.match(amvLearningAppendRoute, /requireRootActor\('root\.amv\.learning\.append'\)/, 'AMV learning writes require authenticated ROOT actor');
assert.ok(amvLearningAppendRoute.indexOf("requireRootActor('root.amv.learning.append')") < amvLearningAppendRoute.indexOf('await request.json()'), 'AMV append authorization must precede body parsing');
assert.ok(amvLearningAppendRoute.indexOf("requireRootActor('root.amv.learning.append')") < amvLearningAppendRoute.indexOf('await appendAmvLearning('), 'AMV append authorization must precede persistence');
assert.match(amvLearningAppendRoute, /MAX_BODY_BYTES = 16_384/, 'AMV append payloads must be bounded');
assert.match(amvThoughtStreamRoute, /requireRootViewer\('root\.amv\.thoughts\.read'\)/, 'AMV private thought stream requires verified ROOT observer');
assert.ok(amvThoughtStreamRoute.indexOf("requireRootViewer('root.amv.thoughts.read')") < amvThoughtStreamRoute.indexOf('await readAmvThoughts('), 'AMV thought stream cannot read before authorization');
assert.match(amvThoughtStreamRoute, /'Cache-Control': 'private, no-store'/, 'AMV private thought stream must not be cached');


// Legacy MOPH agent reads service-role AMV memory and invokes paid model providers.
const mophAgentRoute = read('src/app/api/agentic/moph/route.ts');
const mophAgentImpl = read('src/lib/agents/sfiAgents.ts');
assert.match(mophAgentRoute, /requireRootActor\('root\.moph\.agent\.read'\)/, 'MOPH institutional memory requires verified ROOT');
assert.ok(mophAgentRoute.indexOf("requireRootActor('root.moph.agent.read')") < mophAgentRoute.indexOf('await request.json()'), 'MOPH must authorize before reading input');
assert.ok(mophAgentRoute.indexOf("requireRootActor('root.moph.agent.read')") < mophAgentRoute.indexOf("rpc('sfi_admit_legacy_ai_request_v1'"), 'MOPH must authorize before counting AI requests');
assert.ok(mophAgentRoute.indexOf("rpc('sfi_admit_legacy_ai_request_v1'") < mophAgentRoute.indexOf('await runMophAgent('), 'MOPH must pass distributed admission before provider work');
assert.match(mophAgentRoute, /accountId: gate\.ctx\.user\.id/, 'MOPH account identity comes from verified session, never the request');
assert.doesNotMatch(mophAgentRoute, /payload\.accountId/, 'MOPH must not trust client-supplied account identity');
assert.match(mophAgentRoute, /MAX_BODY_BYTES = 8_192/, 'MOPH input size is bounded');
assert.match(mophAgentRoute, /'Cache-Control': 'private, no-store'/, 'MOPH result is private');
const mophAgentBlock = mophAgentImpl.split('export async function runMophAgent')[1]?.split('export async function runPredictionAgent')[0] ?? '';
assert.match(mophAgentBlock, /persistence: 'not_persisted'/, 'MOPH trace must not fabricate persisted state');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-SOVEREIGN-ONLY-HUMAN-GATES-1.9',
  humanApprovalRequiredForRoutineCaseWork: false,
  humanApprovalRequiredForWorkingSources: false,
  humanApprovalRequiredForRoutineLabRun: false,
  duplicateExecutionConfirmationRequired: false,
  obsoleteRoutineHumanGatesPresent: false,
  gptActionsSchema: '/openapi.json',
  actionsApiOrigin: 'https://www.systemfriction.org',
  actionsOAuthDeclaredInOpenApi: true,
  actionsMcpExposed: false,
  oauthIssuer: 'https://www.systemfriction.org',
  protectedResourceOrigin: 'https://www.systemfriction.org',
  sovereignBoundary: ['INSTITUTIONAL_CHANGE', 'CAPABILITY_IMPLEMENTATION', 'LEARNING_PROMOTION', 'RESERVED_EXTERNAL_OPERATION'],
  plainLanguageDefault: true,
  canonicalPromotionAutomatic: false,
}, null, 2));