import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const control = read('src/lib/persistence/dataPlaneReconciliationControl.ts');
const cron = read('src/app/api/cron/data-plane-reconcile/route.ts');
const workflow = read('.github/workflows/sfi-continuity-hourly.yml');
const root = read('src/app/api/external/v1/root/operate/route.ts');
const mirror = read('src/lib/persistence/primaryMirror.ts');
const recover = read('src/lib/persistence/continuityRecovery.ts');

assert.ok(workflow.includes("cron: '15 * * * *'"));
assert.ok(workflow.includes("cron: '45 * * * *'"));
assert.ok(workflow.includes('Synchronize data planes when existing recovery gates permit'));
assert.ok(workflow.includes('/api/cron/data-plane-reconcile'));
assert.ok(workflow.includes('-X POST'));
assert.ok(workflow.indexOf('Synchronize data planes when existing recovery gates permit') <
  workflow.indexOf('Check whether continuity has real work'),
  'scheduled recovery must run even if no cognitive work is ready');

assert.ok(cron.includes('verifyGitHubActionsOidcToken'));
assert.ok(cron.includes("error: 'authorized_scheduler_required'"));
assert.ok(cron.includes('attemptBoundedDataPlaneReconciliation(8)'));
assert.ok(!cron.includes('completeRecoveryMode('),
  'cron may only call the canonical gated recovery service');

assert.ok(control.includes('journal.conflicts > 0'));
assert.ok(control.includes('mirror!.pending > 0 || mirror!.conflicts > 0'));
assert.ok(control.includes('PRIMARY_OUTBOX_UNAVAILABLE'));
assert.ok(control.includes('if (!before.safeRecoveryEligible)'));
assert.ok(control.includes('recoverPrimaryDataPlane({ maxTransactions: limit })'));
assert.ok(control.includes('Math.min(32'));
assert.ok(!control.includes('DELETE FROM'));
assert.ok(!control.includes("set mode = 'PRIMARY'"));
assert.ok(mirror.includes("detail.includes('SFI_PRIMARY_MIRROR_INSERT_CONFLICT')"),
  'insert collisions must not be retried as transient errors');

assert.ok(root.includes("operation === 'data_plane_status'"));
assert.ok(root.includes("operation === 'data_plane_emergency'"));
assert.ok(root.includes('requireSovereignRoot(req)'));
assert.ok(root.includes('attemptBoundedDataPlaneReconciliation(32)'));
assert.ok(recover.includes('fingerprintsMatch()'));
assert.ok(recover.includes('completeRecoveryMode()'));
assert.ok(recover.includes('CONTINUITY_JOURNAL_NOT_EMPTY'));

const verifiedReplay = read('src/lib/persistence/verifiedObservationReplay.ts');
assert.ok(verifiedReplay.includes('world_source_observations'));
assert.ok(verifiedReplay.includes("j.row_data = to_jsonb(o)"), 'source image must remain exact');
assert.ok(verifiedReplay.includes("j.before_data is null"), 'only original inserts can be copied');
assert.ok(verifiedReplay.includes("sfi_apply_continuity_batch_v1"), 'canonical primary RPC must own writes');
assert.ok(verifiedReplay.includes("status='REPLAYED'"), 'journal must acknowledge confirmed primary writes');
assert.ok(verifiedReplay.includes("Math.min(20"), 'maximum manual batch size must remain bounded');
assert.ok(verifiedReplay.includes("dataPlaneSwitched: false"), 'manual copy never promotes the primary');
assert.ok(verifiedReplay.includes("journalConflictOverride: false"));
assert.ok(root.includes("operation === 'data_plane_copy_verified'"));
assert.ok(root.includes("replayVerifiedSourceObservations({ maxEntries:"));

console.log('PASS SFI scheduled data-plane recovery: independent calendar, ROOT manual action, journal/mirror gates, no forced promotion');
