import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';

const read = (file) => fs.readFileSync(file, 'utf8');
const control = read('src/lib/persistence/dataPlaneReconciliationControl.ts');
const cron = read('src/app/api/cron/data-plane-reconcile/route.ts');
const workflow = read('.github/workflows/sfi-continuity-hourly.yml');
const root = read('src/app/api/external/v1/root/operate/route.ts');
const mirror = read('src/lib/persistence/primaryMirror.ts');
const recover = read('src/lib/persistence/continuityRecovery.ts');
const authority = read('src/lib/persistence/authorityJournalSupersession.ts');
const primaryRpc = read('src/lib/persistence/dataPlaneRpc.ts');
const proof = read('src/lib/persistence/tenantMemberAuthorityProof.ts');

assert.ok(authority.includes("'profiles','sfi_account_access_grants','sfi_tenant_members'"), 'MEM003 must enumerate tenant membership in existing protected authority scope');
assert.ok(authority.includes('tenantMemberHistoricalParity(primary, neon, beforeImage, historical)'), 'every tenant membership journal image must be tested against both current planes and BEFORE');
assert.ok(authority.includes("j.status='PENDING' and j.operation='UPSERT'"), 'only pending historical upserts may be superseded');
assert.ok(authority.includes("j.row_data->>'role'=j.before_data->>'role'"), 'role changes cannot be reclassified as timestamp-only');
assert.ok(authority.includes("j.row_data->>'status'=j.before_data->>'status'"), 'membership state changes cannot be reclassified');
assert.ok(authority.includes("'SUPERSEDED_BY_PRIMARY'"), 'historical images must be preserved rather than marked REPLAYED');
assert.ok(primaryRpc.includes('readPrimaryTenantMembershipRow(') && primaryRpc.includes("cache: 'no-store'"), 'authority comparison must perform a fresh direct PRIMARY read');
assert.ok(recover.includes("row.table_name === 'sfi_tenant_members'"), 'full fingerprint check must evaluate tenant membership using current independent semantic proof');
assert.ok(proof.includes("key !== 'created_at' && key !== 'updated_at'"), 'only administrative timestamps are excluded from comparison');
execFileSync(process.execPath, ['--import', 'tsx', '--test', 'src/lib/persistence/tenantMemberAuthorityProof.test.ts'], { stdio: 'inherit' });

const certificate = read('src/lib/persistence/primaryMirrorCertification.ts');
const actionGate = read('src/lib/continuity/actionableWorkGate.ts');

assert.ok(control.includes('deriveLiveMirrorCertification'), 'ROOT reconciliation status must show the effective live certification');
assert.ok(control.includes('primaryMirrorRecordedCertified'), 'preserve independently the historical Neon receipt');
assert.ok(control.includes('primaryMirrorCertificateReason'), 'expose why a stale stored certificate does not hold now');
assert.ok(actionGate.includes('readDataPlaneReconciliationStatus'), 'heartbeat must test live outbox before assuming Neon receipt is current');
assert.ok(!actionGate.includes("state.primary_mirror_certified !== true"), 'heartbeat cannot rely only on last recorded Neon certificate');
assert.ok(certificate.includes("'INDEPENDENT_NON_ATOMIC_PLANE_READS'"), 'no claim of atomic parity from separate provider reads');
execFileSync(process.execPath, ['--import', 'tsx', '--test', 'src/lib/persistence/primaryMirrorCertification.test.ts'], { stdio: 'inherit' });


