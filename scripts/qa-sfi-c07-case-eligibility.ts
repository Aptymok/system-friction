import assert from 'node:assert/strict';
import { checkC07CaseQueueState, C07_AUTONOMOUS_CASE_STATES } from '../src/lib/sfi/cognitive-runtime/queuedMissionCaseGate';
import { readFileSync } from 'node:fs';

const revision='2026-10-24T19:00:00.000Z';
const current={status:'OPEN',updatedAt:revision,deletedAt:null};
for (const status of C07_AUTONOMOUS_CASE_STATES) {
  assert.deepEqual(checkC07CaseQueueState({...current,status},revision),{ok:true,revision});
}
for (const status of ['DRAFT','AWAITING_GOVERNANCE','INTERVENING','AWAITING_RETURN','AWAITING_USER_CLOSE','CLOSED','REJECTED','UNKNOWN']) {
  assert.deepEqual(checkC07CaseQueueState({...current,status},revision),{
    ok:false,reason:'CASE_NOT_OPEN_FOR_AUTONOMOUS_ANALYSIS',
  },status);
}
assert.deepEqual(checkC07CaseQueueState({...current,deletedAt:revision},revision),{
  ok:false,reason:'CASE_DELETED',
});
assert.deepEqual(checkC07CaseQueueState({...current,updatedAt:''},revision),{
  ok:false,reason:'CASE_REVISION_MISSING',
});
assert.deepEqual(checkC07CaseQueueState({...current,updatedAt:'2026-10-24T20:00:00Z'},revision),{
  ok:false,reason:'CASE_CHANGED_SINCE_ADMISSION',
});
assert.deepEqual(checkC07CaseQueueState({...current,updatedAt:'2026-10-24T20:00:00Z'}),{
  ok:true,revision:'2026-10-24T20:00:00Z',
});
const intake=readFileSync('src/lib/sfi/cognitive-runtime/queuedMissionIntake.ts','utf8');
const worker=readFileSync('src/lib/sfi/cognitive-runtime/queuedMissionWorker.ts','utf8');
const caseRepository=readFileSync('src/lib/sfi/case-platform/repository.ts','utf8');
assert.match(caseRepository,/export async function assertTenantAccess/);
assert.match(caseRepository,/\['OWNER', 'ADMIN', 'OPERATOR'\]\.includes\(role\)/);
assert.match(intake,/assertTenantAccess\(caseRecord\.caseRecord\.tenantId,actorId,'WRITE'\)/);
assert.match(worker,/assertTenantAccess\(tenantId, actorId, 'WRITE'\)/);
assert.doesNotMatch(worker,/\.from\('sfi_tenant_members'\)/);
assert.match(intake,/SFI_C07_CANARY_CASE_ID/);
assert.match(intake,/case_outside_authorized_canary/);
assert.match(worker,/SFI_C07_CANARY_CASE_ID/);
assert.match(worker,/CASE_OUTSIDE_AUTHORIZED_CANARY/);
assert.match(intake,/checkC07CaseQueueState/);
assert.match(intake,/caseRevision:eligible\.revision/);
assert.match(worker,/checkC07CaseQueueState/);
assert.match(worker,/text\(payload\.caseRevision\)/);
assert.match(worker,/\.eq\('tenant_id',tenantId\)\.is\('deleted_at',null\)/);
assert.match(worker,/CASE_REVISION_AND_ANCHORS_REQUIRED/);
assert.match(worker,/if \(checked\.mission\.humanApprovalRequired\)/);
const rootRoute=readFileSync('src/app/api/root/cognitive-runtime/route.ts','utf8');
assert.match(rootRoute,/await readOwnedC07MissionSummary\(gate\.ctx\.user\.id\)/);
assert.match(rootRoute,/requireRootActor\('root\.cognitive-runtime\.read'\)/);
const queueIntake=readFileSync('src/lib/sfi/cognitive-runtime/queuedMissionIntake.ts','utf8');
assert.match(queueIntake,/export async function readOwnedC07MissionSummary/);
assert.match(queueIntake,/\.eq\('actor_id',actorId\)/);
assert.match(queueIntake,/\.limit\(20\)/);
assert.match(queueIntake,/QUEUE_DISABLED/);
assert.match(queueIntake,/OWNER_SCOPED_SNAPSHOT_NOT_COMPLETE_QUEUE_OR_EXTERNAL_RETURN/);
console.log(JSON.stringify({
  pass:'SFI_C07_CASE_REVISION_AND_ELIGIBILITY',
  approvedStates:C07_AUTONOMOUS_CASE_STATES,
  rejectedClosed:true,rejectedDeleted:true,rejectedChanged:true,
  tenantReadConstrained:true,providerCalls:0,productionWrites:0,
}));
