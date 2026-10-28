import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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
  assert.ok(source.includes(`\n  ${jobId}:\n`), `${label} effectful job must remain present`);
  const expectedGroup =
    "      group: ${{ github.event_name == 'workflow_run' && format('sfi-post-deploy-assurance-{0}', github.event.workflow_run.id) || format('" +
    fallbackPrefix +
    "-{0}', github.run_id) }}";
  assert.ok(source.includes(expectedGroup), `${label} effectful job must use shared deployment mutex with unique non-deploy fallback`);
  const jobConcurrency = expectedGroup + '\n      cancel-in-progress: false\n      queue: max';
  assert.ok(source.includes(jobConcurrency), `${label} job-level mutex must queue and never cancel required assurance`);
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
assert.ok(continuity.includes("cron: '17 * * * *'"), 'continuity uses one lightweight hourly wakeup');
assert.match(continuity, /workflow_dispatch:/);

// ROOT's read-only cadence projection must match the existing GitHub Actions schedule.
// Regression: #791 was previously repaired, then a subsequent cost-driven cadence change
// made the projection stale again. This asserts metadata only; no scheduler is invoked.
const projection = fs.readFileSync('src/lib/persistence/dataPlaneReconciliationControl.ts', 'utf8');
const scheduledMinutes = continuity.match(/^\s*-\s*cron:\s*'(\d{1,2}(?:,\d{1,2})*) \* \* \* \*'/m);
const projectedSchedule = projection.match(/timesUtc:\s*\[([^\]]+)\]/);
assert.ok(scheduledMinutes && projectedSchedule, 'ROOT and workflow must declare a schedule');
const actualMinutes = scheduledMinutes[1].split(',').map(Number).sort((a, b) => a - b);
const declaredMinutes = [...projectedSchedule[1].matchAll(/'HH:(\d{2})'/g)]
  .map((match) => Number(match[1])).sort((a, b) => a - b);
assert.deepEqual(declaredMinutes, actualMinutes, 'ROOT timesUtc must equal the real workflow cron');
assert.ok(projection.includes("triggerTypes: ['schedule', 'workflow_dispatch', 'workflow_run']"),
  'ROOT must preserve non-schedule triggers');

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

// The read-only wakeup must not report a green idle pulse when primary work eligibility is unreadable.
// This does not authorize a heartbeat, primary egress, database write or RETURN.
assert.match(continuity, /payload\.get\('reason'\) == 'PRIMARY_WORK_GATE_UNAVAILABLE' and not should_run/);
assert.match(continuity, /SFI_CONTINUITY_PRIMARY_WORK_GATE_UNAVAILABLE/);
assert.match(continuity, /no heartbeat or RETURN is claimed/);

// A malformed or contradictory wakeup must fail closed rather than report idle.
assert.match(continuity, /type\(payload\.get\('shouldRun'\)\) is not bool/);
assert.match(continuity, /SFI_CONTINUITY_WAKEUP_CONTRACT_INVALID/);
assert.match(continuity, /SFI_CONTINUITY_WAKEUP_CONTRADICTORY/);
assert.match(continuity, /gate_state = payload\.get\('state'\)/);
assert.match(continuity, /'activeProposal', 'activeCase', 'openUniversalCycle'/);
assert.match(continuity, /'activeStudioExperiment', 'mirrorMaintenanceRequired'/);
assert.match(continuity, /mission = gate_state\.get\('c08MissionWork'\)/);
assert.match(continuity, /gate_state\.get\('continuityMode'\) not in \(None, 'NORMAL'\)/);


// SFI-CONTINUITY-WAKEUP-NATIVE-REPLAY-1.0
// Native, unaltered wakeup response from GitHub Actions run #40593423373,
// job #122503164874, 2026-10-27 22:15:43 UTC. The fixture is an observed
// receipt, not a generated runtime result. Negative controls below modify
// only in-memory copies; they are NOT observations or institutional writes.
// Execute the Python classifier embedded in the workflow itself so this test
// detects drift between CI's claimed safety checks and actual runner logic.
const wakeupPythonMatch = continuity.match(
  /python - "\$response_file" "\$GITHUB_OUTPUT" "\$GITHUB_STEP_SUMMARY" <<'PY'\r?\n([\s\S]*?)\r?\n {10}PY/,
);
assert.ok(wakeupPythonMatch, 'actual wakeup Python classifier must remain extractable');
const wakeupPython = wakeupPythonMatch[1].split('\n')
  .map((line) => line.replace(/^ {10}/, '')).join('\n') + '\n';
const nativeWakeup = JSON.parse(fs.readFileSync(
  'scripts/fixtures/sfi-continuity-wakeup-native-40593423373.json', 'utf8',
));
assert.equal(nativeWakeup.reason, 'ACTIONABLE_CONTINUITY_WORK');
assert.equal(nativeWakeup.shouldRun, true);

