export const SFI_HYPOTHESIS_TEST_CONTRACT = 'SFI-HYPOTHESIS-TEST-1.0' as const;

export type HypothesisOperator =
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'EQ'
  | 'DELTA_GTE'
  | 'DELTA_LTE'
  | 'COUNT_GTE'
  | 'PRESENCE'
  | 'ABSENCE';

export type HypothesisCriterion = {
  id: string;
  signal: string;
  metric: string | null;
  operator: HypothesisOperator;
  threshold: number | null;
  unit: string | null;
  required: boolean;
  minimumObservations: number;
  sourceFamilies: string[];
};

export type HypothesisTestContract = {
  contract: typeof SFI_HYPOTHESIS_TEST_CONTRACT;
  horizonHours: number;
  horizonBasis: string;
  horizonClass: 'SHORT' | 'MEDIUM' | 'LONG';
  minimumEvidenceCount: number;
  minimumSourceFamilies: number;
  expectedCriteria: HypothesisCriterion[];
  contradictionCriteria: HypothesisCriterion[];
  passRule: string;
  failRule: string;
  inconclusiveRule: string;
};

export type HypothesisCriterionResult = {
  criterionId: string;
  verdict: 'SATISFIED' | 'NOT_SATISFIED' | 'NOT_DETERMINABLE';
  evidenceIds: string[];
  reason: string;
};

export type HypothesisClassification = 'VALIDATED' | 'PARTIALLY_VALIDATED' | 'CONTRADICTED' | 'INCONCLUSIVE';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, max = 2000) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function strings(value: unknown, max = 20) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))].slice(0, max)
    : [];
}

function positiveInteger(value: unknown, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(parsed)));
}

const THRESHOLD_OPERATORS = new Set<HypothesisOperator>(['GT','GTE','LT','LTE','EQ','DELTA_GTE','DELTA_LTE','COUNT_GTE']);
const OPERATORS = new Set<HypothesisOperator>([...THRESHOLD_OPERATORS, 'PRESENCE', 'ABSENCE']);

function parseCriterion(value: unknown, fallbackId: string): HypothesisCriterion | null {
  const item = record(value);
  const id = text(item.id, 120) ?? fallbackId;
  const signal = text(item.signal, 1200);
  const operator = text(item.operator, 40)?.toUpperCase() as HypothesisOperator | undefined;
  if (!signal || !operator || !OPERATORS.has(operator)) return null;

  const rawThreshold = item.threshold;
  const threshold = rawThreshold === null || typeof rawThreshold === 'undefined' || rawThreshold === '' ? null : Number(rawThreshold);
  if (THRESHOLD_OPERATORS.has(operator) && !Number.isFinite(threshold)) return null;

  return {
    id,
    signal,
    metric: text(item.metric, 240),
    operator,
    threshold: Number.isFinite(threshold) ? threshold : null,
    unit: text(item.unit, 120),
    required: item.required !== false,
    minimumObservations: positiveInteger(item.minimumObservations, 1, 100),
    sourceFamilies: strings(item.sourceFamilies, 20),
  };
}

export function parseHypothesisTestContract(value: unknown): HypothesisTestContract | null {
  const input = record(value);
  const contract = text(input.contract, 120);
  if (contract !== SFI_HYPOTHESIS_TEST_CONTRACT) return null;

  const horizonHours = Number(input.horizonHours);
  // No silent truncation: an invalid horizon makes the hypothesis contract invalid.
  if (!Number.isFinite(horizonHours) || horizonHours < 1 || horizonHours > 8760) return null;
  const horizonBasis = text(input.horizonBasis, 1200);
  if (!horizonBasis) return null;

  const expectedCriteria = Array.isArray(input.expectedCriteria)
    ? input.expectedCriteria.slice(0, 12).map((item, index) => parseCriterion(item, `expected-${index + 1}`)).filter((item): item is HypothesisCriterion => Boolean(item))
    : [];
  const contradictionCriteria = Array.isArray(input.contradictionCriteria)
    ? input.contradictionCriteria.slice(0, 12).map((item, index) => parseCriterion(item, `contradiction-${index + 1}`)).filter((item): item is HypothesisCriterion => Boolean(item))
    : [];

  if (!expectedCriteria.length || !contradictionCriteria.length) return null;
  if (expectedCriteria.some((criterion) => !criterion.required)) {
    // Expected tests may include optional diagnostics, but at least one required discriminator must remain.
    if (!expectedCriteria.some((criterion) => criterion.required)) return null;
  }

  const horizonClass = horizonHours <= 72 ? 'SHORT' : horizonHours <= 720 ? 'MEDIUM' : 'LONG';
  return {
    contract: SFI_HYPOTHESIS_TEST_CONTRACT,
    horizonHours,
    horizonBasis,
    horizonClass,
    minimumEvidenceCount: positiveInteger(input.minimumEvidenceCount, 1, 100),
    minimumSourceFamilies: positiveInteger(input.minimumSourceFamilies, 1, 20),
    expectedCriteria,
    contradictionCriteria,
    passRule: text(input.passRule, 1200) ?? 'All required expected criteria are SATISFIED and no contradiction criterion is SATISFIED.',
    failRule: text(input.failRule, 1200) ?? 'At least one preregistered contradiction criterion is SATISFIED.',
    inconclusiveRule: text(input.inconclusiveRule, 1200) ?? 'Coverage is insufficient or required criteria remain NOT_DETERMINABLE at the end of the window.',
  };
}

