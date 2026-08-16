export type DecisionDisposition =
  | 'PROPOSE'
  | 'REQUEST_EVIDENCE'
  | 'ESCALATE'
  | 'WITHHOLD'
  | 'ARCHIVE_ONLY';

export type DecisionTraceEpistemicClass =
  | 'OBSERVED'
  | 'VERIFIED_CONTRAST'
  | 'DERIVED'
  | 'INFERRED'
  | 'SIMULATED';

export type CognitiveOperationMaturity =
  | 'CANDIDATE'
  | 'RECURRENT'
  | 'CROSS_DOMAIN'
  | 'CONTRASTED'
  | 'STABLE_PATTERN'
  | 'RULE_CANDIDATE';

export type DecisionTrace = {
  traceId: string;
  domain: string;
  disposition: DecisionDisposition;
  operations: string[];
  relevantVariables: string[];
  rejectedConditions: string[];
  whatWouldChangeDecision: string[];
  evidenceRefs: string[];
  epistemicClass: DecisionTraceEpistemicClass;
};

export type DecisionReconstruction = {
  traceId: string;
  disposition: DecisionDisposition;
  operations: string[];
  relevantVariables: string[];
  rejectedConditions?: string[];
  whatWouldChangeDecision?: string[];
};

export type ReconstructionWeights = {
  disposition: number;
  operations: number;
  variables: number;
  rejectedConditions: number;
  counterfactualCues: number;
};

export const DEFAULT_RECONSTRUCTION_WEIGHTS: ReconstructionWeights = {
  disposition: 0.45,
  operations: 0.25,
  variables: 0.15,
  rejectedConditions: 0.05,
  counterfactualCues: 0.10,
};

export type ReconstructionScore = {
  traceId: string;
  dispositionMatch: boolean;
  operationJaccard: number;
  variableJaccard: number;
  rejectedConditionJaccard: number;
  counterfactualCueJaccard: number;
  structuralFidelity: number;
};

export type HoldoutEvaluation = {
  traceCount: number;
  predictedCount: number;
  missingTraceIds: string[];
  decisionAccuracy: number;
  meanStructuralFidelity: number;
  meanOperationJaccard: number;
  meanVariableJaccard: number;
  validatedTraceCount: number;
  validatedPredictedCount: number;
  validatedDecisionAccuracy: number;
  validatedMeanStructuralFidelity: number;
  byDomain: Record<string, {
    traceCount: number;
    decisionAccuracy: number;
    meanStructuralFidelity: number;
  }>;
  scores: ReconstructionScore[];
};

export type OperationOccurrence = {
  occurrenceId: string;
  operationKey: string;
  traceId: string;
  domain: string;
  support: 'SUPPORT' | 'COUNTEREXAMPLE';
  epistemicClass: DecisionTraceEpistemicClass;
  evidenceRefs: string[];
};

export type OperationPromotionReport = {
  operationKey: string;
  maturity: CognitiveOperationMaturity;
  qualifyingSupportCount: number;
  qualifyingCounterexampleCount: number;
  qualifyingDomains: string[];
  verifiedContrastCount: number;
  simulatedOccurrenceCount: number;
  boundaryProbeCount: number;
  evidenceRefs: string[];
  reasons: string[];
  mayAutoPromoteToRule: false;
};

export type CounterfactualProbe = {
  probeId: string;
  baseTraceId: string;
  variableKey: string;
  direction: 'INCREASE' | 'DECREASE' | 'TOGGLE' | 'REPLACE';
  baselineDisposition: DecisionDisposition;
  expectedDispositionAfterPerturbation: DecisionDisposition;
  predictedDispositionAfterPerturbation: DecisionDisposition;
  epistemicClass: 'OBSERVED' | 'VERIFIED_CONTRAST' | 'SIMULATED' | 'DERIVED';
  evidenceRefs: string[];
};

export type CounterfactualEvaluation = {
  probeCount: number;
  expectedSwitchCount: number;
  detectedSwitchCount: number;
  correctTargetCount: number;
  falseSwitchCount: number;
  switchDetectionRate: number;
  targetDispositionAccuracy: number;
  falseSwitchRate: number;
  observedOrVerifiedProbeCount: number;
  validatedExpectedSwitchCount: number;
  validatedCorrectTargetCount: number;
  validatedTargetDispositionAccuracy: number;
  simulatedProbeCount: number;
  evidenceRefs: string[];
};