function replayWakeupClassifier(input) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sfi-continuity-wakeup-'));
  try {
    const responsePath = path.join(directory, 'response.json');
    const outputPath = path.join(directory, 'output.txt');
    const summaryPath = path.join(directory, 'summary.md');
    fs.writeFileSync(responsePath, JSON.stringify(input));
    const execution = spawnSync('python3', ['-', responsePath, outputPath, summaryPath], {
      input: wakeupPython, encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024,
    });
    assert.equal(execution.error, undefined, 'Python replay process must launch');
    return {
      status: execution.status,
      stdout: execution.stdout,
      stderr: execution.stderr,
      output: fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '',
    };
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

const observedReplay = replayWakeupClassifier(nativeWakeup);
assert.equal(observedReplay.status, 0, observedReplay.stderr);
assert.equal(observedReplay.output, 'should_run=true\n');
assert.deepEqual(JSON.parse(observedReplay.stdout.trim()), nativeWakeup);

// Negative control 1: a missing decision must never become a green idle.
const noDecision = { ...nativeWakeup };
delete noDecision.shouldRun;
const noDecisionReplay = replayWakeupClassifier(noDecision);
assert.notEqual(noDecisionReplay.status, 0);
assert.match(noDecisionReplay.stderr, /SFI_CONTINUITY_WAKEUP_CONTRACT_INVALID/);

// Negative control 2: a false idle decision contradicting real actionable
// flags must fail closed. This mutation is not a claimed live response.
const contradictoryIdle = { ...nativeWakeup, shouldRun: false };
const contradictoryReplay = replayWakeupClassifier(contradictoryIdle);
assert.notEqual(contradictoryReplay.status, 0);
assert.match(contradictoryReplay.stderr, /SFI_CONTINUITY_WAKEUP_CONTRADICTORY/);

// Negative control 3: the canonical gate never establishes idle without a
// state object. A truncated response must not become a successful idle pulse.
const missingStateIdle = { ...nativeWakeup, shouldRun: false };
delete missingStateIdle.state;
const missingStateReplay = replayWakeupClassifier(missingStateIdle);
assert.notEqual(missingStateReplay.status, 0);
assert.match(missingStateReplay.stderr, /SFI_CONTINUITY_WAKEUP_CONTRACT_INVALID: idle decision missing state/);

// Negative control 4: a non-idle reason cannot be silently accepted as idle,
// even when the work flags in a test copy are all cleared. These are mutated
// fields of a genuine recorded wakeup, NOT a claimed institutional receipt.
const contradictoryReasonIdle = {
  ...nativeWakeup,
  shouldRun: false,
  state: {
    ...nativeWakeup.state,
    continuityMode: 'NORMAL',
    activeProposal: false,
    activeCase: false,
    openUniversalCycle: false,
    activeStudioExperiment: false,
    mirrorMaintenanceRequired: false,
    c08MissionWork: { ...nativeWakeup.state.c08MissionWork, required: false },
  },
};
const contradictoryReasonReplay = replayWakeupClassifier(contradictoryReasonIdle);
assert.notEqual(contradictoryReasonReplay.status, 0);
assert.match(contradictoryReasonReplay.stderr, /SFI_CONTINUITY_WAKEUP_REASON_CONTRADICTORY/);

// Targeted manual recovery must not pass solely because old lifecycle events exist.
// This is a source-level guard: it does not prove any new RETURN or action.
assert.match(continuity, /selected_results = universal\.get\('results'\)/);
assert.match(continuity, /item\.get\('cycleId'\) == requested/);
assert.match(continuity, /SFI_TARGETED_CYCLE_NOT_SELECTED/);
assert.match(continuity, /historical events alone do not prove/);

// One assurance result cannot fabricate or hide the other workflow receipt.
assert.match(observatory, /SFI_PRODUCTION_RETURN_PASS/);
assert.match(observatory, /SFI_PRODUCTION_RETURN_FAIL/);
assert.match(continuity, /UNIVERSAL_CONTINUATION_FAIL/);
assert.match(continuity, /continuity heartbeat reported ok=false/);

// Source-contract regression: C07's bounded Supabase queue returns before coreHeartbeat.
// Verify the actual workflow classifier, not fabricated C07 execution receipts.
const c07Route = fs.readFileSync('src/app/api/cron/continuity-heartbeat/route.ts', 'utf8');
assert.match(c07Route, /continuityScope:'C07_SUPABASE_PRIMARY_ONLY'/);
assert.match(c07Route, /status:c07QueuedMission\.ok\?'C07_PRIMARY_STEP_COMPLETE'/);
const c07Branch = continuity.indexOf("if payload.get('continuityScope') == 'C07_SUPABASE_PRIMARY_ONLY':");
const coreBranch = continuity.indexOf("if core.get('ok') is not True:");
assert.ok(c07Branch >= 0 && coreBranch > c07Branch, 'C07-specific receipt classifier must precede generic core fallback');
assert.match(continuity, /'c07QueuedMission': payload\.get\('c07QueuedMission'\)/);
assert.match(continuity, /SFI_C07_PRIMARY_RECEIPT_INVALID/);
assert.match(continuity, /SFI_C07_PRIMARY_STEP_ONLY/);
assert.match(continuity, /SFI_C07_PRIMARY_NO_PROGRESS/);
assert.match(continuity, /SFI_C07_TARGETED_CYCLE_NOT_CONTINUED/);
const heartbeatPythonMatch = continuity.match(
  /python - "\$response_file" "\$CYCLE_ID" "\$TARGET_SOURCE" <<'PY'\r?\n([\s\S]*?)\r?\n {10}PY/,
);
assert.ok(heartbeatPythonMatch, 'actual heartbeat classifier must remain extractable');
const heartbeatPython = heartbeatPythonMatch[1].split('\n')
  .map((line) => line.startsWith('          ') ? line.slice(10) : line).join('\n');
const heartbeatSyntax = spawnSync('python3', ['-c', 'import ast,sys; ast.parse(sys.stdin.read())'], {
  input: heartbeatPython, encoding: 'utf8', timeout: 15000,
});
assert.equal(heartbeatSyntax.error, undefined, 'Python parser must launch');
assert.equal(heartbeatSyntax.status, 0, heartbeatSyntax.stderr);

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
