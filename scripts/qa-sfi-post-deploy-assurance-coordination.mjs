import assert from 'node:assert/strict';
import fs from 'node:fs';

const continuityPath = '.github/workflows/sfi-continuity-hourly.yml';
const observatoryPath = '.github/workflows/sfi-production-observatory-smoke.yml';
const universalPath = 'src/lib/sfi/universalCycleContinuation.ts';

const continuity = fs.readFileSync(continuityPath, 'utf8');
const observatory = fs.readFileSync(observatoryPath, 'utf8');
const universal = fs.readFileSync(universalPath, 'utf8');

const DEPLOYMENT_WORKFLOW = 'SFI Vercel Prebuilt Production';
const CONTINUITY_GLOBAL = 'sfi-continuity-hourly';
const OBSERVATORY_GLOBAL = 'sfi-production-observatory-smoke';
const SHARED_PREFIX = 'sfi-post-deploy-assurance-';

function requireDeploymentConsumer(source, label) {
  assert.match(source, /workflow_run:/, `${label} must retain workflow_run trigger`);
  assert.ok(source.includes(DEPLOYMENT_WORKFLOW), `${label} must consume canonical Vercel deployment`);
  assert.match(source, /types:\s*\n\s*- completed/, `${label} must wait for completed deployment run`);
}

function requireWorkflowMutex(source, expectedGroup, label) {
  const top = source.match(/\nconcurrency:\s*\n\s*group:\s*([^\n]+)\n\s*cancel-in-progress:\s*false\n\s*queue:\s*max/);
  assert.ok(top, `${label} must retain workflow-level queueing mutex`);
  assert.equal(top[1].trim(), expectedGroup, `${label} workflow-level mutex must remain authoritative and static`);
}

function requireJobMutex(source, jobId, fallbackPrefix, label) {
  const jobPattern = new RegExp(
    `\\n  ${jobId}:\\n[\\s\\S]*?\\n    concurrency:\\n` +
      `      group: \\${\\{ github\\.event_name == 'workflow_run' && format\\('sfi-post-deploy-assurance-\\{0\\}', github\\.event\\.workflow_run\\.id\\) \\|\\| format\\('${fallbackPrefix}-\\{0\\}', github\\.run_id\\) \\}\\}\\n` +
      `      cancel-in-progress: false\\n` +
      `      queue: max\\n`,
  );
  assert.match(source, jobPattern, `${label} effectful job must use shared deployment mutex with unique non-deploy fallback`);
}

function deploymentCoordinationIdentity(deploymentRunId) {
  return `${SHARED_PREFIX}${deploymentRunId}`;
}

function continuityJobIdentity(eventName, deploymentRunId, runId) {
  return eventName === 'workflow_run'
    ? deploymentCoordinationIdentity(deploymentRunId)
    : `sfi-continuity-heartbeat-${runId}`;
}

function observatoryJobIdentity(eventName, deploymentRunId, runId) {
  return eventName === 'workflow_run'
    ? deploymentCoordinationIdentity(deploymentRunId)
    : `sfi-observatory-return-${runId}`;
}

function intersects(a, b) {
  const right = new Set(b);
  return a.some((value) => right.has(value));
}

requireDeploymentConsumer(continuity, 'Continuity');
requireDeploymentConsumer(observatory, 'Observatory');
requireWorkflowMutex(continuity, CONTINUITY_GLOBAL, 'Continuity');
requireWorkflowMutex(observatory, OBSERVATORY_GLOBAL, 'Observatory');
requireJobMutex(continuity, 'heartbeat', 'sfi-continuity-heartbeat', 'Continuity');
requireJobMutex(observatory, 'observatory-production-return', 'sfi-observatory-return', 'Observatory');

// Existing Continuity cadence and manual entrypoint remain under the same global execution mutex.
assert.match(continuity, /cron:\s*'15 \* \* \* \*'/);
assert.match(continuity, /cron:\s*'45 \* \* \* \*'/);
assert.match(continuity, /workflow_dispatch:/);

const deploymentD = '34051736919';
const deploymentD2 = '34060000000';
const scheduledRun = '501';
const manualRun = '502';

const deploymentContinuityLocks = [
  CONTINUITY_GLOBAL,
  continuityJobIdentity('workflow_run', deploymentD, 'unused'),
];
const deploymentObservatoryLocks = [
  OBSERVATORY_GLOBAL,
  observatoryJobIdentity('workflow_run', deploymentD, 'unused'),
];
const scheduledContinuityLocks = [CONTINUITY_GLOBAL];
const manualContinuityLocks = [CONTINUITY_GLOBAL];

assert.deepEqual(deploymentContinuityLocks, [CONTINUITY_GLOBAL, deploymentCoordinationIdentity(deploymentD)]);
assert.deepEqual(deploymentObservatoryLocks, [OBSERVATORY_GLOBAL, deploymentCoordinationIdentity(deploymentD)]);
assert.deepEqual(scheduledContinuityLocks, [CONTINUITY_GLOBAL]);
assert.deepEqual(manualContinuityLocks, [CONTINUITY_GLOBAL]);

