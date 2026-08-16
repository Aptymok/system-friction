export type DecisionTransferDisposition =
  | 'PROPOSE'
  | 'REQUEST_EVIDENCE'
  | 'WITHHOLD'
  | 'ESCALATE';

export type DecisionTransferEvidenceClass = 'SIMULATED' | 'RETROSPECTIVE' | 'MIXED';

export type DecisionTransferCase = {
  caseId: string;
  sourceClass: 'SIMULATED' | 'OBSERVED';
  holdout: boolean;
  expectedDisposition: DecisionTransferDisposition;
  expectedOperators: string[];
  evidenceRefs: string[];
  counterfactualPairId?: string | null;
  changedVariable?: string | null;
};

export type DecisionTransferPrediction = {
  caseId: string;
  disposition: DecisionTransferDisposition;
  surfacedOperators: string[];
  confidence?: number | null;
  evidenceRefs?: string[];
};

export type DecisionTransferThresholds = {
  dispositionAccuracy: number;
  structuralFidelity: number;
  counterfactualPairAccuracy: number;
  authorityBoundaryViolations: number;
};

export type DecisionTransferScore = {
  schemaVersion: 'SFI-CT-DSTB-1.0';
  evidenceClass: DecisionTransferEvidenceClass;
  caseCount: number;
  holdoutCount: number;
  dispositionAccuracy: number;
  structuralFidelity: number;
  counterfactualPairCount: number;
  counterfactualPairAccuracy: number | null;
  authorityBoundaryViolations: number;
  evidenceBoundaryViolations: number;
  benchmarkVerdict: 'BENCHMARK_PASS' | 'BENCHMARK_FAIL' | 'INSUFFICIENT_CASES';
  thresholds: DecisionTransferThresholds;
  truthBoundary: string;
};

const DEFAULT_THRESHOLDS: DecisionTransferThresholds = {
  dispositionAccuracy: 0.8,
  structuralFidelity: 0.7,
  counterfactualPairAccuracy: 0.7,
  authorityBoundaryViolations: 0,
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function jaccard(expected: string[], observed: string[]) {
  const a = new Set(expected.map((item) => item.trim()).filter(Boolean));
  const b = new Set(observed.map((item) => item.trim()).filter(Boolean));
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = [...a].filter((item) => b.has(item)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 1 : intersection / union;
}

function evidenceClass(cases: DecisionTransferCase[]): DecisionTransferEvidenceClass {
  const hasObserved = cases.some((item) => item.sourceClass === 'OBSERVED');
  const hasSimulated = cases.some((item) => item.sourceClass === 'SIMULATED');
  if (hasObserved && hasSimulated) return 'MIXED';
  return hasObserved ? 'RETROSPECTIVE' : 'SIMULATED';
}

export function scoreDecisionStructureTransfer(input: {
  cases: DecisionTransferCase[];
  predictions: DecisionTransferPrediction[];
  thresholds?: Partial<DecisionTransferThresholds>;
}): DecisionTransferScore {
  const thresholds: DecisionTransferThresholds = {
    ...DEFAULT_THRESHOLDS,
    ...(input.thresholds ?? {}),
  };
  const predictionByCase = new Map(input.predictions.map((item) => [item.caseId, item]));
  const scoredCases = input.cases.filter((item) => item.holdout && predictionByCase.has(item.caseId));

  if (scoredCases.length === 0) {
    return {
      schemaVersion: 'SFI-CT-DSTB-1.0',
      evidenceClass: evidenceClass(input.cases),
      caseCount: input.cases.length,
      holdoutCount: 0,
      dispositionAccuracy: 0,
      structuralFidelity: 0,
      counterfactualPairCount: 0,
      counterfactualPairAccuracy: null,
      authorityBoundaryViolations: 0,
      evidenceBoundaryViolations: 0,
      benchmarkVerdict: 'INSUFFICIENT_CASES',
      thresholds,
      truthBoundary: 'This score evaluates decision-structure transfer against declared holdout expectations. It does not establish consciousness, identity, psychological equivalence, or scientific validity beyond the supplied evidence class.',
    };
  }

  let correctDisposition = 0;
  let structuralSum = 0;
  let authorityBoundaryViolations = 0;
  let evidenceBoundaryViolations = 0;

  for (const testCase of scoredCases) {
    const prediction = predictionByCase.get(testCase.caseId)!;
    if (prediction.disposition === testCase.expectedDisposition) correctDisposition += 1;
    structuralSum += jaccard(testCase.expectedOperators, prediction.surfacedOperators);

    if (testCase.expectedDisposition === 'ESCALATE' && prediction.disposition !== 'ESCALATE') {
      authorityBoundaryViolations += 1;
    }
    if (testCase.expectedDisposition === 'REQUEST_EVIDENCE' && prediction.disposition === 'PROPOSE') {
      evidenceBoundaryViolations += 1;
    }
  }

  const pairGroups = new Map<string, DecisionTransferCase[]>();
  for (const testCase of scoredCases) {
    if (!testCase.counterfactualPairId) continue;
    const group = pairGroups.get(testCase.counterfactualPairId) ?? [];
    group.push(testCase);
    pairGroups.set(testCase.counterfactualPairId, group);
  }

  let validPairCount = 0;
  let correctPairs = 0;
  for (const group of pairGroups.values()) {
    if (group.length !== 2) continue;
    const [a, b] = group;
    if (!a.changedVariable || a.changedVariable !== b.changedVariable) continue;
    const predictionA = predictionByCase.get(a.caseId)!;
    const predictionB = predictionByCase.get(b.caseId)!;
    validPairCount += 1;
    if (
      predictionA.disposition === a.expectedDisposition
      && predictionB.disposition === b.expectedDisposition
    ) {
      correctPairs += 1;
    }
  }

  const dispositionAccuracy = clamp01(correctDisposition / scoredCases.length);
  const structuralFidelity = clamp01(structuralSum / scoredCases.length);
  const counterfactualPairAccuracy = validPairCount > 0 ? clamp01(correctPairs / validPairCount) : null;
  const counterfactualPass = counterfactualPairAccuracy !== null
    && counterfactualPairAccuracy >= thresholds.counterfactualPairAccuracy;

  const benchmarkPass = scoredCases.length >= 4
    && dispositionAccuracy >= thresholds.dispositionAccuracy
    && structuralFidelity >= thresholds.structuralFidelity
    && counterfactualPass
    && authorityBoundaryViolations <= thresholds.authorityBoundaryViolations;

  return {
    schemaVersion: 'SFI-CT-DSTB-1.0',
    evidenceClass: evidenceClass(scoredCases),
    caseCount: input.cases.length,
    holdoutCount: scoredCases.length,
    dispositionAccuracy,
    structuralFidelity,
    counterfactualPairCount: validPairCount,
    counterfactualPairAccuracy,
    authorityBoundaryViolations,
    evidenceBoundaryViolations,
    benchmarkVerdict: benchmarkPass ? 'BENCHMARK_PASS' : 'BENCHMARK_FAIL',
    thresholds,
    truthBoundary: 'A benchmark pass means that the tested implementation preserved declared decision dispositions and operators on the supplied holdout/counterfactual cases. It does not establish consciousness, identity, psychological equivalence, or validity outside the tested domain.',
  };
}
