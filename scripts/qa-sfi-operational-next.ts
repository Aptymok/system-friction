import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

const lifecycle = read('src/lib/governance/proposalLifecycle.ts');
const authority = read('src/lib/governance/proposalDecisionAuthority.ts');
const common = read('src/lib/operational/common.ts');
const next = read('src/lib/root/operationalNext.ts');
const workboardApi = read('src/app/api/root/workboard/route.ts');
const workboardUi = read('src/components/sfi/RootOperationalWorkboard.tsx');
const continuity = read('src/lib/continuity/runtime.ts');
const heartbeat = read('src/app/api/cron/continuity-heartbeat/route.ts');
const heartbeatWorkflow = read('.github/workflows/sfi-continuity-hourly.yml');
const queue = read('src/lib/governance/proposalQueue.ts');
const router = read('src/lib/execution/governedExecutionRouter.ts');
const evidence = read('src/lib/evidence/evidenceCandidates.ts');
const universalContinuation = read('src/lib/sfi/universalCycleContinuation.ts');
const universalReturnCapability = read('src/lib/sfi/universalReturnCapabilityResolver.ts');
const universalReturnPlanUpgrade = read('src/lib/sfi/universalReturnPlanUpgrade.ts');
const universalEmpirical = read('src/lib/sfi/universalEmpiricalContinuation.ts');
const cognitiveCycle = read('src/lib/sfi/cognitive-runtime/cognitiveCycle.ts');
const runtimeAgentExecutor = read('src/lib/sfi/cognitive-runtime/runtimeAgentExecutor.ts');
const agentLlmClient = read('src/infrastructure/ai/agentLlmClient.ts');
const runtimeTwinMaterializer = read('src/lib/institution/cognitiveSpineRuntimeMaterializer.ts');
const adaptiveLearning = read('src/core/cognitive-twin/adaptiveLearningContext.ts');
const vercel = JSON.parse(read('vercel.json')) as { crons?: Array<{ path?: string }> };

assert.match(lifecycle, /canonical_promotion_allowed:\s*false/, 'ordinary governance decisions must never grant canonical promotion');
assert.match(lifecycle, /canonicalPromotionAllowed:\s*false/, 'proposal outcome patch must keep canonical promotion closed');
assert.doesNotMatch(lifecycle, /canonical_promotion_allowed:\s*authority === 'root'/, 'ROOT identity alone must never become standing canon permission');
assert.match(queue, /canonicalPromotionAllowed: false/, 'queue authorization must remain non-canonical');

assert.match(common, /export type ProposalRiskLevel/, 'proposal risk writer contract missing');
assert.match(common, /updateActionProposalRisk/, 'risk assessment must have one operational writer');
assert.match(common, /MISSING_INPUT_FOR_RISK/, 'unassessable risk must be explicit instead of staying unknown forever');
assert.match(authority, /risk === 'unassessable'/, 'unassessable proposals must fail closed to ROOT authority');

for (const token of ['nextExpectedEvent', 'owner', 'blocker', 'rootActionRequired']) {
  assert.ok(next.includes(token), `operational next-state contract missing: ${token}`);
}
assert.match(next, /status === 'waiting_evidence'/, 'waiting_evidence must have a derived next event');
assert.match(next, /owner: 'evidence_hunter'/, 'waiting evidence acquisition must be machine-owned');
assert.match(next, /ROOT_EVIDENCE_DECISION/, 'candidate review must explicitly hand authority back to ROOT');
assert.match(next, /ROOT_ACCEPT_OR_REJECT_PROPOSAL/, 'satisfied evidence must request a separate proposal decision');
assert.match(next, /status === 'queued'/, 'queued proposals must declare executor next work');
assert.match(next, /SFI_PROPOSAL_RETURN_RECORDED/, 'queued proposals must expect RETURN rather than manual status mutation');
assert.match(next, /LEGACY_ACCEPTED_WITHOUT_OBSERVED_RETURN/, 'legacy accepted-without-return debt must be visible');
assert.match(next, /READY_TO_CLOSE/, 'open universal cycles with observed RETURN must expose closure readiness');
assert.match(next, /COGNITION_CONTINUING/, 'interrupted cognition must be visible as machine-owned continuation');
assert.match(next, /COGNITION_PENDING/, 'unfinished cognition must not be mislabeled as RETURN waiting');
assert.match(next, /SYNTHESIS_PENDING/, 'completed cognition without current synthesis must remain machine-owned');
assert.match(next, /RETURN_PLAN_PENDING/, 'completed cognition without a current RETURN plan must remain machine-owned');
assert.match(next, /RETURN_ACQUISITION/, 'a current non-human RETURN plan must expose SFI-owned acquisition');
assert.match(next, /HUMAN_INPUT_REQUIRED/, 'human escalation must remain explicit and conditional');
assert.match(next, /CONTINUITY_HEARTBEAT_OVERDUE/, 'stalled internal cognitive progress must identify continuity as the blocker');
assert.doesNotMatch(next, /RETURN_OVERDUE/, 'cycle age alone must never manufacture an overdue RETURN');

