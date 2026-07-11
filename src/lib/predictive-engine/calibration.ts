import type { PredictiveFeatureContribution } from './types';

export type PredictiveModelState = {
  id: string;
  scope: string;
  modelKey: string;
  targetKey: string;
  targetKind: 'binary' | 'continuous';
  version: number;
  status: 'ACTIVE' | 'SHADOW' | 'FROZEN' | 'RETIRED';
  featureSchema: Array<{ key: string; required?: boolean; default?: number }>;
  weights: Record<string, number>;
  intercept: number;
  learningRate: number;
  sampleCount: number;
  verifiedSampleCount: number;
  metrics: Record<string, number | null>;
};

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : 0));
}

export function logistic(value: number) {
  if (value >= 0) {
    const z = Math.exp(-value);
    return 1 / (1 + z);
  }
  const z = Math.exp(value);
  return z / (1 + z);
}

export function calibrationStatus(model: Pick<PredictiveModelState, 'status' | 'verifiedSampleCount' | 'metrics'>) {
  if (model.status === 'FROZEN') return 'FROZEN' as const;
  const brier = typeof model.metrics.brier === 'number' ? model.metrics.brier : null;
  const bias = typeof model.metrics.bias === 'number' ? Math.abs(model.metrics.bias) : null;
  if (model.verifiedSampleCount < 10) return 'BOOTSTRAP_UNCALIBRATED' as const;
  if ((brier !== null && brier > 0.28) || (bias !== null && bias > 0.18)) return 'DRIFT_WARNING' as const;
  if (model.verifiedSampleCount < 30) return 'LEARNING' as const;
  return 'CALIBRATED' as const;
}

export function predictBinary(input: {
  model: PredictiveModelState;
  values: Record<string, { value: number; confidence: number; source: string | null; evidenceIds: string[] }>;
}) {
  const contributions: PredictiveFeatureContribution[] = [];
  let linear = input.model.intercept;
  let confidenceTotal = 0;
  let confidenceWeight = 0;

  for (const schema of input.model.featureSchema) {
    const observed = input.values[schema.key];
    const rawValue = observed?.value ?? schema.default ?? 0.5;
    const normalizedValue = clamp01(rawValue);
    const weight = Number(input.model.weights[schema.key] ?? 0);
    const featureConfidence = clamp01(observed?.confidence ?? (observed ? 0.7 : 0.15));
    const contribution = normalizedValue * weight;
    linear += contribution;
    confidenceTotal += featureConfidence * Math.max(0.1, Math.abs(weight));
    confidenceWeight += Math.max(0.1, Math.abs(weight));
    contributions.push({
      key: schema.key,
      rawValue,
      normalizedValue,
      weight,
      contribution,
      confidence: featureConfidence,
      source: observed?.source ?? null,
      evidenceIds: observed?.evidenceIds ?? [],
    });
  }

  const prediction = logistic(linear);
  const featureConfidence = confidenceWeight > 0 ? confidenceTotal / confidenceWeight : 0;
  const sampleConfidence = clamp01(Math.log10(input.model.verifiedSampleCount + 1) / Math.log10(101));
  const confidence = clamp01(featureConfidence * 0.62 + sampleConfidence * 0.38);
  const margin = clamp(0.34 * (1 - confidence) + 0.07 / Math.sqrt(input.model.verifiedSampleCount + 1), 0.04, 0.38);

  return {
    prediction: clamp01(prediction),
    lowerBound: clamp01(prediction - margin),
    upperBound: clamp01(prediction + margin),
    confidence,
    linear,
    contributions: contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
  };
}

export function qualityWeight(sourceQuality: string, interventionFidelity: number | null | undefined) {
  const base: Record<string, number> = {
    VERIFIED: 1,
    OBSERVED: 0.72,
    DECLARED: 0.4,
    INFERRED: 0.2,
    UNVERIFIABLE: 0,
  };
  const fidelity = interventionFidelity === null || typeof interventionFidelity === 'undefined'
    ? 0.8
    : clamp01(interventionFidelity);
  return clamp01((base[sourceQuality] ?? 0) * (0.45 + fidelity * 0.55));
}

