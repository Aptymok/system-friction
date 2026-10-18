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
assert.ok(control.includes("if (before.dataPlane.mode === 'PRIMARY')"), 'the existing hourly OIDC scheduler must maintain primary-to-Neon mirror when mode is PRIMARY');
assert.ok(control.includes('flushPrimaryMirror({ maxTransactions: limit })'), 'must reuse canonical bounded primary outbox drain, not a separate writer or cron');
assert.ok(control.includes("Math.min(8,"), 'forward mirror batch must remain bounded to 8 source transactions');
assert.ok(control.includes("outcome: 'PRIMARY_MIRROR_REQUIRES_REVIEW'"), 'active conflicts or journal drift must prevent blind primary mirroring');
assert.ok(control.includes("'PRIMARY_MIRROR_CERTIFIED' as const"), 'mirror status must be confirmed and certified independently');
assert.ok(control.includes("primaryMirror.ok === true && primaryMirror.certified === true"), 'no false success for partial outbox drain');
assert.ok(control.indexOf("if (before.dataPlane.mode === 'PRIMARY')") < control.indexOf("if (!before.safeRecoveryEligible)"), 'PRIMARY mirror delivery must precede RECOVERY-only safety-gate branch');

assert.ok(control.includes('MEM003_PROTECTED_AUTHORITY_RECONCILIATION_REQUIRED'), 'guarded recovery may not automatically replay permissions and proposals');
assert.ok(control.includes('protected_pending'), 'guard status must expose unresolved protected operation count');
assert.ok(control.includes("'sfi_account_access_grants','sfi_tenant_members','action_proposals'"), 'protect grants, memberships and proposals');
assert.ok(control.includes('verifiedSourceReplay,'), 'blocked normal recovery must expose bounded verified-source progress without declaring full RECOVERY');
assert.ok(control.includes('replayVerifiedSourceObservations({ maxEntries:'), 'reuse governed insert-only observation replay; do not create another writer');
assert.ok(control.includes('recoverPrimaryDataPlane({ maxTransactions: limit })'));
assert.ok(control.includes('Math.min(32'));
assert.ok(!control.includes('DELETE FROM'));
assert.ok(!control.includes("set mode = 'PRIMARY'"));
assert.ok(mirror.includes("plane.mode === 'PRIMARY'"), 'mirror certification may not be true during RECOVERY');
assert.ok(mirror.includes('journal.pending === 0'), 'journal must be clear before mirror certification');
assert.ok(mirror.includes('return { ok: outboxClear, certified,'), 'outbox drain must proceed independently of global certification');
assert.ok(mirror.includes("detail.includes('SFI_PRIMARY_MIRROR_INSERT_CONFLICT')"),
  'insert collisions must not be retried as transient errors');

assert.ok(root.includes("operation === 'data_plane_status'"));
assert.ok(root.includes("operation === 'data_plane_emergency'"));
assert.ok(root.includes('requireSovereignRoot(req)'));
assert.ok(root.includes('attemptBoundedDataPlaneReconciliation(32)'));
assert.ok(recover.includes('fingerprintsMatch()'));
assert.ok(recover.includes("'sfi_data_plane_fingerprint_v2'"), 'recovery must use semantic fingerprint v2');
assert.ok(recover.includes('completeRecoveryMode()'));
assert.ok(recover.includes('CONTINUITY_JOURNAL_NOT_EMPTY'));

