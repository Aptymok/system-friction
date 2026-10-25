/**
 * SFI-DB-NO-REPLICATION-2026-10-25
 * Founder decision: no Supabase/Neon mirroring or parity as a runtime target.
 * This test inspects concrete executable paths. It does not access providers.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const policy=read('src/lib/persistence/replicationRetirementPolicy.ts');
assert.match(policy,/NO_CROSS_PROVIDER_REPLICATION/);
for(const rpc of ['sfi_apply_primary_mirror_batch_v1',
  'sfi_claim_primary_outbox_batch_v1','sfi_ack_primary_outbox_v1',
  'sfi_apply_continuity_batch_v1','sfi_set_primary_mirror_certification_v1'])
  assert.ok(policy.includes(rpc),'replica writer not blocked: '+rpc);
const rpc=read('src/lib/persistence/dataPlaneRpc.ts');
assert.equal((rpc.match(/assertCrossProviderReplicationRetired\(name\);/g)||[]).length,2,
  'both primary and Neon RPC clients must fail closed on retired replication');
const sched=read('.github/workflows/sfi-continuity-hourly.yml');
assert.doesNotMatch(sched,/SFI_SYNC_ENDPOINT|sfi-data-plane-reconciliation-\$round\.json/);
assert.doesNotMatch(sched,/Drain primary mirror or recovery journal through bounded reconciliation/);
assert.match(sched,/Retired replication/);
const route=read('src/app/api/cron/data-plane-reconcile/route.ts');
assert.match(route,/status: 410/);
assert.doesNotMatch(route,/await attemptBoundedDataPlaneReconciliation\(/);
const root=read('src/app/api/external/v1/root/operate/route.ts');
for(const op of ['data_plane_copy_verified','data_plane_emergency']){
 const at=root.indexOf("operation === '"+op+"'");
 assert.ok(at>=0);
 assert.match(root.slice(at,at+390),/SFI_REPLICATION_RETIRED_BY_FOUNDER/);
}
const mirror=read('src/lib/persistence/primaryMirror.ts');
assert.match(mirror,/reason: 'SFI_REPLICATION_RETIRED_BY_FOUNDER'/);
const recovery=read('src/lib/persistence/continuityRecovery.ts');
assert.match(recovery,/reason:\s*'SFI_REPLICATION_RETIRED_BY_FOUNDER'/);
const runtime=read('src/lib/continuity/runtime.ts');
assert.doesNotMatch(runtime,/await flushPrimaryMirror\(/);
assert.doesNotMatch(runtime,/await recoverPrimaryDataPlane\(/);
assert.match(runtime,/const primaryMirrorFailed = false/);
const gate=read('src/lib/continuity/actionableWorkGate.ts');
assert.match(gate,/required: false as const/);
assert.doesNotMatch(gate,/readDataPlaneReconciliationStatus/);
console.log('PASS SFI_NO_REPLICATION: scheduler, remote RPC, ROOT manual, heartbeat, recovery and wake gate blocked; independent data retained');
