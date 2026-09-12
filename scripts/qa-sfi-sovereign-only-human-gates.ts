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
const actionsProjection = read('scripts/merge-openapi-actions-compat.mjs');
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

assert.match(evidenceUi, /ROOT NO APRUEBA FUENTES/);
assert.doesNotMatch(evidenceUi, /ACEPTAR COMO EVIDENCIA/);
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
assert.match(manifest, /working sources without ROOT source approval/);
assert.match(manifest, /no duplicate human confirmation is required/);
assert.match(openapiMerge, /AUTONOMOUS_UNTIL_SOVEREIGN_BOUNDARY/);
assert.match(openapiMerge, /required\.filter\(\(name\) => name !== 'confirm'\)/);
assert.match(openapiMerge, /classify and use as a working source without ROOT approval/);
assert.match(openapiMerge, /canonical evidence admission only when an explicit governed promotion boundary is crossed/);
assert.doesNotMatch(openapiMerge, /ROOT accept\/reject/);

// GPT Actions uses OAuth configured in the GPT editor. The Actions OpenAPI is a
// transport-neutral projection of the External Agent Gateway only; canonical
// OpenAPI/runtime retains OAuth declarations and the MCP nonce boundary.
assert.match(actionsProjection, /const canonicalOrigin = 'https:\/\/www\.systemfriction\.org'/);
assert.match(actionsProjection, /const apiOrigin = canonicalOrigin/);
assert.match(actionsProjection, /delete api\.security/);
assert.match(actionsProjection, /delete api\.components\.securitySchemes\.sfiOAuth/);
assert.match(actionsProjection, /delete operation\.security/);
assert.match(actionsProjection, /if \(!route\.startsWith\('\/api\/external\/v1\/'\)\) delete api\.paths\[route\]/);
assert.match(actionsProjection, /authTransportOwner: 'GPT_ACTION_EDITOR_OAUTH'/);
assert.match(actionsProjection, /openApiOAuthDeclarationsExcluded: true/);
assert.match(actionsProjection, /mcpExcluded: true/);
assert.match(actionsProjection, /SFI_CANONICAL_OPENAPI_OAUTH_SCHEME_MISSING/);
assert.match(actionsProjection, /SFI_CANONICAL_OPENAPI_MCP_NONCE_PARAMETER_MISSING/);
assert.match(oauthMetadata, /const issuer = 'https:\/\/www\.systemfriction\.org'/);
assert.match(protectedResourceMetadata, /const oauthIssuer = 'https:\/\/www\.systemfriction\.org'/);
assert.match(protectedResourceMetadata, /const resourceOrigin = 'https:\/\/www\.systemfriction\.org'/);

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-SOVEREIGN-ONLY-HUMAN-GATES-1.5',
  humanApprovalRequiredForRoutineCaseWork: false,
  humanApprovalRequiredForWorkingSources: false,
  humanApprovalRequiredForRoutineLabRun: false,
  duplicateExecutionConfirmationRequired: false,
  obsoleteRoutineHumanGatesPresent: false,
  actionsApiOrigin: 'https://www.systemfriction.org',
  actionsAuthTransportOwner: 'GPT_ACTION_EDITOR_OAUTH',
  actionsMcpExposed: false,
  oauthIssuer: 'https://www.systemfriction.org',
  protectedResourceOrigin: 'https://www.systemfriction.org',
  sovereignBoundary: ['INSTITUTIONAL_CHANGE', 'CAPABILITY_IMPLEMENTATION', 'LEARNING_PROMOTION', 'RESERVED_EXTERNAL_OPERATION'],
  plainLanguageDefault: true,
  canonicalPromotionAutomatic: false,
}, null, 2));