export function parseCriterionResults(value: unknown): HypothesisCriterionResult[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(['SATISFIED','NOT_SATISFIED','NOT_DETERMINABLE']);
  return value.slice(0, 40).flatMap((entry) => {
    const item = record(entry);
    const criterionId = text(item.criterionId, 120);
    const verdict = text(item.verdict, 40)?.toUpperCase();
    if (!criterionId || !verdict || !allowed.has(verdict)) return [];
    return [{
      criterionId,
      verdict: verdict as HypothesisCriterionResult['verdict'],
      evidenceIds: strings(item.evidenceIds, 100),
      reason: text(item.reason, 2000) ?? 'No reason supplied.',
    }];
  });
}

export function classifyHypothesisTestContract(input: {
  contract: HypothesisTestContract;
  criterionResults: HypothesisCriterionResult[];
  linkedEvidenceCount: number;
  linkedSourceFamilies: number;
}): { classification: HypothesisClassification; reason: string; decisive: boolean } {
  const { contract, criterionResults } = input;
  const byId = new Map(criterionResults.map((result) => [result.criterionId, result]));
  const coverageSatisfied = input.linkedEvidenceCount >= contract.minimumEvidenceCount
    && input.linkedSourceFamilies >= contract.minimumSourceFamilies;

  if (!coverageSatisfied) {
    return {
      classification: 'INCONCLUSIVE',
      reason: `Coverage below preregistered minimum: evidence ${input.linkedEvidenceCount}/${contract.minimumEvidenceCount}, source families ${input.linkedSourceFamilies}/${contract.minimumSourceFamilies}.`,
      decisive: false,
    };
  }

  const contradictionSatisfied = contract.contradictionCriteria.some((criterion) => byId.get(criterion.id)?.verdict === 'SATISFIED');
  if (contradictionSatisfied) {
    return {
      classification: 'CONTRADICTED',
      reason: 'At least one preregistered contradiction criterion was satisfied within the validation window.',
      decisive: true,
    };
  }

  const requiredExpected = contract.expectedCriteria.filter((criterion) => criterion.required);
  const satisfiedExpected = requiredExpected.filter((criterion) => byId.get(criterion.id)?.verdict === 'SATISFIED');
  const undeterminedExpected = requiredExpected.filter((criterion) => !byId.has(criterion.id) || byId.get(criterion.id)?.verdict === 'NOT_DETERMINABLE');

  if (requiredExpected.length > 0 && satisfiedExpected.length === requiredExpected.length) {
    return {
      classification: 'VALIDATED',
      reason: 'All required preregistered expected criteria were satisfied and no contradiction criterion was satisfied.',
      decisive: true,
    };
  }

  // Partial validation is reserved for genuinely multi-criterion hypotheses; it is not the fallback for ambiguity.
  if (requiredExpected.length > 1 && satisfiedExpected.length > 0 && undeterminedExpected.length < requiredExpected.length) {
    return {
      classification: 'PARTIALLY_VALIDATED',
      reason: `${satisfiedExpected.length}/${requiredExpected.length} required expected criteria were satisfied without a satisfied contradiction criterion.`,
      decisive: false,
    };
  }

  return {
    classification: 'INCONCLUSIVE',
    reason: 'The preregistered test did not discriminate the hypothesis from its rivals within the available evidence.',
    decisive: false,
  };
}
