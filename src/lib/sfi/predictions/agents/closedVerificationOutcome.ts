import type { SfiPredictionVerification } from '../types';

/**
 * Deterministic, conservative aggregation of formally closed verifications.
 * Individual windows are retained by consumers; conflicting windows or a
 * disputed verification prohibit an aggregate TRUE/FALSE claim. This does not
 * imply the underlying temporal observations are logically inconsistent.
 */
export function closedVerificationOutcome(verifications: readonly SfiPredictionVerification[]) {
  const active = verifications.filter((v) => v.verification_state !== 'SUPERSEDED');
  const closed = active.filter((v) => v.verification_state === 'CLOSED');
  const disputed = active.filter((v) => v.verification_state === 'DISPUTED');
  const eligible = closed.filter((v) => v.evaluation_result === 'TRUE' || v.evaluation_result === 'FALSE');
  const mixedClosedResults = new Set(eligible.map((v) => v.evaluation_result)).size > 1;
  const verdict: 'TRUE' | 'FALSE' | null =
    disputed.length === 0 && !mixedClosedResults && eligible.length > 0
      ? (eligible[0].evaluation_result as 'TRUE' | 'FALSE')
      : null;
  return { active, closed, disputed, eligible, mixedClosedResults, verdict };
}
