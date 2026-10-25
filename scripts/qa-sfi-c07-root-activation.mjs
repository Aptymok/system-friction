#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route=fs.readFileSync('src/app/api/root/cognitive-runtime/route.ts','utf8');
const workspace=fs.readFileSync('src/components/sfi/SfiRootWorkspace.tsx','utf8');
const intake=fs.readFileSync('src/lib/sfi/cognitive-runtime/queuedMissionIntake.ts','utf8');
const worker=fs.readFileSync('src/lib/sfi/cognitive-runtime/queuedMissionWorker.ts','utf8');
const cron=fs.readFileSync('src/app/api/cron/continuity-heartbeat/route.ts','utf8');
const gate=fs.readFileSync('src/lib/continuity/actionableWorkGate.ts','utf8');

assert.match(route,/requireRootActor\('root\.cognitive-runtime\.operate'\)/);
assert.match(route,/if \(operation === 'queue_mission'\)/);
assert.match(route,/enqueueAuthorizedC07Mission\(body, gate\.ctx\.user\.id\)/);
assert.match(route,/if \(operation === 'run_queue_once'\)/);
assert.match(route,/runBoundedC07QueuedMission/);
assert.match(workspace,/data-c07-authorized-canary-control/);
assert.match(workspace,/operation:'queue_mission'\|'run_queue_once'/);
assert.match(workspace,/payload\.idempotencyKey='root-canary-'/);
assert.match(workspace,/payload\.targets=\[\{kind:'CASE',id:selectedMissionCaseId\}\]/);
assert.match(workspace,/!selectedMissionCaseId/);
assert.match(workspace,/mission\.humanApprovalRequired===true/);
assert.match(intake,/SFI_C07_MISSION_QUEUE_ENABLED/);
assert.match(intake,/SFI_C07_CANARY_CASE_ID/);
assert.match(intake,/assertTenantAccess\(caseRecord\.caseRecord\.tenantId,actorId,'WRITE'\)/);
assert.match(intake,/sfi_c07_enqueue_mission_v1/);
assert.match(worker,/sfi_c07_claim_mission_v1/);
assert.match(worker,/sfi_c07_complete_mission_v1/);
assert.match(worker,/receipt\.status !== 'READ_BACK_CONFIRMED'/);
assert.match(worker,/sfi_c07_renew_mission_v1/);
assert.match(cron,/runBoundedC07QueuedMission/);
assert.match(gate,/readC08MissionWorkRequirement/);
assert.doesNotMatch(route,/process\.env\.SFI_C07_MISSION_QUEUE_ENABLED\s*=/);
assert.doesNotMatch(workspace,/SFI_C07_CANARY_CASE_ID\s*=/);
console.log('PASS: ROOT C07 activation is rooted in existing queue, actor-scoped canary, fenced receipt and C08 worker.');
