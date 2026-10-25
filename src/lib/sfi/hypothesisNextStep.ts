import { parseHypothesisTestContract } from '@/lib/world-observatory/hypothesisTestContract';

/**
 * Bounded route selection inside the existing universal cycle. Nothing here
 * observes, executes, accepts evidence, certifies causality or promotes learning.
 * Every utility value is a DECLARED estimate, not calibrated information gain.
 */
export const SFI_NEXT_DISCRIMINATOR_CONTRACT = 'SFI-NEXT-DISCRIMINATOR-1.0' as const;

export type HypothesisTestCandidate = {
  hypothesisId: string;
  rivalHypothesisId: string;
  statement: string;
  priorPlausibility: number;
  estimatedDiscrimination: number;
  estimatedDurationHours: number;
  estimatedCostUnits: number;
  estimatedRisk: number;
  sourceRefs: string[];
  testContract: unknown;
  observationMode: 'READ_ONLY';
};

export type SelectedHypothesisTest = {
  hypothesisId: string;
  rivalHypothesisId: string;
  statement: string;
  testContract: NonNullable<ReturnType<typeof parseHypothesisTestContract>>;
  sourceRefs: string[];
  observationMode: 'READ_ONLY';
  estimates: {
    priorPlausibility: number;
    discrimination: number;
    durationHours: number;
    costUnits: number;
    risk: number;
  };
  heuristicScore: number;
  reason: string;
};

const bounded01 = (x: unknown): x is number =>
  typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;

export function selectNextDiscriminatingTest(
  candidates: HypothesisTestCandidate[],
): {
  contract: typeof SFI_NEXT_DISCRIMINATOR_CONTRACT;
  state: 'PROPOSED_NOT_AUTHORIZED' | 'NO_ELIGIBLE_TEST';
  selected: SelectedHypothesisTest | null;
  rejected: { hypothesisId: string; reason: string }[];
  boundary: string;
} {
  const rejected: { hypothesisId: string; reason: string }[] = [];
  const eligible: SelectedHypothesisTest[] = [];
  for (const candidate of candidates.slice(0, 24)) {
    const id = typeof candidate.hypothesisId === 'string' ? candidate.hypothesisId.trim() : '';
    const rival = typeof candidate.rivalHypothesisId === 'string' ? candidate.rivalHypothesisId.trim() : '';
    const contract = parseHypothesisTestContract(candidate.testContract);
    const refs = Array.isArray(candidate.sourceRefs)
      ? [...new Set(candidate.sourceRefs.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim()))].slice(0,20)
      : [];
    if (!id || !rival || id === rival || !candidate.statement?.trim() || !contract
      || !refs.length || candidate.observationMode !== 'READ_ONLY'
      || !bounded01(candidate.priorPlausibility)
      || !bounded01(candidate.estimatedDiscrimination)
      || !bounded01(candidate.estimatedRisk)
      || !Number.isFinite(candidate.estimatedCostUnits) || candidate.estimatedCostUnits < 0
      || !Number.isFinite(candidate.estimatedDurationHours) || candidate.estimatedDurationHours <= 0) {
      rejected.push({ hypothesisId: id || 'UNKNOWN', reason: 'MISSING_PREREGISTRATION_OR_ESTIMATE' });
      continue;
    }
    if (candidate.estimatedRisk > 0.25 || candidate.estimatedCostUnits > 0) {
      rejected.push({ hypothesisId: id, reason: 'REQUIRES_BUDGET_OR_RISK_AUTHORITY' });
      continue;
    }
    // This is a deterministic prioritization heuristic. It intentionally
    // considers low-plausibility, high-discrimination hypotheses for REFUTATION.
    // It is NOT a probabilistic forecast or actual expected information gain.
    const score = Number((
      candidate.estimatedDiscrimination * (0.75 + 0.25 * (1 - candidate.priorPlausibility))
      + 0.1 / (1 + candidate.estimatedDurationHours)
      - 0.1 * candidate.estimatedRisk
    ).toFixed(6));
    eligible.push({
      hypothesisId: id, rivalHypothesisId: rival,
      statement: candidate.statement.trim().slice(0,1600),
      testContract: contract, sourceRefs: refs, observationMode: 'READ_ONLY',
      estimates: {
        priorPlausibility: candidate.priorPlausibility,
        discrimination: candidate.estimatedDiscrimination,
        durationHours: candidate.estimatedDurationHours,
        costUnits: candidate.estimatedCostUnits,
        risk: candidate.estimatedRisk,
      },
      heuristicScore: score,
      reason: 'Choose the most discriminating bounded observation, even when the hypothesis is probably false. Refutation is information, not validation.',
    });
  }
  eligible.sort((a,b) => b.heuristicScore - a.heuristicScore
    || a.hypothesisId.localeCompare(b.hypothesisId));
  const selected = eligible[0] ?? null;
  return {
    contract: SFI_NEXT_DISCRIMINATOR_CONTRACT,
    state: selected ? 'PROPOSED_NOT_AUTHORIZED' : 'NO_ELIGIBLE_TEST',
    selected,
    rejected,
    boundary: 'DECLARED_ESTIMATES_ONLY. No evidence accepted, no action performed, no prediction certified, no actual information gain established, no financial authority. Existing RETURN contrast and learning quarantine remain authoritative.',
  };
}
