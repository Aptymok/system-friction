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
const queue = read('src/lib/governance/proposalQueue.ts');
const router = read('src/lib/execution/governedExecutionRouter.ts');
const evidence = read('src/lib/evidence/evidenceCandidates.ts');
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
assert.match(next, /READY_TO_CLOSE/, 'open universal cycles with RETURN must expose closure readiness');
assert.match(next, /RETURN_OVERDUE|NO_NEXT_EVENT_OBSERVED_WITHIN_WATCHDOG_WINDOW/, 'stale cycles must explain why they are stale');

assert.match(continuity, /runOperationalTransitionWatchdog/, 'existing continuity runtime must own the transition watchdog');
assert.match(continuity, /searchEvidenceCandidates/, 'watchdog must recreate missing evidence work');
assert.match(continuity, /runCognitiveAgent\('risk_agent'/, 'watchdog must execute the existing risk_agent for unknown proposal risk');
assert.match(continuity, /LEGACY_APPROVED_NOT_QUEUED/, 'stale design-approved handoff must be detected');
assert.match(continuity, /QUEUED_WITHOUT_RETURN/, 'queued work without RETURN must be detected');
assert.match(continuity, /LEGACY_ACCEPTED_WITHOUT_OBSERVED_RETURN/, 'legacy accepted anomalies must be detected');
assert.match(heartbeat, /runOperationalTransitionWatchdog/, 'watchdog must reuse the existing continuity heartbeat');
assert.match(heartbeat, /runGovernedExecutionRouter/, 'existing queued execution router must remain the executor path');
assert.match(heartbeat, /evidence_accept_reject|Evidence acceptance/, 'heartbeat policy must preserve evidence human gate');
assert.match(router, /project_execution_manager/, 'project execution manager remains the existing execution coordinator');

assert.match(evidence, /jobId: `evidence-acquisition:/, 'evidence work must have a proposal-scoped job identity');
assert.match(evidence, /rootActionRequired: state !== 'MISSING'/, 'ROOT must not be pinged while evidence_hunter owns acquisition');

assert.match(workboardApi, /readRootOperationalNext/, 'ROOT workboard API must include next-event state');
assert.match(workboardApi, /getLlmProviderStatus/, 'ROOT workboard must expose truthful provider status');
assert.match(workboardUi, /QUÉ SIGUE \/ NEXT EXPECTED EVENT/, 'ROOT UI must visibly answer what happens next');
assert.match(workboardUi, /ROOT:.*ACCIÓN REQUERIDA/, 'ROOT UI must distinguish human action from machine-owned work');
assert.match(workboardUi, /LLM PROVIDERS · CONFIG ≠ HEALTH/, 'provider configured state must not be mislabeled as health');
assert.match(workboardUi, /SYSTEM HEALTH/, 'global health must be shown separately from degraded lanes');
assert.match(workboardUi, /DEGRADED LANES/, 'local degradation must be visible even when the institution remains online');

const cronPaths = (vercel.crons ?? []).map((item) => item.path);
assert.equal(cronPaths.filter((path) => path === '/api/cron/continuity-heartbeat').length, 1, 'transition watchdog must reuse exactly one existing continuity heartbeat cron');
assert.equal(new Set(cronPaths).size, cronPaths.length, 'this change must not duplicate cron paths');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-NEXT-EXPECTED-EVENT-1.0',
  invariants: {
    eachNonTerminalStateDeclaresNextWork: true,
    waitingEvidenceCreatesMachineWork: true,
    unknownRiskIsWatchdogAssessable: true,
    acceptedDoesNotMeanCanon: true,
    queuedExecutionReusesExistingRouter: true,
    staleTransitionsVisible: true,
    globalHealthSeparateFromLaneHealth: true,
    noNewCron: true,
  },
}, null, 2));
