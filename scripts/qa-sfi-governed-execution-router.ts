import fs from 'node:fs';

function read(path: string) { return fs.readFileSync(path, 'utf8'); }
function requireText(source: string, needle: string, label: string) {
  if (!source.includes(needle)) throw new Error(`SFI_ROUTER_QA_MISSING:${label}:${needle}`);
}
function forbid(source: string, needle: string, label: string) {
  if (source.includes(needle)) throw new Error(`SFI_ROUTER_QA_FORBIDDEN:${label}:${needle}`);
}

const router = read('src/lib/execution/governedExecutionRouter.ts');
const outcome = read('src/lib/governance/proposalOutcome.ts');
const approve = read('src/app/api/acp/proposals/[id]/approve/route.ts');
const dailyCron = read('src/app/api/cron/continuity-report/route.ts');
const hourlyCron = read('src/app/api/cron/continuity-heartbeat/route.ts');
const hourlyWorkflow = read('.github/workflows/sfi-continuity-hourly.yml');
const rootRunner = read('src/lib/root/rootObservationRunner.ts');
const externalExecute = read('src/app/api/external/v1/execute/route.ts');

requireText(router, "AI_EXECUTION_ROUTER_PROPOSAL_ID = '87cc094a-e9df-40e8-9a35-92c679c60ef2'", 'authorized-router-proposal');
requireText(router, "SELF_HEALING_BOOTSTRAP_PROPOSAL_ID = '5e4803b2-0b23-4047-9ba3-38a588c78f82'", 'authorized-self-healing-proposal');
requireText(router, "'COGNITIVE_INTERNAL'", 'internal-class');
requireText(router, "'EXTERNAL_ACTION'", 'external-class');
requireText(router, 'runCognitiveAgent', 'reuse-cognitive-runtime');
requireText(router, 'MAX_RETRIES_PER_AGENT = 1', 'bounded-retry');
requireText(router, 'openRemediationChild', 'self-healing-remediation');
requireText(router, 'findExistingRemediation', 'remediation-dedup');
requireText(router, "eventName: 'SFI_PROPOSAL_EXECUTION_OBSERVED'", 'observed-execution');
requireText(router, "eventName: 'SFI_PROPOSAL_RETURN_RECORDED'", 'proposal-return');
requireText(router, 'canonicalPromotionAllowed: false', 'no-auto-canon');
requireText(router, "type: 'build_execution_adapter'", 'missing-adapter-request');
requireText(router, "state: 'BLOCKED_EXECUTOR_CAPABILITY'", 'fail-closed-missing-adapter');
requireText(router, 'SFI_GOVERNED_EXECUTION_ADAPTERS', 'adapter-contract');
forbid(router, ".from('action_proposals').insert", 'router-direct-proposal-insert');
forbid(router, ".from('action_proposals').update", 'router-direct-proposal-update');

requireText(outcome, 'recordProposalOutcomeFromObservedReturn', 'single-outcome-writer');
requireText(outcome, "epistemicClass === 'observed'", 'observed-return-gate');
requireText(outcome, 'return_event_proposal_mismatch', 'proposal-return-lineage');
requireText(outcome, 'canonicalPromotionAllowed: false', 'outcome-no-auto-canon');

requireText(approve, 'dispatchQueuedProposal(proposalId)', 'immediate-dispatch-after-approval');
requireText(approve, 'queueApprovedProposal', 'governance-before-dispatch');
if (approve.indexOf('queueApprovedProposal') > approve.indexOf('dispatchQueuedProposal(proposalId)')) {
  throw new Error('SFI_ROUTER_QA_ORDER:dispatch_must_follow_queue_authorization');
}

requireText(dailyCron, 'runGovernedExecutionRouter({ limit: 10 })', 'daily-continuity-retry-reroute');
requireText(hourlyCron, 'runGovernedExecutionRouter({ limit: 10 })', 'hourly-continuity-retry-reroute');
requireText(hourlyCron, 'verifyGitHubActionsOidcToken', 'hourly-router-auth-remains-oidc-governed');
requireText(hourlyWorkflow, "cron: '15 * * * *'", 'reuse-existing-hourly-scheduler');
requireText(hourlyWorkflow, 'workflow_dispatch:', 'existing-hourly-manual-trigger-retained');
requireText(rootRunner, 'runGovernedExecutionRouter({ limit: 10 })', 'root-full-cycle-router');
requireText(externalExecute, "error: declaredAdapter ? 'execution_dispatch_not_implemented' : 'execution_adapter_required'", 'external-generic-fail-closed');
requireText(externalExecute, 'executedAtWritten: false', 'no-fake-execution');

console.log('SFI governed execution router QA: PASS');
