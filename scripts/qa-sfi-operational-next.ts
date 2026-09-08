import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

const lifecycle = read('src/lib/governance/proposalLifecycle.ts');
const boundary = read('src/lib/governance/rootDecisionBoundary.ts');
const next = read('src/lib/root/operationalNext.ts');
const humanQueue = read('src/lib/root/actionableHumanQueue.ts');
const decisions = read('src/app/api/root/decisions/route.ts');
const rootServer = read('src/lib/root/server.ts');
const externalPropose = read('src/app/api/external/v1/propose/route.ts');
const caseOperational = read('src/core/case-platform/operational.ts');
const caseRoute = read('src/app/api/cases/[caseId]/route.ts');
const operatingUi = read('src/components/sfi/SfiOperatingWorkspace.tsx');
const universalEmpirical = read('src/lib/sfi/universalEmpiricalContinuation.ts');
const universalSignal = read('src/lib/sfi/universalSignalCycle.ts');
const learningRoute = read('src/app/api/root/learning/route.ts');
const workboardRoute = read('src/app/api/root/workboard/route.ts');

assert.match(lifecycle, /canonical_promotion_allowed:\s*false/, 'ordinary governance decisions must never grant canonical promotion');
assert.match(lifecycle, /canonicalPromotionAllowed:\s*false/, 'proposal outcome must keep canonical promotion closed');

for (const decisionClass of ['INSTITUTIONAL_CHANGE','CAPABILITY_IMPLEMENTATION','LEARNING_PROMOTION']) {
  assert.ok(boundary.includes(`'${decisionClass}'`), `missing sovereign decision class: ${decisionClass}`);
}
assert.match(boundary, /OPERATIONAL_WORK/, 'routine work must have a non-sovereign class');
assert.match(boundary, /Generic external\/twin\/evidence/, 'generic proposal text must not infer sovereign authority');
assert.match(boundary, /LEARNING_CANDIDATE_CAPTURE/, 'learning capture must remain non-sovereign until promotion');

assert.match(externalPropose, /human_approval_required: humanApprovalRequired/, 'external proposals must not force human approval globally');
assert.match(externalPropose, /CONTINUE_WITHIN_EXISTING_AUTHORITY/, 'routine proposal work must continue under existing authority');
assert.doesNotMatch(externalPropose, /human_approval_required:\s*true/, 'external proposal gateway must not hard-code ROOT approval');

assert.match(next, /classifyProposalDecisionBoundary/, 'operational-next must use the narrow decision boundary');
assert.match(next, /owner: 'evidence_hunter'/, 'missing evidence must remain machine-owned when acquirable');
assert.match(next, /owner: 'evidence_assessment'/, 'evidence classification must not be a sovereign accept\/deny gate');
assert.match(next, /SFI continúa dentro de la autoridad existente/, 'routine work must expose automatic continuation');
assert.match(next, /HUMAN_INPUT_AVAILABLE_OR_REQUIRED/, 'missing human input must be state\/notification, not approval');
assert.match(next, /rootActionRequired: false[\s\S]*Aportar un insumo si lo tienes|rootActionRequired: false[\s\S]*Falta un dato o fuente/, 'human input must not become ROOT approval');
assert.match(next, /OPERATIONAL_CLOSURE_OR_SEPARATE_LEARNING_PROMOTION/, 'closure and learning promotion must be separate states');
assert.doesNotMatch(next, /ROOT_EVIDENCE_DECISION/, 'evidence review must not route to ROOT');
assert.doesNotMatch(next, /ROOT_CLOSE_OR_CANON_REVIEW/, 'routine close must not route to ROOT');

assert.match(humanQueue, /actionableReportDecisions: 0/, 'reports must never count as sovereign decisions');
assert.match(humanQueue, /actionableCycleDecisions: 0/, 'cycles must never count as sovereign decisions');
assert.match(humanQueue, /ROOT_DECISION_CLASSES/, 'human queue must be sovereign-class constrained');
assert.match(humanQueue, /SFI continúa este trabajo dentro de la autoridad existente/, 'operational work must be visible but not approvable');

assert.match(decisions, /classifyProposalDecisionBoundary/, 'ROOT decision writer must verify sovereign class');
assert.match(decisions, /operational_work_is_not_a_root_decision/, 'routine proposal decisions must fail closed at ROOT writer');
assert.match(decisions, /report_is_not_a_sovereign_decision/, 'reports must not support ROOT accept\/deny');
assert.match(decisions, /candidate_capture_is_not_a_sovereign_decision/, 'candidate capture must not support ROOT accept\/deny');
assert.match(decisions, /reports: \[\]/, 'reports must be absent from sovereign queue');
assert.match(decisions, /fdre: \[\]/, 'unpromoted institutional-memory candidates must be absent from sovereign queue');

