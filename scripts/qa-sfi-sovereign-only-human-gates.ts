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

// GPT Actions use the institutional domain for API calls but keep OAuth on the
// stable Vercel project hostname already registered by the existing GPT client.
assert.match(actionsProjection, /const apiOrigin = 'https:\/\/systemfriction\.org'/);
assert.match(actionsProjection, /const oauthOrigin = 'https:\/\/system-friction\.vercel\.app'/);
assert.match(actionsProjection, /authorizationUrl = `\$\{oauthOrigin\}\/api\/oauth\/authorize`/);
assert.match(actionsProjection, /tokenUrl = `\$\{oauthOrigin\}\/api\/oauth\/token`/);
assert.match(oauthMetadata, /const issuer = 'https:\/\/system-friction\.vercel\.app'/);
assert.match(protectedResourceMetadata, /const oauthIssuer = 'https:\/\/system-friction\.vercel\.app'/);
assert.match(protectedResourceMetadata, /const resourceOrigin = 'https:\/\/systemfriction\.org'/);

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-SOVEREIGN-ONLY-HUMAN-GATES-1.3',
  humanApprovalRequiredForRoutineCaseWork: false,
  humanApprovalRequiredForWorkingSources: false,
  humanApprovalRequiredForRoutineLabRun: false,
  duplicateExecutionConfirmationRequired: false,
  obsoleteRoutineHumanGatesPresent: false,
  actionsApiOrigin: 'https://systemfriction.org',
  oauthIssuer: 'https://system-friction.vercel.app',
  sovereignBoundary: ['INSTITUTIONAL_CHANGE', 'CAPABILITY_IMPLEMENTATION', 'LEARNING_PROMOTION', 'RESERVED_EXTERNAL_OPERATION'],
  plainLanguageDefault: true,
  canonicalPromotionAutomatic: false,
}, null, 2));
