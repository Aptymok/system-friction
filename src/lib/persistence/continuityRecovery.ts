import 'server-only';

/**
 * SFI-DB-NO-REPLICATION-2026-10-25.
 * Legacy continuity replay was retired by explicit founder decision.
 * Original implementation is retained in Git history and a database backup;
 * this callable surface remains for compatibility and performs zero writes.
 */
export async function recoverPrimaryDataPlane(input: { maxTransactions?: number } = {}) {
  void input;
  return { ok:false as const, recovered:false as const, attempted:false as const,
    reason:'SFI_REPLICATION_RETIRED_BY_FOUNDER' as const };
}
