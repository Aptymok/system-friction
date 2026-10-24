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
      if (!id || entry.operation !== 'UPSERT' || parentById.has(id)) {
        blockers.push('REPLAY_PARENT_SNAPSHOT_INVALID');
      } else {
        parentById.set(id, entry);
      }
    } else if (CHILDREN.has(entry.table_name)) {
      const id = String(entry.row_data.case_id ?? entry.before_data?.case_id ?? '').trim();
      if (!id) blockers.push('REPLAY_CASE_ID_MISSING');
      else touched.add(id);
    }
  }
  if (txIds.size !== 1) blockers.push('REPLAY_TRANSACTION_MIXED');
  for (const id of touched) {
    const parent = parentById.get(id);
    if (!parent) {
      blockers.push('REPLAY_PARENT_REVISION_SNAPSHOT_MISSING');
      continue;
    }
    const row = parent.row_data;
    if (!validRevision(row.closure_revision) || !validTime(row.updated_at)) {
      blockers.push('REPLAY_PARENT_REVISION_INVALID');
      continue;
    }
    const oldRevision = parent.before_data?.closure_revision;
    if (oldRevision !== undefined && oldRevision !== null && validRevision(oldRevision) &&
        BigInt(String(row.closure_revision)) <= BigInt(String(oldRevision))) {
      blockers.push('REPLAY_PARENT_REVISION_NOT_ADVANCED');
    }
  }
  if (options.requireTouchedCase === true && touched.size === 0) blockers.push('REPLAY_CASE_CHILD_REQUIRED');
  return {
    validated: blockers.length === 0,
    blockers: [...new Set(blockers)].sort(),
    caseCount: touched.size,
  };
}