assert.match(caseOperational, /closedRequiresAwaitingUserClose: false/, 'case closure must not require AWAITING_USER_CLOSE');
assert.match(caseOperational, /finalClosureRequiresExplicitUserDecision: false/, 'routine case closure must not require a user decision');
assert.match(caseOperational, /routineClosureIsAutonomous: true/, 'case platform must declare autonomous routine closure');
assert.match(caseOperational, /awaitingUserCloseIsLegacyReadOnlyState: true/, 'legacy close state must remain reconstructable only');
assert.match(caseRoute, /legacy_state_not_enterable/, 'new routine case flow must not enter AWAITING_USER_CLOSE');
assert.match(caseRoute, /requiresUserDecision: false/, 'case readback must not tell the user to approve closure');
assert.doesNotMatch(caseRoute, /reportDecision/, 'case API must not expose report accept\/deny closure middleware');

assert.match(universalEmpirical, /closeUniversalCycle\(/, 'empirically complete universal cycles must close autonomously');
assert.match(universalEmpirical, /CLOSED_AUTONOMOUSLY/, 'autonomous closure must be an explicit observed state');
assert.match(universalEmpirical, /LEARNING_PROMOTION_REMAINS_ROOT_GATED/, 'closure must not promote learning automatically');
assert.match(universalEmpirical, /recordUniversalLearningCandidate/, 'closed calibrated cycles may produce quarantined learning candidates');
assert.doesNotMatch(universalEmpirical, /state: 'AWAITING_USER_CLOSE'/, 'new empirical continuation must not wait for user close');
assert.match(universalSignal, /closureBoundary/, 'closure receipt must preserve its epistemic boundary');

assert.match(learningRoute, /requireRootActor\(`learning_quarantine\.\$\{action\}`\)/, 'learning promotion\/rejection remains ROOT governed');
assert.match(learningRoute, /action === 'promote'/, 'learning promotion path must remain explicit');
assert.match(learningRoute, /action === 'reject'/, 'learning rejection path must remain explicit');

assert.doesNotMatch(operatingUi, /reportDecision/, 'human UI must not send report accept\/deny to case API');
assert.doesNotMatch(operatingUi, /decideCase/, 'case UI must not contain a routine close decision handler');
assert.doesNotMatch(operatingUi, /decideCycle/, 'cycle UI must not contain a routine close decision handler');
assert.doesNotMatch(operatingUi, /ACEPTAR Y CERRAR/, 'routine close button must be removed');
assert.doesNotMatch(operatingUi, /DENEGAR REPORTE/, 'routine report denial button must be removed');
assert.match(operatingUi, /SFI trabaja de forma autónoma dentro de su autoridad/, 'Observatory UI must explain autonomy plainly');
assert.match(operatingUi, /ACEPTAR APRENDIZAJE/, 'learning promotion remains a visible human decision');

assert.match(workboardRoute, /requireRootActor\('root\.workboard\.decide'\)/, 'legacy workboard POST must still pass the central authority gate until physically removed');
assert.match(rootServer, /RETIRED_ROOT_APPROVAL_ACTIONS/, 'retired routine approval actions must be centrally blocked');
assert.match(rootServer, /'root\.workboard\.decide'/, 'legacy report-close route must be unreachable');
assert.match(rootServer, /routine_root_approval_action_retired/, 'retired gate must return an explicit migration error');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-AUTONOMOUS-OPERATION-ROOT-BOUNDARY-2.0',
  invariants: {
    rootIsNotWorkflowMiddleware: true,
    onlyThreeSovereignDecisionClasses: true,
    evidenceWorkIsOperational: true,
    reportUseIsOperational: true,
    routineCaseCloseIsAutonomous: true,
    routineCycleCloseIsAutonomous: true,
    closureDoesNotPromoteLearning: true,
    learningPromotionRemainsRootGated: true,
    capabilityMaterialChangeRemainsRootGated: true,
    institutionalChangeRemainsRootGated: true,
    legacyManualCloseRouteIsAuthorityRetired: true,
    observatoryRemainsReadableWithoutBecomingScheduler: true,
  },
}, null, 2));
