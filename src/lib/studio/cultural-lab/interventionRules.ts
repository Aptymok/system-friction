import type { InterventionCandidate } from './types';

export function requiresHumanReview(candidate: InterventionCandidate) {
  return candidate.risk !== 'low' || !candidate.reversible;
}
