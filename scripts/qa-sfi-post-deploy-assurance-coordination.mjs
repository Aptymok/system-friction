import assert from 'node:assert/strict';
import fs from 'node:fs';

const continuityPath = '.github/workflows/sfi-continuity-hourly.yml';
const observatoryPath = '.github/workflows/sfi-production-observatory-smoke.yml';
const continuity = fs.readFileSync(continuityPath, 'utf8');
const observatory = fs.readFileSync(observatoryPath, 'utf8');

const DEPLOYMENT_WORKFLOW = 'SFI Vercel Prebuilt Production';
const SHARED_PREFIX = 'sfi-post-deploy-assurance-';

function requireDeploymentConsumer(source, label) {
  assert.match(source, /workflow_run:/, `${label} must retain workflow_run trigger`);
  assert.ok(source.includes(DEPLOYMENT_WORKFLOW), `${label} must consume canonical Vercel deployment`);
  assert.match(source, /types:\s*\n\s*- completed/, `${label} must wait for completed deployment run`);
}

function concurrencyFallback(source, label) {
  const match = source.match(/group:\s*\$\{\{\s*github\.event_name == 'workflow_run'\s*&&\s*format\('sfi-post-deploy-assurance-\{0\}',\s*github\.event\.workflow_run\.id\)\s*\|\|\s*'([^']+)'\s*\}\}/);
  assert.ok(match, `${label} must derive shared deployment mutex from workflow_run.id`);
  assert.match(source, /cancel-in-progress:\s*false/, `${label} must not cancel a required assurance run`);
  assert.match(source, /queue:\s*max/, `${label} must queue rather than replace pending assurance runs`);
  return match[1];
}

function deploymentCoordinationIdentity(deploymentRunId) {
  return `${SHARED_PREFIX}${deploymentRunId}`;
}

requireDeploymentConsumer(continuity, 'Continuity');
requireDeploymentConsumer(observatory, 'Observatory');

const continuityFallback = concurrencyFallback(continuity, 'Continuity');
const observatoryFallback = concurrencyFallback(observatory, 'Observatory');
assert.equal(continuityFallback, 'sfi-continuity-hourly');
assert.equal(observatoryFallback, 'sfi-production-observatory-smoke');

const deploymentD = '34051736919';
const deploymentD2 = '34060000000';
assert.equal(deploymentCoordinationIdentity(deploymentD), deploymentCoordinationIdentity(deploymentD));
assert.notEqual(deploymentCoordinationIdentity(deploymentD), deploymentCoordinationIdentity(deploymentD2));

// GitHub concurrency allows one running workflow per group. queue:max + cancel-in-progress:false
// means the second assurance waits and is not replaced/cancelled. Both consumers use the same
// per-deployment identity, so they serialize without imposing a global production mutex.
const sameDeploymentRuns = [
  { workflow: 'Observatory', group: deploymentCoordinationIdentity(deploymentD) },
  { workflow: 'Continuity', group: deploymentCoordinationIdentity(deploymentD) },
];
assert.equal(new Set(sameDeploymentRuns.map((run) => run.group)).size, 1);
assert.equal(sameDeploymentRuns.length, 2);

// Scheduled Continuity remains on its historical independent owner and cadence.
assert.match(continuity, /cron:\s*'15 \* \* \* \*'/);
assert.match(continuity, /cron:\s*'45 \* \* \* \*'/);
assert.equal(continuityFallback, 'sfi-continuity-hourly');
assert.notEqual(continuityFallback, deploymentCoordinationIdentity(deploymentD));

// Exact deployment lineage remains authoritative in both workflows.
assert.match(continuity, /UPSTREAM_SHA:\s*\$\{\{ github\.event\.workflow_run\.head_sha \|\| '' \}\}/);
assert.match(observatory, /TRIGGER_RUN_ID:\s*\$\{\{ github\.event\.workflow_run\.id \}\}/);
assert.match(observatory, /TRIGGER_HEAD_SHA:\s*\$\{\{ github\.event\.workflow_run\.head_sha \}\}/);

// Coordination orders independent receipts; it never converts one workflow result into the other.
assert.match(observatory, /SFI_PRODUCTION_RETURN_PASS/);
assert.match(observatory, /SFI_PRODUCTION_RETURN_FAIL/);
assert.match(continuity, /UNIVERSAL_CONTINUATION_FAIL/);
assert.match(continuity, /continuity heartbeat reported ok=false/);

// Preserve #386 safety: no retry of the effectful heartbeat and no runtime/DB tuning in this slice.
assert.doesNotMatch(continuity, /--retry-all-errors/);
assert.doesNotMatch(continuity, /--retry\s+[1-9]/);
assert.doesNotMatch(continuity + observatory, /statement_timeout|alter\s+table|create\s+index|drop\s+index/i);

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-POST-DEPLOY-ASSURANCE-COORDINATION-1.0',
  deploymentWorkflow: DEPLOYMENT_WORKFLOW,
  sharedCoordinationExample: deploymentCoordinationIdentity(deploymentD),
  scheduledContinuityGroup: continuityFallback,
  observatoryNonDeployGroup: observatoryFallback,
  invariants: {
    bothDeploymentConsumersPresent: true,
    sameDeploymentIdentitySerializes: true,
    differentDeploymentsIsolated: true,
    requiredRunsQueuedNotCancelled: true,
    scheduledContinuityIsIndependent: true,
    exactDeploymentShaLineagePreserved: true,
    workflowFailuresRemainIndependentAndFailClosed: true,
    wholeHeartbeatRetryAbsent: true,
    databaseMutationAbsent: true,
  },
}, null, 2));
