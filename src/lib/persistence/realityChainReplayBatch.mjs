/**
 * Offline validation of one PRIMARY→Neon source transaction before case-revision replay.
 * Replay disables user triggers, so every child mutation must carry a parent snapshot
 * once the closure_revision migration is enabled. This helper does NOT apply rows.
 *
 * Intended for an activation-gated integration with the existing mirror receiver,
 * not as a replacement for fingerprints, journal checks or release authorization.
 */
const CHILDREN = new Set([
  'sfi_case_objects',
  'sfi_case_reports',
  'sfi_case_action_proposals',
  'sfi_case_action_decisions',
]);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validRevision = value => (typeof value === 'string' || typeof value === 'number') &&
  /^(0|[1-9][0-9]*)$/.test(String(value)) && BigInt(String(value)) <= 9223372036854775807n;
const validTime = value => typeof value === 'string' && value.trim().length > 0 &&
  Number.isFinite(Date.parse(value));

export function assessCaseRevisionReplayBatch(entries, options = {}) {
  const blockers = [];
  if (!Array.isArray(entries) || entries.length === 0) {
    return { validated: false, blockers: ['REPLAY_BATCH_REQUIRED'], caseCount: 0 };
  }
  const txIds = new Set();
  const parentById = new Map();
  const touched = new Set();
  for (const entry of entries) {
    if (!isObject(entry) || !isObject(entry.row_data) ||
        !['UPSERT', 'DELETE'].includes(entry.operation) ||
        !entry.source_txid) {
      blockers.push('REPLAY_ENTRY_INVALID');
      continue;
    }
    txIds.add(String(entry.source_txid));
    if (entry.table_name === 'sfi_cases') {
      const id = String(entry.row_data.id ?? '').trim();
      if (!id || entry.operation !== 'UPSERT') {
        blockers.push('REPLAY_PARENT_SNAPSHOT_INVALID');
      } else {
        const versions = parentById.get(id) ?? [];
        versions.push(entry);
        parentById.set(id, versions);
      }
    } else if (CHILDREN.has(entry.table_name)) {
      const id = String(entry.row_data.case_id ?? entry.before_data?.case_id ?? '').trim();
      if (!id) blockers.push('REPLAY_CASE_ID_MISSING');
      else touched.add(id);
    }
  }
  if (txIds.size !== 1) blockers.push('REPLAY_TRANSACTION_MIXED');
  for (const id of touched) {
    const parents = parentById.get(id);
    if (!parents?.length) {
      blockers.push('REPLAY_PARENT_REVISION_SNAPSHOT_MISSING');
      continue;
    }
    // One canonical operation may touch the case row multiple times in the
    // same transaction. Require every parent snapshot to be well formed,
    // but do not assume the outbox delivered duplicate updates in a stable order.
    const validParents = parents.filter(parent =>
      validRevision(parent.row_data.closure_revision) && validTime(parent.row_data.updated_at));
    if (validParents.length !== parents.length) {
      blockers.push('REPLAY_PARENT_REVISION_INVALID');
      continue;
    }
    const newRevisions = validParents.map(parent => BigInt(String(parent.row_data.closure_revision)));
    const latestRevision = newRevisions.reduce((max, value) => value > max ? value : max);
    const priorRevisions = validParents.flatMap(parent =>
      validRevision(parent.before_data?.closure_revision)
        ? [BigInt(String(parent.before_data.closure_revision))] : []);
    if (priorRevisions.length && latestRevision <= priorRevisions.reduce(
      (min, value) => value < min ? value : min)) {
      blockers.push('REPLAY_PARENT_REVISION_NOT_ADVANCED');
    }
    const duplicateRevisions = new Set(newRevisions.map(String));
    if (duplicateRevisions.size !== newRevisions.length) blockers.push('REPLAY_PARENT_REVISION_AMBIGUOUS');

  }
  if (options.requireTouchedCase === true && touched.size === 0) blockers.push('REPLAY_CASE_CHILD_REQUIRED');
  return {
    validated: blockers.length === 0,
    blockers: [...new Set(blockers)].sort(),
    caseCount: touched.size,
  };
}

/**
 * Legacy Case Platform traffic remains allowed until the closure migration is
 * activated. Once a batch carries migrated parent rows (or the explicit
 * deployment guard is enabled), require parent revisions for all child writes.
 * A batch of unrelated tables does not need a case revision.
 */
export function assessCaseMirrorDelivery(entries, options = {}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { allowed: false, enforced: true, blockers: ['REPLAY_BATCH_REQUIRED'], caseCount: 0 };
  }
  const touched = entries.some(entry => CHILDREN.has(entry?.table_name));
  if (!touched) {
    return { allowed: true, enforced: false, blockers: [], caseCount: 0 };
  }
  const activatedParent = entries.some(entry =>
    entry?.table_name === 'sfi_cases' &&
    isObject(entry.row_data) &&
    Object.prototype.hasOwnProperty.call(entry.row_data, 'closure_revision'));
  const enforce = options.strict === true || activatedParent;
  if (!enforce) {
    return { allowed: true, enforced: false, blockers: [], caseCount: 0 };
  }
  const result = assessCaseRevisionReplayBatch(entries, { requireTouchedCase: true });
  return { allowed: result.validated, enforced: true, blockers: result.blockers, caseCount: result.caseCount };
}
