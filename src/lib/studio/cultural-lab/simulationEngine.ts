import type { InterventionCandidate } from './types';

export function simulateVectorShift(candidates: InterventionCandidate[]) {
  return candidates.reduce<Record<string, number>>((acc, candidate) => {
    Object.entries(candidate.expectedVectorShift).forEach(([key, value]) => {
      acc[key] = Number(((acc[key] ?? 0) + value).toFixed(3));
    });
    return acc;
  }, {});
}