assert.match(continuity, /runOperationalTransitionWatchdog/, 'existing continuity runtime must own the transition watchdog');
assert.match(continuity, /searchEvidenceCandidates/, 'watchdog must recreate missing evidence work');
assert.match(continuity, /runCognitiveAgent\('risk_agent'/, 'watchdog must execute the existing risk_agent for unknown proposal risk');
assert.match(continuity, /LEGACY_APPROVED_NOT_QUEUED/, 'stale design-approved handoff must be detected');
assert.match(continuity, /QUEUED_WITHOUT_RETURN/, 'queued work without RETURN must be detected');
assert.match(continuity, /LEGACY_ACCEPTED_WITHOUT_OBSERVED_RETURN/, 'legacy accepted anomalies must be detected');
assert.match(heartbeat, /runOperationalTransitionWatchdog/, 'watchdog must reuse the existing continuity heartbeat');
assert.match(heartbeat, /runGovernedExecutionRouter/, 'existing queued execution router must remain the executor path');
assert.match(heartbeat, /cycleId: requestedCycleId/, 'governed heartbeat must support targeted recovery of an existing cycle');
assert.match(heartbeat, /laneFailure/, 'heartbeat response must expose lane-level degradation instead of returning cosmetic success');
assert.match(heartbeat, /Missing evidence remains missing|Evidence acceptance/, 'heartbeat policy must preserve the evidence boundary');
assert.match(router, /project_execution_manager/, 'project execution manager remains the existing execution coordinator');

assert.match(universalContinuation, /cycleId\?: string/, 'continuation must support an optional existing-cycle target');
assert.match(universalContinuation, /FAIR_OLDEST_PROGRESS_FIRST_ROUND_ROBIN/, 'automatic continuation must use a starvation-resistant scheduling policy');
assert.match(universalContinuation, /TARGETED_SAME_CYCLE_RECOVERY/, 'targeted recovery must remain same-cycle');
assert.match(universalContinuation, /No new Case, raw source reprocessing, RETURN fabrication/, 'continuation must preserve the epistemic and identity boundary');
assert.match(universalContinuation, /CONTINUATION_AGENT_BUDGET = 8/, 'durable continuation must complete substantial work per heartbeat without reverting to one-shot runtime fragility');
assert.match(universalContinuation, /MAX_SYNTHESIS_ATTEMPTS_PER_COMPLETION = 3/, 'degraded synthesis recovery must be bounded rather than silently final or infinitely retried');
assert.match(universalContinuation, /synthesisStatus\(event/, 'synthesis recovery must inspect semantic status, not merely event existence');
assert.match(universalContinuation, /SYNTHESIS_DEGRADED_RETRY_EXHAUSTED/, 'degraded synthesis must remain visible after bounded retry exhaustion');
assert.doesNotMatch(universalContinuation, /recordUniversalReturn\(/, 'cognitive continuation must never manufacture RETURN');

assert.match(cognitiveCycle, /materializeInstitutionalRuntimeCognitiveSpine/, 'universal cognition must consume a sealed institutional Cognitive Spine projection');
assert.match(cognitiveCycle, /ctSnapshotConsumed: true/, 'successful universal cognition must explicitly record CT consumption');
assert.match(cognitiveCycle, /resolveUniversalReturnCapability/, 'new RETURN plans must be resolved by governed AI at creation rather than deferred to frontend heuristics');
assert.match(cognitiveCycle, /SFI_UNIVERSAL_RETURN_CAPABILITY_CONTRACT/, 'RETURN-plan dedupe must recognize the AI-governed capability contract');
assert.doesNotMatch(cognitiveCycle, /recordUniversalReturn\(/, 'cognitive planning cannot manufacture observed RETURN');

assert.match(runtimeAgentExecutor, /governedUniversalAi/, 'runtime executor must permit governed universal AI without the legacy augmentation flag');
assert.match(agentLlmClient, /governedUniversalAi/, 'LLM adapter must not silently cancel governed universal AI requested by the executor');
assert.match(agentLlmClient, /adaptiveLearning/, 'Twin-relevant LLM projection must include adaptive calibrated learning context');
assert.match(agentLlmClient, /never as KernelEvidence/, 'adaptive learning must remain explicitly non-evidentiary inside the model prompt');

assert.match(universalReturnCapability, /runLlmTask/, 'RETURN ownership must use the governed model router');
assert.match(universalReturnCapability, /SFI_RETURN_CAPABILITY_INVENTORY/, 'AI may choose only from an explicit executable capability inventory');
assert.match(universalReturnCapability, /RETURN_CAPABILITY_AI_SELECTED_UNAUTHORIZED_CAPABILITY/, 'AI capability choice must be deterministically revalidated');
assert.match(universalReturnCapability, /rawRowsRequired: false/, 'RETURN routing must not force raw-row persistence');
assert.doesNotMatch(universalReturnCapability, /recordUniversalReturn\(/, 'capability routing must never create RETURN');

assert.match(universalReturnPlanUpgrade, /LEGACY_HEURISTIC_OR_UNRESOLVED_PLAN_TO_AI_GOVERNED_VALIDATED_1_1/, 'legacy heuristic RETURN plans must be superseded, not silently retained');
assert.match(universalReturnPlanUpgrade, /supersedesReturnPlanEventId/, 'legacy upgrade must retain same-cycle plan lineage');
assert.doesNotMatch(universalReturnPlanUpgrade, /recordUniversalReturn\(/, 'legacy plan migration must never fabricate RETURN');

assert.match(heartbeat, /runUniversalReturnPlanUpgrade/, 'heartbeat must upgrade legacy RETURN ownership before and after cognition');
assert.match(heartbeat, /runUniversalEmpiricalContinuation/, 'heartbeat must own empirical continuation after real RETURN');
assert.match(universalEmpirical, /SFI_UNIVERSAL_RETURN_AI_CLASSIFICATION_PROPOSED/, 'RETURN contrast direction must have explicit AI provenance');
assert.match(universalEmpirical, /validateReturnEvidenceRefs/, 'AI classification must not bypass RETURN evidence traceability');
assert.match(universalEmpirical, /text\(contrastPayload\.calibrationStatus\) !== 'CONTRAST_RECORDED'/, 'empirical continuation must refuse closure when calibration is incomplete');
assert.match(universalEmpirical, /assessUniversalClosure/, 'automatic close must reuse the existing empirical closure contract');
assert.match(universalEmpirical, /closeUniversalCycle/, 'evidence-complete empirical cycles must close without another manual button');
assert.match(universalEmpirical, /recordUniversalLearningCandidate/, 'closed calibrated cycles must produce a learning candidate automatically');
assert.match(universalEmpirical, /A_TO_Z_EMPIRICAL_CYCLE_COMPLETED/, 'A-to-Z completion must be explicit and observable');
assert.doesNotMatch(universalEmpirical, /recordUniversalReturn\(/, 'empirical continuation may consume but never fabricate RETURN');

assert.match(adaptiveLearning, /CALIBRATED_RETURN/, 'only evidence-complete calibrated universal learning may enter adaptive Twin context');
assert.match(adaptiveLearning, /eligibleForRootPromotion === true/, 'adaptive learning must first satisfy calibrated-return eligibility');
assert.match(adaptiveLearning, /ADAPTIVE_NON_CANONICAL/, 'adaptive learning must not masquerade as canon');
assert.match(adaptiveLearning, /\.lte\('occurred_at', cutoff\)/, 'adaptive context must obey the same temporal cutoff as the sealed execution');
assert.match(runtimeTwinMaterializer, /readAdaptiveUniversalLearningContext/, 'runtime Twin materialization must consume adaptive learning explicitly');
assert.match(runtimeTwinMaterializer, /authority: 'ADAPTIVE_NON_CANONICAL'/, 'runtime Twin projection must preserve adaptive non-canonical authority');

assert.match(evidence, /jobId: `evidence-acquisition:/, 'evidence work must have a proposal-scoped job identity');
assert.match(evidence, /rootActionRequired: state !== 'MISSING'/, 'ROOT must not be pinged while evidence_hunter owns acquisition');

assert.match(workboardApi, /readRootOperationalNext/, 'ROOT workboard API must include next-event state');
assert.match(workboardApi, /readContinuityDashboard/, 'ROOT workboard must expose the actual continuity pulse');
assert.match(workboardApi, /heartbeatAgeMinutes/, 'ROOT must expose heartbeat age rather than requiring GitHub inspection');
assert.match(workboardApi, /getLlmProviderStatus/, 'ROOT workboard must expose truthful provider status');
assert.match(workboardUi, /NECESITA DE MÍ/, 'ROOT UI must count only human-required work as user work');
assert.match(workboardUi, /SFI TRABAJANDO/, 'ROOT UI must separate machine-owned work from human work');
assert.match(workboardUi, /PULSO \/ CONTINUIDAD/, 'ROOT UI must expose continuity health directly');
assert.match(workboardUi, /DECISIONES QUE REQUIEREN ROOT/, 'decision lane must not mix automatic items with required human decisions');
assert.match(workboardUi, /TWIN \/ PROPUESTAS/, 'Twin proposals must have their own lane');
assert.match(workboardUi, /CICLOS UNIVERSALES/, 'universal cycles must not be counted as Twin proposals');
assert.match(workboardUi, /LLM PROVIDERS · CONFIG ≠ HEALTH/, 'provider configured state must not be mislabeled as health');
assert.match(workboardUi, /SALUD DEL SISTEMA/, 'global health must be shown separately from degraded lanes');

assert.match(heartbeatWorkflow, /cron: '15 \* \* \* \*'/, 'primary continuity schedule slot missing');
assert.match(heartbeatWorkflow, /cron: '45 \* \* \* \*'/, 'redundant continuity schedule slot missing');
assert.match(heartbeatWorkflow, /workflow_run:/, 'successful production deploy must trigger immediate continuity exercise');
assert.match(heartbeatWorkflow, /SFI Vercel Prebuilt Production/, 'post-deploy heartbeat must follow the canonical production deploy workflow');
assert.match(heartbeatWorkflow, /continuity heartbeat reported ok=false/, 'workflow must fail if the live heartbeat reports lane failure');
assert.match(heartbeatWorkflow, /targeted existing cycle was not processed/, 'targeted proof must fail closed when the requested existing cycle is not processed');

const cronPaths = (vercel.crons ?? []).map((item) => item.path);
assert.equal(cronPaths.filter((path) => path === '/api/cron/continuity-heartbeat').length, 1, 'continuity must keep exactly one Vercel fallback path');
assert.equal(new Set(cronPaths).size, cronPaths.length, 'this change must not duplicate Vercel cron paths');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-NEXT-EXPECTED-EVENT-1.2',
  invariants: {
    eachNonTerminalStateDeclaresNextWork: true,
    waitingEvidenceCreatesMachineWork: true,
    unknownRiskIsWatchdogAssessable: true,
    acceptedDoesNotMeanCanon: true,
    queuedExecutionReusesExistingRouter: true,
    interruptedCognitionIsNotReturnOverdue: true,
    humanAndAutomaticWorkSeparated: true,
    heartbeatVisibleInRoot: true,
    starvationResistantContinuation: true,
    degradedSynthesisIsBoundedlyRetryable: true,
    returnPlanHasAiGovernedCapabilityResolution: true,
    unresolvedAuthoritativeSourceEscalatesTruthfully: true,
    universalRuntimeConsumesSealedCognitiveTwin: true,
    governedUniversalAiActuallyReachesModelRouter: true,
    realReturnContinuesThroughContrastClosureAndLearning: true,
    calibratedLearningIsAdaptiveBeforeCanon: true,
    noAutonomyPathFabricatesReturn: true,
    postDeployContinuityExercise: true,
    vercelFallbackNotDuplicated: true,
  },
}, null, 2));
