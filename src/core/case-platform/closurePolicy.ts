export type CaseReviewCycle = {
  cycleId: string;
  result: 'unchanged' | 'progress' | 'blocked';
};

export function evaluateCaseInactivity(reviews: readonly CaseReviewCycle[], configuredThreshold = 3) {
  const threshold = Number.isSafeInteger(configuredThreshold) && configuredThreshold >= 2
    ? configuredThreshold
    : 3;
  const seen = new Set<string>();
  let inactiveCycles = 0;
  let blocked = false;

  for (const review of reviews) {
    if (!review.cycleId || seen.has(review.cycleId)) continue;
    seen.add(review.cycleId);
    blocked = review.result === 'blocked';
    if (review.result === 'progress') inactiveCycles = 0;
    if (review.result === 'unchanged') inactiveCycles++;
  }

  const action = blocked ? 'blocked'
    : inactiveCycles >= threshold ? 'close'
    : inactiveCycles === threshold - 1 ? 'alert'
    : 'wait';
  return { inactiveCycles, threshold, action };
}
