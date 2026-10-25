/**
 * C07: narrow, pure guard for an already admitted CASE mission.
 * Reuses Case Platform status/revision; does not create a second case store.
 */
export const C07_AUTONOMOUS_CASE_STATES = ['OPEN','OBSERVING','ANALYZING'] as const;
export type C07CaseQueueState = {
  status: unknown;
  updatedAt: unknown;
  deletedAt?: unknown;
};
export type C07CaseQueueResult =
  | { ok: true; revision: string }
  | { ok: false; reason: 'CASE_NOT_OPEN_FOR_AUTONOMOUS_ANALYSIS' | 'CASE_DELETED' | 'CASE_REVISION_MISSING' | 'CASE_CHANGED_SINCE_ADMISSION' };

export function checkC07CaseQueueState(
  current: C07CaseQueueState,
  admittedRevision?: string | null,
): C07CaseQueueResult {
  if (current.deletedAt !== null && current.deletedAt !== undefined) {
    return { ok:false, reason:'CASE_DELETED' };
  }
  if (!C07_AUTONOMOUS_CASE_STATES.includes(current.status as typeof C07_AUTONOMOUS_CASE_STATES[number])) {
    return { ok:false, reason:'CASE_NOT_OPEN_FOR_AUTONOMOUS_ANALYSIS' };
  }
  const revision = typeof current.updatedAt === 'string' && current.updatedAt.trim()
    ? current.updatedAt.trim() : null;
  if (!revision || !Number.isFinite(Date.parse(revision))) {
    return { ok:false, reason:'CASE_REVISION_MISSING' };
  }
  if (admittedRevision !== undefined && admittedRevision !== revision) {
    return { ok:false, reason:'CASE_CHANGED_SINCE_ADMISSION' };
  }
  return { ok:true, revision };
}