function runningMean(previous: number | null, next: number, previousCount: number) {
  if (previous === null || previousCount <= 0) return next;
  return previous + (next - previous) / (previousCount + 1);
}

export function updateBinaryModel(input: {
  model: PredictiveModelState;
  contributions: PredictiveFeatureContribution[];
  predicted: number;
  actual: number;
  quality: number;
}) {
  const residual = input.predicted - input.actual;
  const absoluteError = Math.abs(residual);
  const squaredError = residual * residual;
  const learningAllowed = input.quality >= 0.6 && input.model.status === 'ACTIVE';
  const before = {
    weights: { ...input.model.weights },
    intercept: input.model.intercept,
    sampleCount: input.model.sampleCount,
    verifiedSampleCount: input.model.verifiedSampleCount,
    metrics: { ...input.model.metrics },
  };

  if (!learningAllowed) {
    return {
      applied: false,
      residual,
      absoluteError,
      squaredError,
      before,
      delta: { reason: input.quality < 0.6 ? 'QUALITY_BELOW_LEARNING_THRESHOLD' : 'MODEL_NOT_ACTIVE' },
      after: before,
    };
  }

  const rate = input.model.learningRate * input.quality;
  const nextWeights = { ...input.model.weights };
  const weightDelta: Record<string, number> = {};
  for (const contribution of input.contributions) {
    const delta = -rate * residual * contribution.normalizedValue * contribution.confidence;
    nextWeights[contribution.key] = clamp(Number(nextWeights[contribution.key] ?? 0) + delta, -4, 4);
    weightDelta[contribution.key] = nextWeights[contribution.key] - Number(input.model.weights[contribution.key] ?? 0);
  }
  const nextIntercept = clamp(input.model.intercept - rate * residual, -6, 6);
  const previousVerified = input.model.verifiedSampleCount;
  const previousBrier = typeof input.model.metrics.brier === 'number' ? input.model.metrics.brier : null;
  const previousMae = typeof input.model.metrics.mae === 'number' ? input.model.metrics.mae : null;
  const previousBias = typeof input.model.metrics.bias === 'number' ? input.model.metrics.bias : null;
  const metrics = {
    ...input.model.metrics,
    brier: runningMean(previousBrier, squaredError, previousVerified),
    mae: runningMean(previousMae, absoluteError, previousVerified),
    bias: runningMean(previousBias, residual, previousVerified),
  };
  const after = {
    weights: nextWeights,
    intercept: nextIntercept,
    sampleCount: input.model.sampleCount + 1,
    verifiedSampleCount: input.model.verifiedSampleCount + 1,
    metrics,
  };

  return {
    applied: true,
    residual,
    absoluteError,
    squaredError,
    before,
    delta: {
      learningRateApplied: rate,
      intercept: nextIntercept - input.model.intercept,
      weights: weightDelta,
    },
    after,
  };
}

export function classifyPredictionError(input: {
  residual: number | null;
  missingEvidenceCount: number;
  sourceQuality: string;
  interventionFidelity: number | null | undefined;
  calibration: string;
}) {
  if (input.sourceQuality === 'UNVERIFIABLE' || input.residual === null) return 'UNVERIFIABLE_OUTCOME';
  if ((input.interventionFidelity ?? 1) < 0.5) return 'INTERVENTION_FIDELITY_FAILURE';
  if (input.missingEvidenceCount > 0) return 'MISSING_EVIDENCE_BIAS';
  if (input.calibration === 'DRIFT_WARNING') return 'MODEL_OR_FIELD_DRIFT';
  if (Math.abs(input.residual) < 0.12) return 'WITHIN_EXPECTED_ERROR';
  if (input.residual > 0) return 'OVERPREDICTION';
  return 'UNDERPREDICTION';
}