assert.ok(workflow.includes("cron: '7,22,37,52 * * * *'"), 'bounded mirror recovery must have four staggered scheduled opportunities per hour');
assert.ok(workflow.includes('- SFI Verify') && workflow.includes('- SFI World + Institutional Observation Cycle') && workflow.includes('- World Vector Agents'), 'successfully verified or observed main work must wake guarded mirror recovery independently of scheduled cron');
assert.ok(workflow.includes("github.event.workflow_run.head_branch == 'main'") && workflow.includes("github.event.workflow_run.head_repository.full_name == github.repository"), 'workflow_run trigger must reject forks and non-main branches');
assert.ok(workflow.includes('Drain primary mirror or recovery journal through bounded reconciliation'));
assert.ok(workflow.includes('for round in {1..32}; do'), 'allow up to 32 sequential guarded rounds under the existing seven-minute time budget');
assert.ok(workflow.includes('STOP: mirror conflict requires investigation'), 'stop rather than bypass mirrored conflict');
assert.ok(workflow.includes("stop_unsafe('primary mirror made no progress')"), 'stop rather than retry a primary mirror with no progress');
assert.ok(workflow.includes('/api/cron/data-plane-reconcile'));
assert.ok(workflow.includes('-X POST'));
assert.ok(workflow.indexOf('Drain primary mirror or recovery journal through bounded reconciliation') <
  workflow.indexOf('Check whether continuity has real work'),
  'scheduled recovery must run even if no cognitive work is ready');

assert.ok(cron.includes('verifyGitHubActionsOidcToken'));
assert.ok(cron.includes("error: 'authorized_scheduler_required'"));
assert.ok(cron.includes('attemptBoundedDataPlaneReconciliation(32)'));
assert.ok(workflow.includes('Up to 32 calls x 32 transactions'), 'cron capacity documentation must match the effective runtime bound');
assert.ok(workflow.includes('timeout-minutes: 18'), 'job timeout must accommodate bounded mirror calls followed by the existing five-minute heartbeat');
assert.ok(workflow.includes('drain_started=$SECONDS'), 'mirror drain must record its start time');
assert.ok(workflow.includes('if (( SECONDS - drain_started >= 420 ))'), 'mirror drain must stop after seven minutes');
assert.ok(workflow.includes('SFI_MIRROR_DRAIN_TIME_BUDGET_REACHED'), 'mirror time budget exit must be auditable');
assert.ok(workflow.includes("'mirroredRows': primary.get('mirroredRows')"), 'mirror receipts must separately expose row and transaction counts');
assert.ok(workflow.includes("'replayedRows': recovery.get('replayedRows')"), 'RECOVERY receipts must separately expose replayed rows and transactions');
assert.ok(!cron.includes('completeRecoveryMode('),
  'cron may only call the canonical gated recovery service');

assert.ok(control.includes('journal.conflicts > 0'));
assert.ok(control.includes('mirror!.pending > 0 || mirror!.conflicts > 0'));
assert.ok(control.includes('PRIMARY_OUTBOX_UNAVAILABLE'));
assert.ok(control.includes('if (!before.safeRecoveryEligible)'));
assert.ok(control.includes("before.blocker === 'PRIMARY_OUTBOX_RECONCILIATION_REQUIRED'"), 'CONTINUITY must be able to drain an otherwise deadlocked primary outbox');
assert.ok(control.includes("before.journal.pending === 0"), 'CONTINUITY outbox replay may not compete with unresolved journal mutations');
assert.ok(control.includes("'CONTINUITY_OUTBOX_DRAIN_PROGRESS'"), 'use distinct, non-certifying continuity outbox receipt');
assert.ok(workflow.includes("old_mode in ('CONTINUITY','RECOVERY')"), 'workflow must handle CONTINUITY before replay, without a new scheduler');
assert.ok(workflow.includes("outbox drain cannot promote or certify continuity mode"), 'workflow may not claim a certificate or primary promotion from drain alone');

assert.ok(control.includes("if (before.dataPlane.mode === 'PRIMARY')"), 'the existing hourly OIDC scheduler must maintain primary-to-Neon mirror when mode is PRIMARY');
assert.ok(control.includes('flushPrimaryMirror({ maxTransactions: limit })'), 'must reuse canonical bounded primary outbox drain, not a separate writer or cron');
assert.ok(control.includes('Math.min(32, Number.isFinite(maxTransactions)'), 'forward mirror lane must honor existing capped 32 source-transaction request');
assert.ok(mirror.includes('Math.min(input.maxTransactions ?? 8, 32)'), 'canonical flush remains capped at 32; never remove physical safety gate');
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