export type DecisionTransferEvaluation = {
  schemaVersion: 'SFI-CT-DECISION-TRANSFER-1.0';
  epistemicClass: 'DERIVED';
  holdout: HoldoutEvaluation;
  counterfactual: CounterfactualEvaluation;
  promotion: OperationPromotionReport;
  pass: boolean;
  gates: {
    minimumDecisionAccuracy: number;
    minimumStructuralFidelity: number;
    minimumCounterfactualTargetAccuracy: number;
    requiresNonSimulatedEvidence: true;
  };
  limitations: string[];
};

function uniqueStrings(values: string[] | undefined): string[] {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean))).sort();
}

function jaccard(left: string[] | undefined, right: string[] | undefined): number {
  const a = new Set(uniqueStrings(left));
  const b = new Set(uniqueStrings(right));
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = [...a].filter((value) => b.has(value)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 1 : intersection / union;
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isValidationClass(epistemicClass: DecisionTraceEpistemicClass): boolean {
  return epistemicClass === 'OBSERVED' || epistemicClass === 'VERIFIED_CONTRAST';
}

function normalizedWeights(weights: ReconstructionWeights): ReconstructionWeights {
  const total = weights.disposition
    + weights.operations
    + weights.variables
    + weights.rejectedConditions
    + weights.counterfactualCues;
  if (!(total > 0)) return DEFAULT_RECONSTRUCTION_WEIGHTS;
  return {
    disposition: weights.disposition / total,
    operations: weights.operations / total,
    variables: weights.variables / total,
    rejectedConditions: weights.rejectedConditions / total,
    counterfactualCues: weights.counterfactualCues / total,
  };
}

export function scoreDecisionReconstruction(
  expected: DecisionTrace,
  predicted: DecisionReconstruction,
  weights: ReconstructionWeights = DEFAULT_RECONSTRUCTION_WEIGHTS,
): ReconstructionScore {
  const w = normalizedWeights(weights);
  const dispositionMatch = expected.disposition === predicted.disposition;
  const operationJaccard = jaccard(expected.operations, predicted.operations);
  const variableJaccard = jaccard(expected.relevantVariables, predicted.relevantVariables);
  const rejectedConditionJaccard = jaccard(expected.rejectedConditions, predicted.rejectedConditions ?? []);
  const counterfactualCueJaccard = jaccard(expected.whatWouldChangeDecision, predicted.whatWouldChangeDecision ?? []);
  const structuralFidelity =
    (dispositionMatch ? 1 : 0) * w.disposition
    + operationJaccard * w.operations
    + variableJaccard * w.variables
    + rejectedConditionJaccard * w.rejectedConditions
    + counterfactualCueJaccard * w.counterfactualCues;

  return {
    traceId: expected.traceId,
    dispositionMatch,
    operationJaccard,
    variableJaccard,
    rejectedConditionJaccard,
    counterfactualCueJaccard,
    structuralFidelity,
  };
}

export function evaluateDecisionHoldout(input: {
  expected: DecisionTrace[];
  predicted: DecisionReconstruction[];
  weights?: ReconstructionWeights;
}): HoldoutEvaluation {
  const predictions = new Map(input.predicted.map((item) => [item.traceId, item]));
  const scores: ReconstructionScore[] = [];
  const scoresByTraceId = new Map<string, ReconstructionScore>();
  const missingTraceIds: string[] = [];
  const domains = new Map<string, ReconstructionScore[]>();

  for (const expected of input.expected) {
    const predicted = predictions.get(expected.traceId);
    if (!predicted) {
      missingTraceIds.push(expected.traceId);
      continue;
    }
    const score = scoreDecisionReconstruction(expected, predicted, input.weights);
    scores.push(score);
    scoresByTraceId.set(expected.traceId, score);
    const bucket = domains.get(expected.domain) ?? [];
    bucket.push(score);
    domains.set(expected.domain, bucket);
  }

  const byDomain: HoldoutEvaluation['byDomain'] = {};
  for (const [domain, domainScores] of domains.entries()) {
    byDomain[domain] = {
      traceCount: domainScores.length,
      decisionAccuracy: mean(domainScores.map((score) => score.dispositionMatch ? 1 : 0)),
      meanStructuralFidelity: mean(domainScores.map((score) => score.structuralFidelity)),
    };
  }

  const validatedExpected = input.expected.filter((item) => isValidationClass(item.epistemicClass));
  const validatedScores = validatedExpected
    .map((item) => scoresByTraceId.get(item.traceId))
    .filter((score): score is ReconstructionScore => Boolean(score));

  return {
    traceCount: input.expected.length,
    predictedCount: scores.length,
    missingTraceIds,
    decisionAccuracy: input.expected.length === 0
      ? 0
      : scores.filter((score) => score.dispositionMatch).length / input.expected.length,
    meanStructuralFidelity: input.expected.length === 0
      ? 0
      : scores.reduce((sum, score) => sum + score.structuralFidelity, 0) / input.expected.length,
    meanOperationJaccard: input.expected.length === 0
      ? 0
      : scores.reduce((sum, score) => sum + score.operationJaccard, 0) / input.expected.length,
    meanVariableJaccard: input.expected.length === 0
      ? 0
      : scores.reduce((sum, score) => sum + score.variableJaccard, 0) / input.expected.length,
    validatedTraceCount: validatedExpected.length,
    validatedPredictedCount: validatedScores.length,
    validatedDecisionAccuracy: validatedExpected.length === 0
      ? 0
      : validatedScores.filter((score) => score.dispositionMatch).length / validatedExpected.length,
    validatedMeanStructuralFidelity: validatedExpected.length === 0
      ? 0
      : validatedScores.reduce((sum, score) => sum + score.structuralFidelity, 0) / validatedExpected.length,
    byDomain,
    scores,
  };
}

function qualifiesForPromotion(occurrence: OperationOccurrence): boolean {
  return isValidationClass(occurrence.epistemicClass);
}

export function evaluateOperationPromotion(input: {
  operationKey: string;
  occurrences: OperationOccurrence[];
  boundaryProbeCount: number;
}): OperationPromotionReport {
  const matching = input.occurrences.filter((item) => item.operationKey === input.operationKey);
  const qualifying = matching.filter(qualifiesForPromotion);
  const supports = qualifying.filter((item) => item.support === 'SUPPORT');
  const counterexamples = qualifying.filter((item) => item.support === 'COUNTEREXAMPLE');
  const domains = uniqueStrings(supports.map((item) => item.domain));
  const verifiedContrastCount = supports.filter((item) => item.epistemicClass === 'VERIFIED_CONTRAST').length;
  const simulatedOccurrenceCount = matching.filter((item) => item.epistemicClass === 'SIMULATED').length;
  const evidenceRefs = uniqueStrings(qualifying.flatMap((item) => item.evidenceRefs));
  const reasons: string[] = [];

  let maturity: CognitiveOperationMaturity = 'CANDIDATE';
  if (supports.length >= 2) maturity = 'RECURRENT';
  if (supports.length >= 3 && domains.length >= 2) maturity = 'CROSS_DOMAIN';
  if (supports.length >= 3 && domains.length >= 2 && verifiedContrastCount >= 1) maturity = 'CONTRASTED';
  if (
    supports.length >= 5
    && domains.length >= 3
    && verifiedContrastCount >= 2
    && counterexamples.length >= 1
    && input.boundaryProbeCount >= 1
  ) {
    maturity = 'STABLE_PATTERN';
  }
  if (
    supports.length >= 6
    && domains.length >= 3
    && verifiedContrastCount >= 2
    && counterexamples.length >= 1
    && input.boundaryProbeCount >= 2
  ) {
    maturity = 'RULE_CANDIDATE';
  }

  if (supports.length < 2) reasons.push('insufficient_recurrence');
  if (domains.length < 2) reasons.push('cross_domain_transfer_not_demonstrated');
  if (verifiedContrastCount < 1) reasons.push('founder_contrast_missing');
  if (counterexamples.length < 1) reasons.push('counterexample_missing');
  if (input.boundaryProbeCount < 1) reasons.push('decision_boundary_not_probed');
  if (simulatedOccurrenceCount > 0) reasons.push('simulated_occurrences_excluded_from_promotion_count');
  reasons.push('rule_promotion_remains_founder_reserved');

  return {
    operationKey: input.operationKey,
    maturity,
    qualifyingSupportCount: supports.length,
    qualifyingCounterexampleCount: counterexamples.length,
    qualifyingDomains: domains,
    verifiedContrastCount,
    simulatedOccurrenceCount,
    boundaryProbeCount: Math.max(0, input.boundaryProbeCount),
    evidenceRefs,
    reasons,
    mayAutoPromoteToRule: false,
  };
}

export function evaluateCounterfactualProbes(probes: CounterfactualProbe[]): CounterfactualEvaluation {
  let expectedSwitchCount = 0;
  let detectedSwitchCount = 0;
  let correctTargetCount = 0;
  let falseSwitchCount = 0;
  let validatedExpectedSwitchCount = 0;
  let validatedCorrectTargetCount = 0;

  for (const probe of probes) {
    const expectedSwitch = probe.expectedDispositionAfterPerturbation !== probe.baselineDisposition;
    const predictedSwitch = probe.predictedDispositionAfterPerturbation !== probe.baselineDisposition;
    const validated = probe.epistemicClass === 'OBSERVED' || probe.epistemicClass === 'VERIFIED_CONTRAST';

    if (expectedSwitch) {
      expectedSwitchCount += 1;
      if (predictedSwitch) detectedSwitchCount += 1;
      if (probe.predictedDispositionAfterPerturbation === probe.expectedDispositionAfterPerturbation) {
        correctTargetCount += 1;
      }
      if (validated) {
        validatedExpectedSwitchCount += 1;
        if (probe.predictedDispositionAfterPerturbation === probe.expectedDispositionAfterPerturbation) {
          validatedCorrectTargetCount += 1;
        }
      }
    } else if (predictedSwitch) {
      falseSwitchCount += 1;
    }
  }

  const noSwitchExpectedCount = probes.length - expectedSwitchCount;
  const observedOrVerifiedProbeCount = probes.filter(
    (probe) => probe.epistemicClass === 'OBSERVED' || probe.epistemicClass === 'VERIFIED_CONTRAST',
  ).length;

  return {
    probeCount: probes.length,
    expectedSwitchCount,
    detectedSwitchCount,
    correctTargetCount,
    falseSwitchCount,
    switchDetectionRate: expectedSwitchCount === 0 ? 1 : detectedSwitchCount / expectedSwitchCount,
    targetDispositionAccuracy: expectedSwitchCount === 0 ? 1 : correctTargetCount / expectedSwitchCount,
    falseSwitchRate: noSwitchExpectedCount === 0 ? 0 : falseSwitchCount / noSwitchExpectedCount,
    observedOrVerifiedProbeCount,
    validatedExpectedSwitchCount,
    validatedCorrectTargetCount,
    validatedTargetDispositionAccuracy: validatedExpectedSwitchCount === 0
      ? 0
      : validatedCorrectTargetCount / validatedExpectedSwitchCount,
    simulatedProbeCount: probes.filter((probe) => probe.epistemicClass === 'SIMULATED').length,
    evidenceRefs: uniqueStrings(probes.flatMap((probe) => probe.evidenceRefs)),
  };
}

export function buildDecisionTransferEvaluation(input: {
  holdout: HoldoutEvaluation;
  counterfactual: CounterfactualEvaluation;
  promotion: OperationPromotionReport;
  thresholds?: Partial<{
    minimumDecisionAccuracy: number;
    minimumStructuralFidelity: number;
    minimumCounterfactualTargetAccuracy: number;
  }>;
}): DecisionTransferEvaluation {
  const gates = {
    minimumDecisionAccuracy: input.thresholds?.minimumDecisionAccuracy ?? 0.75,
    minimumStructuralFidelity: input.thresholds?.minimumStructuralFidelity ?? 0.70,
    minimumCounterfactualTargetAccuracy: input.thresholds?.minimumCounterfactualTargetAccuracy ?? 0.75,
    requiresNonSimulatedEvidence: true as const,
  };
  const nonSimulatedEvidence = input.holdout.validatedTraceCount > 0
    && input.promotion.qualifyingSupportCount > 0
    && input.counterfactual.validatedExpectedSwitchCount > 0;
  const pass = input.holdout.validatedDecisionAccuracy >= gates.minimumDecisionAccuracy
    && input.holdout.validatedMeanStructuralFidelity >= gates.minimumStructuralFidelity
    && input.counterfactual.validatedTargetDispositionAccuracy >= gates.minimumCounterfactualTargetAccuracy
    && nonSimulatedEvidence;

  return {
    schemaVersion: 'SFI-CT-DECISION-TRANSFER-1.0',
    epistemicClass: 'DERIVED',
    holdout: input.holdout,
    counterfactual: input.counterfactual,
    promotion: input.promotion,
    pass,
    gates,
    limitations: [
      'This evaluator measures reconstruction and transfer fidelity; it does not establish phenomenal consciousness, identity or subjective experience.',
      'Simulation and derived probes can exercise the instrument but cannot satisfy validation gates or promote an operation, pattern or rule.',
      'A RULE_CANDIDATE remains non-canonical until governed founder review and independent verification.',
      'High decision accuracy without structural fidelity is insufficient evidence of cognitive-operation transfer.',
      'Default thresholds are protocol parameters and must not be interpreted as empirically established universal cutoffs.',
    ],
  };
}
