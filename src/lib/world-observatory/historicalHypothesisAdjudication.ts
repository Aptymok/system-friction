import type {
  HypothesisClassification,
  HypothesisCriterionResult,
} from './hypothesisTestContract';

// Historical adjudication is a bounded compatibility path inside the existing World calibrator.
// It does not create a second writer, authority surface, or learning lane.
export type LegacyFrozenSignal = {
  id: string;
  kind: 'EXPECTED' | 'CONTRADICTION';
  signal: string;
};

function strings(value: unknown, max = 24): string[] {
  return Array.isArray(value)
    ? [...new Set(
      value
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim()),
    )].slice(0, max)
    : [];
}

export function buildLegacyFrozenSignals(input: {
  expectedSignals: unknown;
  contradictionSignals: unknown;
}) {
  const expected = strings(input.expectedSignals).map((signal, index) => ({
    id: `legacy-expected-${index + 1}`,
    kind: 'EXPECTED' as const,
    signal,
  }));
  const contradiction = strings(input.contradictionSignals).map((signal, index) => ({
    id: `legacy-contradiction-${index + 1}`,
    kind: 'CONTRADICTION' as const,
    signal,
  }));
  return { expected, contradiction };
}

export function filterLegacyCriterionEvidence(
  criterionResults: HypothesisCriterionResult[],
  availableEvidenceIds: Set<string>,
): HypothesisCriterionResult[] {
  return criterionResults.map((result) => ({
    ...result,
    evidenceIds: result.evidenceIds.filter((id) => availableEvidenceIds.has(id)),
  }));
}

function evidenceBackedSatisfied(
  result: HypothesisCriterionResult | undefined,
) {
  return result?.verdict === 'SATISFIED' && result.evidenceIds.length > 0;
}

export function classifyLegacyFrozenSignals(input: {
  expected: LegacyFrozenSignal[];
  contradiction: LegacyFrozenSignal[];
  criterionResults: HypothesisCriterionResult[];
}): {
  classification: HypothesisClassification;
  reason: string;
  decisive: boolean;
} {
  const byId = new Map(
    input.criterionResults.map((result) => [result.criterionId, result]),
  );

  const contradictionSatisfied = input.contradiction.some((criterion) =>
    evidenceBackedSatisfied(byId.get(criterion.id)),
  );

  if (contradictionSatisfied) {
    return {
      classification: 'CONTRADICTED',
      reason: 'At least one frozen legacy contradiction signal was satisfied by evidence acquired inside the original validation window.',
      decisive: true,
    };
  }

  if (!input.expected.length) {
    return {
      classification: 'INCONCLUSIVE',
      reason: 'The legacy hypothesis had no frozen expected signal that can be adjudicated without inventing a retrospective criterion.',
      decisive: false,
    };
  }

  const satisfiedExpected = input.expected.filter((criterion) =>
    evidenceBackedSatisfied(byId.get(criterion.id)),
  );

  if (satisfiedExpected.length === input.expected.length) {
    return {
      classification: 'VALIDATED',
      reason: 'All frozen legacy expected signals were satisfied by evidence acquired inside the original validation window and no frozen contradiction signal was satisfied.',
      decisive: true,
    };
  }

  if (satisfiedExpected.length > 0) {
    return {
      classification: 'PARTIALLY_VALIDATED',
      reason: `${satisfiedExpected.length}/${input.expected.length} frozen legacy expected signals were satisfied by evidence acquired inside the original validation window.`,
      decisive: false,
    };
  }

  return {
    classification: 'INCONCLUSIVE',
    reason: 'The frozen legacy signals could not discriminate the hypothesis from its rivals using evidence acquired inside the original validation window.',
    decisive: false,
  };
}
