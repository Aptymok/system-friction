/**
 * Advisory, fail-closed migration release gate.
 * Consumes independently collected read-only provider and SFI_ROOT snapshots.
 * A passing result never applies a migration or supplies human authorization.
 */
const zero = (value) => Number.isInteger(value) && value === 0;
const goodSchema = (value) => value?.baseCaseTablesPresent === true && value?.columnsCompatible === true;
export function assessRealityChainMigrationRelease(input) {
  const blockers = [];
  const status = input?.rootStatus ?? {};
  const plane = status.dataPlane ?? {};
  const certificate = status.primaryMirrorCertificate ?? {};
  const journal = status.journal ?? {};
  const outbox = status.primaryOutbox ?? {};
  const now = Date.parse(input?.evaluatedAt ?? '');
  const observed = Date.parse(status.observedAt ?? '');
  const verified = Date.parse(certificate.verifiedAt ?? '');
  const isFresh = (at) => Number.isFinite(now) && Number.isFinite(at) && at <= now && now - at <= 600_000;
  if (!isFresh(observed) || !isFresh(verified)) blockers.push('CURRENT_INDEPENDENT_STATUS_REQUIRED');
  if (plane.mode !== 'PRIMARY') blockers.push('DATA_PLANE_NOT_PRIMARY');
  if (plane.primaryMirrorCertified !== true || certificate.certified !== true) blockers.push('MIRROR_NOT_CERTIFIED');
  if (plane.primaryErrorCode) blockers.push('PRIMARY_TRANSPORT_ERROR');
  if (!zero(journal.pending) || !zero(journal.conflicts) || !zero(journal.protectedPending)) blockers.push('JOURNAL_NOT_CLEAN');
  if (!zero(outbox.pending) || !zero(outbox.conflicts)) blockers.push('PRIMARY_OUTBOX_NOT_CLEAN');
  if (!goodSchema(input?.providers?.supabase) || !goodSchema(input?.providers?.neon)) blockers.push('PROVIDER_SCHEMA_PRECHECK_MISSING');
  if (input?.isolatedTests?.migration !== true || input?.isolatedTests?.atomicity !== true ||
      input?.isolatedTests?.twoSessionConcurrency !== true || input?.isolatedTests?.replicationReplay !== true) {
    blockers.push('ISOLATED_RELEASE_TESTS_INCOMPLETE');
  }
  // Trigger-disabled replay must mirror the exact parent revision in the source
  // transaction, with an independently matched case-object content digest.
  // A clean journal alone cannot establish this.
  if (input?.isolatedTests?.caseParentRevisionReplay !== true ||
      input?.isolatedTests?.caseRowDigestParity !== true) {
    blockers.push('CASE_REVISION_REPLAY_PARITY_UNVERIFIED');
  }
  if (input?.explicitHumanApproval !== true) blockers.push('HUMAN_PRODUCTION_APPROVAL_REQUIRED');
  return {
    readyForHumanReviewedRelease: blockers.length === 0,
    blockers,
    boundary: 'ADVISORY_ONLY_NO_MIGRATION_EXECUTION_NO_PRIVILEGE_EXPANSION_NO_CERTIFICATION',
  };
}