// Same-deployment assurance serializes on the second lock dimension.
assert.ok(intersects(deploymentContinuityLocks, deploymentObservatoryLocks));
assert.equal(
  deploymentContinuityLocks.find((lock) => deploymentObservatoryLocks.includes(lock)),
  deploymentCoordinationIdentity(deploymentD),
);

// Every Continuity invocation remains serialized on the historical global execution mutex.
assert.ok(intersects(scheduledContinuityLocks, deploymentContinuityLocks));
assert.ok(intersects(manualContinuityLocks, deploymentContinuityLocks));
assert.ok(intersects(scheduledContinuityLocks, manualContinuityLocks));
assert.equal(scheduledContinuityLocks[0], CONTINUITY_GLOBAL);
assert.equal(manualContinuityLocks[0], CONTINUITY_GLOBAL);

// Non-deploy job-level fallback groups are unique and supplemental only.
assert.notEqual(
  continuityJobIdentity('schedule', '', scheduledRun),
  continuityJobIdentity('workflow_dispatch', '', manualRun),
);
assert.notEqual(continuityJobIdentity('schedule', '', scheduledRun), CONTINUITY_GLOBAL);
assert.notEqual(observatoryJobIdentity('workflow_dispatch', '', scheduledRun), OBSERVATORY_GLOBAL);

// D1 and D2 do not reuse the same deployment coordination receipt.
assert.notEqual(deploymentCoordinationIdentity(deploymentD), deploymentCoordinationIdentity(deploymentD2));

// Exact deployment lineage remains authoritative in both workflows.
assert.match(continuity, /github\.event\.workflow_run\.id/);
assert.match(continuity, /UPSTREAM_SHA:\s*\$\{\{ github\.event\.workflow_run\.head_sha \|\| '' \}\}/);
assert.match(observatory, /TRIGGER_RUN_ID:\s*\$\{\{ github\.event\.workflow_run\.id \}\}/);
assert.match(observatory, /TRIGGER_HEAD_SHA:\s*\$\{\{ github\.event\.workflow_run\.head_sha \}\}/);

// Queue/cancellation semantics are fail-safe at both lock layers.
const combined = continuity + observatory;
assert.equal((combined.match(/cancel-in-progress:\s*false/g) || []).length, 4);
assert.equal((combined.match(/queue:\s*max/g) || []).length, 4);
assert.doesNotMatch(combined, /cancel-in-progress:\s*true/);

// One assurance result cannot fabricate or hide the other workflow receipt.
assert.match(observatory, /SFI_PRODUCTION_RETURN_PASS/);
assert.match(observatory, /SFI_PRODUCTION_RETURN_FAIL/);
assert.match(continuity, /UNIVERSAL_CONTINUATION_FAIL/);
assert.match(continuity, /continuity heartbeat reported ok=false/);

// Preserve #386: READ retry remains bounded at 2 and no effectful heartbeat retry is introduced.
assert.match(universal, /LEDGER_READ_MAX_ATTEMPTS\s*=\s*2/);
assert.doesNotMatch(continuity, /--retry-all-errors/);
assert.doesNotMatch(continuity, /--retry\s+[1-9]/);
assert.doesNotMatch(continuity, /curl[^\n]*retry/i);

// Scheduling-only corrective slice: no DB/schema/config mutation is introduced in workflow surfaces.
assert.doesNotMatch(combined, /statement_timeout|alter\s+table|create\s+index|drop\s+index|supabase.*pool|pool.*supabase/i);

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-POST-DEPLOY-ASSURANCE-COORDINATION-1.1',
  deploymentWorkflow: DEPLOYMENT_WORKFLOW,
  workflowMutexes: {
    continuity: CONTINUITY_GLOBAL,
    observatory: OBSERVATORY_GLOBAL,
  },
  deploymentCoordinationExample: deploymentCoordinationIdentity(deploymentD),
  lockSets: {
    deploymentContinuity: deploymentContinuityLocks,
    scheduledContinuity: scheduledContinuityLocks,
    manualContinuity: manualContinuityLocks,
    deploymentObservatory: deploymentObservatoryLocks,
  },
  invariants: {
    bothDeploymentConsumersPresent: true,
    continuityMutualExclusionPreserved: true,
    sameDeploymentAssuranceSerialized: true,
    scheduledVsDeploymentContinuitySerialized: true,
    manualVsDeploymentContinuitySerialized: true,
    scheduledVsManualContinuitySerialized: true,
    differentDeploymentCoordinationIdentities: true,
    requiredRunsQueuedNotCancelled: true,
    exactDeploymentRunLineagePreserved: true,
    exactDeploymentShaLineagePreserved: true,
    workflowFailuresRemainIndependentAndFailClosed: true,
    wholeHeartbeatRetryAbsent: true,
    boundedLedgerReadRetryPreserved: true,
    databaseMutationAbsent: true,
  },
}, null, 2));