// Exercise the actual embedded workflow decision against mocked OIDC receipts.
// A green static source assertion alone previously missed the RECOVERY early-stop defect.
const decisionMatch = workflow.match(/next_step="\$\(python - "\$receipt" <<'PY'\n([\s\S]*?)\n          PY\n\s+\)"/);
assert.ok(decisionMatch, 'bounded drain decision must remain present and testable');
const decisionPython = decisionMatch[1]
  .split('\n')
  .map((line) => line.startsWith('          ') ? line.slice(10) : line)
  .join('\n')
  .replace(
    "p=json.load(open(sys.argv[1],encoding='utf-8'))",
    "p=json.loads(sys.stdin.read())",
  );

function drainDecision(payload) {
  const run = spawnSync('python3', ['-c', decisionPython], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 5000,
  });
  assert.ifError(run.error);
  return { exit: run.status, output: run.stdout.trim(), error: run.stderr.trim() };
}

function receipt(mode, outcome, overrides = {}) {
  const base = {
    attempted: true,
    forcedFailover: false,
    outcome,
    before: {
      dataPlane: { mode },
      journal: { pending: mode === 'RECOVERY' ? 790 : 0, conflicts: 0, protectedPending: 0 },
      primaryOutbox: { pending: mode === 'PRIMARY' ? 75 : 0, conflicts: 0 },
      safeRecoveryEligible: true,
    },
    after: {
      dataPlane: { mode, primaryMirrorCertified: false },
      journal: { pending: mode === 'RECOVERY' ? 758 : 0, conflicts: 0, protectedPending: 0 },
      primaryOutbox: { pending: mode === 'PRIMARY' ? 43 : 0, conflicts: 0 },
      safeRecoveryEligible: true,
    },
    primaryMirror: { ok: true, mirroredTransactions: mode === 'PRIMARY' ? 32 : 0 },
    recovery: { recovered: false, reason: 'CONTINUITY_JOURNAL_NOT_EMPTY', replayedTransactions: 32, replayedRows: 32 },
  };
  return {
    ...base, ...overrides,
    before: { ...base.before, ...overrides.before },
    after: { ...base.after, ...overrides.after },
    primaryMirror: { ...base.primaryMirror, ...overrides.primaryMirror },
    recovery: { ...base.recovery, ...overrides.recovery },
  };
}

