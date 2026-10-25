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
assert.match(intake,/checkC07CaseQueueState/);
assert.match(intake,/caseRevision:eligible\.revision/);
assert.match(worker,/checkC07CaseQueueState/);
assert.match(worker,/text\(payload\.caseRevision\)/);
assert.match(worker,/\.eq\('tenant_id',tenantId\)\.is\('deleted_at',null\)/);
assert.match(worker,/CASE_REVISION_AND_ANCHORS_REQUIRED/);
assert.match(worker,/if \(checked\.mission\.humanApprovalRequired\)/);
console.log(JSON.stringify({
  pass:'SFI_C07_CASE_REVISION_AND_ELIGIBILITY',
  approvedStates:C07_AUTONOMOUS_CASE_STATES,
  rejectedClosed:true,rejectedDeleted:true,rejectedChanged:true,
  tenantReadConstrained:true,providerCalls:0,productionWrites:0,
}));
