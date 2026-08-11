export const RETURN_CONTRAST_CONTRACT = 'SFI-RETURN-CONTRAST-1.0' as const;

export type ReturnContrastInput = {
  predictionSeal: string;
  expected: number;
  observed: number;
  rivalInterpretation: string;
  stoppingCondition: string;
  evidenceRefs: string[];
};

export type ReturnContrastResult = ReturnContrastInput & {
  contractVersion: typeof RETURN_CONTRAST_CONTRACT;
  residual: number;
  absoluteError: number;
  squaredError: number;
  complete: true;
};

export function finalizeReturnContrast(input: ReturnContrastInput): ReturnContrastResult {
  if (!input.predictionSeal.trim()) throw new Error('RETURN_CONTRAST_PREDICTION_SEAL_REQUIRED');
  if (!Number.isFinite(input.expected) || !Number.isFinite(input.observed)) throw new Error('RETURN_CONTRAST_NUMERIC_VALUES_REQUIRED');
  if (!input.rivalInterpretation.trim()) throw new Error('RETURN_CONTRAST_RIVAL_REQUIRED');
  if (!input.stoppingCondition.trim()) throw new Error('RETURN_CONTRAST_STOPPING_CONDITION_REQUIRED');
  if (!input.evidenceRefs.length) throw new Error('RETURN_CONTRAST_EVIDENCE_REQUIRED');
  const residual = input.expected - input.observed;
  return {
    ...input,
    contractVersion: RETURN_CONTRAST_CONTRACT,
    evidenceRefs: Array.from(new Set(input.evidenceRefs.map((item)=>item.trim()).filter(Boolean))),
    residual,
    absoluteError: Math.abs(residual),
    squaredError: residual * residual,
    complete: true,
  };
}

export function canMarkLongitudinalCaseComplete(value: Partial<ReturnContrastResult> | null | undefined) {
  return Boolean(
    value?.complete === true
    && value.predictionSeal?.trim()
    && Number.isFinite(value.expected)
    && Number.isFinite(value.observed)
    && Number.isFinite(value.residual)
    && value.rivalInterpretation?.trim()
    && value.stoppingCondition?.trim()
    && value.evidenceRefs?.length,
  );
}