const verifiedReplay = read('src/lib/persistence/verifiedObservationReplay.ts');
assert.ok(verifiedReplay.includes('world_source_observations'));
assert.ok(verifiedReplay.includes("j.row_data = to_jsonb(o)"), 'source image must remain exact');
assert.ok(verifiedReplay.includes("j.before_data is null"), 'only original inserts can be copied');
assert.ok(verifiedReplay.includes("sfi_apply_continuity_batch_v1"), 'canonical primary RPC must own writes');
assert.ok(verifiedReplay.includes("status='REPLAYED'"), 'journal must acknowledge confirmed primary writes');
assert.ok(verifiedReplay.includes("Math.min(20"), 'maximum manual batch size must remain bounded');
assert.ok(verifiedReplay.includes("j.table_name = 'world_friction_readings'"), 'friction reading insert must be explicitly scoped');
assert.ok(verifiedReplay.includes('j.row_data = to_jsonb(f)'), 'friction source image must remain exact');
assert.ok(verifiedReplay.includes("tableName !== 'world_source_observations' && tableName !== 'world_friction_readings'"), 'no table outside two immutable world classes may enter verified replay');
assert.ok(verifiedReplay.includes("and table_name=\${tableName}"), 'journal acknowledgement must be scoped to actual replayed table');
assert.ok(verifiedReplay.includes('remainingFrictionReadings:'), 'bounded recovery must report unresolved friction reads');
assert.ok(verifiedReplay.includes("dataPlaneSwitched: false"), 'manual copy never promotes the primary');
assert.ok(verifiedReplay.includes("journalConflictOverride: false"));
assert.ok(root.includes("operation === 'data_plane_copy_verified'"));
assert.ok(root.includes("replayVerifiedSourceObservations({ maxEntries:"));


const scopedJournal = read('scripts/db/mem003-continuity-journal-scope.sql');
const operationalLocalTables = [
  'sfi_continuity_state','sfi_continuity_runs','sfi_capability_health_checks',
  'sfi_institutional_incidents','sfi_founder_decision_queue','sfi_continuity_reports',
  'sfi_data_plane_state','sfi_data_plane_write_journal',
  'sfi_continuity_applied_operations','sfi_data_plane_primary_outbox',
  'sfi_primary_mirror_applied_operations',
];
for (const table of operationalLocalTables) {
  assert.ok(scopedJournal.includes("'" + table + "'"), 'MEM-003 must keep plane-local ' + table + ' out of future business-data journal');
}
assert.ok(scopedJournal.includes('return coalesce(new,old);'), 'plane-local events must remain in their originating database');
assert.ok(scopedJournal.includes('create or replace function public.sfi_capture_data_plane_write()'), 'reuse the canonical trigger instead of creating another writer');
assert.doesNotMatch(scopedJournal, /^\\s*(?:delete|truncate)\\s+(?:from\\s+)?public\\.sfi_data_plane_write_journal/im, 'no historical journal entries may be deleted');
assert.ok(scopedJournal.includes("'LOCAL_ONLY'"), 'local-only status must not be called REPLAYED');
assert.ok(scopedJournal.includes('MEM003_CERTIFICATE_ONLY_AFTER_FULL_RECOVERY'), 'Neon must enforce recovery certification independently of deployed app version');
assert.ok(scopedJournal.includes("current_mode='PRIMARY'"), 'cannot certify during continuity RECOVERY');
assert.ok(scopedJournal.includes("status in ('PENDING','REPLAYING','CONFLICT')"), 'journal conflicts and backlog must block certification');
assert.ok(scopedJournal.includes("j.status in ('PENDING','CONFLICT')"), 'only unresolved local rows are reclassified');
assert.ok(scopedJournal.includes('MEM003_LOCAL_CONTROL_PLANE_EXCLUDED_FROM_BILATERAL_REPLAY'), 'source status reclassification requires retained evidence');
assert.ok(scopedJournal.includes("and j.table_name in ("), 'must restrict updates to plane-local table allowlist');
assert.ok(!/update\\s+public\\.sfi_data_plane_write_journal[\\s\\S]*set\\s+status\\s*=\\s*'REPLAYED'/i.test(scopedJournal), 'no false replay acknowledgements');

assert.ok(scopedJournal.includes('function public.sfi_data_plane_fingerprint_v2()'));
assert.ok(scopedJournal.includes('trim_scale(t.reliability)'));
assert.ok(scopedJournal.includes('where t.expires_at > now()'));

console.log('PASS SFI scheduled data-plane recovery: independent calendar, ROOT manual action, journal/mirror gates, no forced promotion');