const cases = [
  ['RECOVERY reduces journal while outbox is empty', receipt('RECOVERY', 'RECOVERY_NOT_COMPLETE'), 'continue'],
  ['RECOVERY journal does not decrease', receipt('RECOVERY', 'RECOVERY_NOT_COMPLETE', { after: { journal: { pending: 790, conflicts: 0, protectedPending: 0 } } }), 'fail'],
  ['RECOVERY replay receipt missing', receipt('RECOVERY', 'RECOVERY_NOT_COMPLETE', { recovery: { replayedRows: 0 } }), 'fail'],
  ['RECOVERY returns transient retry', receipt('RECOVERY', 'RECOVERY_NOT_COMPLETE', { recovery: { reason: 'CONTINUITY_REPLAY_RETRY_REQUIRED' } }), 'fail'],
  ['RECOVERY safety gate closes', receipt('RECOVERY', 'RECOVERY_NOT_COMPLETE', { after: { safeRecoveryEligible: false } }), 'fail'],
  ['RECOVERY journal conflict', receipt('RECOVERY', 'RECOVERY_NOT_COMPLETE', { after: { journal: { pending: 758, conflicts: 1, protectedPending: 0 } } }), 'fail'],
  ['RECOVERY authority record pending', receipt('RECOVERY', 'RECOVERY_NOT_COMPLETE', { after: { journal: { pending: 758, conflicts: 0, protectedPending: 1 } } }), 'fail'],
  ['RECOVERY clears journal and certifies PRIMARY', receipt('RECOVERY', 'PRIMARY_RECOVERED', {
    recovery: { recovered: true }, after: { dataPlane: { mode: 'PRIMARY', primaryMirrorCertified: true }, journal: { pending: 0, conflicts: 0, protectedPending: 0 } },
  }), 'stop'],
  ['RECOVERY cannot claim PRIMARY without cert', receipt('RECOVERY', 'PRIMARY_RECOVERED', {
    recovery: { recovered: true }, after: { dataPlane: { mode: 'PRIMARY', primaryMirrorCertified: false }, journal: { pending: 0, conflicts: 0, protectedPending: 0 } },
  }), 'fail'],
  // P0 failover regression: the PRIMARY outbox is still pending after an
  // unexpected transport-triggered CONTINUITY transition, without journal work.
  ['CONTINUITY drains guarded old PRIMARY outbox', receipt('CONTINUITY', 'CONTINUITY_OUTBOX_DRAIN_PROGRESS', {
    before: { primaryOutbox: { pending: 13, conflicts: 0 }, blocker: 'PRIMARY_OUTBOX_RECONCILIATION_REQUIRED', safeRecoveryEligible: false },
    after: { dataPlane: { mode: 'CONTINUITY', primaryMirrorCertified: false }, journal: { pending: 0, conflicts: 0, protectedPending: 0 }, primaryOutbox: { pending: 8, conflicts: 0 } },
    primaryMirror: { ok: false, mirroredTransactions: 5, mirroredRows: 5 },
  }), 'continue'],
  ['CONTINUITY drained outbox can immediately proceed to recovery', receipt('CONTINUITY', 'CONTINUITY_OUTBOX_DRAINED', {
    before: { primaryOutbox: { pending: 13, conflicts: 0 }, blocker: 'PRIMARY_OUTBOX_RECONCILIATION_REQUIRED', safeRecoveryEligible: false },
    after: { dataPlane: { mode: 'CONTINUITY', primaryMirrorCertified: false }, journal: { pending: 0, conflicts: 0, protectedPending: 0 }, primaryOutbox: { pending: 0, conflicts: 0 } },
    primaryMirror: { ok: true, mirroredTransactions: 13, mirroredRows: 13 },
  }), 'continue'],
  ['CONTINUITY does not claim PRIMARY during outbox drain', receipt('CONTINUITY', 'CONTINUITY_OUTBOX_DRAINED', {
    before: { primaryOutbox: { pending: 13, conflicts: 0 }, blocker: 'PRIMARY_OUTBOX_RECONCILIATION_REQUIRED', safeRecoveryEligible: false },
    after: { dataPlane: { mode: 'PRIMARY', primaryMirrorCertified: true }, journal: { pending: 0, conflicts: 0, protectedPending: 0 }, primaryOutbox: { pending: 0, conflicts: 0 } },
    primaryMirror: { ok: true, mirroredTransactions: 13 },
  }), 'fail'],
  ['CONTINUITY outbox no progress stops', receipt('CONTINUITY', 'CONTINUITY_OUTBOX_DRAIN_PROGRESS', {
    before: { primaryOutbox: { pending: 13, conflicts: 0 }, blocker: 'PRIMARY_OUTBOX_RECONCILIATION_REQUIRED', safeRecoveryEligible: false },
    after: { dataPlane: { mode: 'CONTINUITY', primaryMirrorCertified: false }, journal: { pending: 0, conflicts: 0, protectedPending: 0 }, primaryOutbox: { pending: 13, conflicts: 0 } },
    primaryMirror: { ok: false, mirroredTransactions: 0 },
  }), 'fail'],
  ['CONTINUITY outbox conflict stops', receipt('CONTINUITY', 'CONTINUITY_OUTBOX_CONFLICT', {
    before: { primaryOutbox: { pending: 13, conflicts: 0 }, blocker: 'PRIMARY_OUTBOX_RECONCILIATION_REQUIRED', safeRecoveryEligible: false },
    after: { dataPlane: { mode: 'CONTINUITY', primaryMirrorCertified: false }, journal: { pending: 0, conflicts: 0, protectedPending: 0 }, primaryOutbox: { pending: 8, conflicts: 1 } },
    primaryMirror: { conflict: true, mirroredTransactions: 5 },
  }), 'fail'],
  ['CONTINUITY refuses to drain with pending journal', receipt('CONTINUITY', 'CONTINUITY_OUTBOX_DRAIN_PROGRESS', {
    before: { primaryOutbox: { pending: 13, conflicts: 0 }, journal: { pending: 3, conflicts: 0, protectedPending: 0 }, blocker: 'PRIMARY_OUTBOX_RECONCILIATION_REQUIRED', safeRecoveryEligible: false },
    after: { dataPlane: { mode: 'CONTINUITY', primaryMirrorCertified: false }, journal: { pending: 3, conflicts: 0, protectedPending: 0 }, primaryOutbox: { pending: 8, conflicts: 0 } },
    primaryMirror: { ok: false, mirroredTransactions: 5 },
  }), 'fail'],
  ['CONTINUITY safely recovers PRIMARY after clear outbox and certified fingerprints', receipt('CONTINUITY', 'PRIMARY_RECOVERED', {
    before: { primaryOutbox: { pending: 0, conflicts: 0 }, safeRecoveryEligible: true, blocker: null },
    after: { dataPlane: { mode: 'PRIMARY', primaryMirrorCertified: true }, journal: { pending: 0, conflicts: 0, protectedPending: 0 }, primaryOutbox: { pending: 0, conflicts: 0 } },
    recovery: { recovered: true, replayedTransactions: 0, replayedRows: 0 },
  }), 'stop'],
  ['CONTINUITY aborts if primary transport probe still unavailable', receipt('CONTINUITY', 'RECOVERY_NOT_COMPLETE', {
    before: { primaryOutbox: { pending: 0, conflicts: 0 }, safeRecoveryEligible: true, blocker: null },
    recovery: { recovered: false, reason: 'PRIMARY_STILL_UNAVAILABLE' },
  }), 'fail'],
  ['PRIMARY progresses with mirrored transactions', receipt('PRIMARY', 'PRIMARY_MIRROR_PENDING'), 'continue'],
  ['PRIMARY completes only with cert', receipt('PRIMARY', 'PRIMARY_MIRROR_CERTIFIED', {
    after: { dataPlane: { mode: 'PRIMARY', primaryMirrorCertified: true }, primaryOutbox: { pending: 0, conflicts: 0 } },
  }), 'stop'],
  ['PRIMARY empty outbox without cert', receipt('PRIMARY', 'PRIMARY_MIRROR_PENDING', {
    after: { primaryOutbox: { pending: 0, conflicts: 0 } }, primaryMirror: { mirroredTransactions: 0 },
  }), 'fail'],
  ['PRIMARY no progress', receipt('PRIMARY', 'PRIMARY_MIRROR_PENDING', {
    after: { primaryOutbox: { pending: 75, conflicts: 0 } },
  }), 'fail'],
  ['PRIMARY mirror conflict', receipt('PRIMARY', 'PRIMARY_MIRROR_PENDING', {
    after: { primaryOutbox: { pending: 43, conflicts: 1 } },
  }), 'fail'],
  ['unauthorized forced-failover receipt', receipt('RECOVERY', 'RECOVERY_NOT_COMPLETE', { forcedFailover: true }), 'fail'],
  ['unexpected mode', receipt('UNKNOWN', 'RECOVERY_NOT_COMPLETE'), 'fail'],
];
for (const [name, mock, expected] of cases) {
  const result = drainDecision(mock);
  if (expected === 'fail') {
    assert.notEqual(result.exit, 0, name + ' must fail closed');
    assert.match(result.error, /STOP:/, name + ' must explain safe stop');
  } else {
    assert.equal(result.exit, 0, name + ': ' + result.error);
    assert.equal(result.output, expected, name);
  }
}

console.log('PASS SFI scheduled data-plane recovery: independent calendar, ROOT manual action, journal/mirror gates, no forced promotion');
