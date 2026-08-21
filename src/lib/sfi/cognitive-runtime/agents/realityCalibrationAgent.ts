import type { KernelContext } from '../kernelContext';

export interface RealityCalibrationResult {
  predictionId: string;
  observedEvidenceId: string;
  predictedConfidence: number;
  observedConfidence: number;
  absoluteError: number;
  adjustmentRequired: boolean;
}

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function explicitPredictionRef(value: unknown) {
  const row = record(value);
  for (const key of ['predictionId', 'prediction_id', 'predictionRunId', 'prediction_run_id', 'predictiveRunId', 'predictive_run_id']) {
    if (typeof row[key] === 'string' && String(row[key]).trim()) return String(row[key]).trim();
  }
  const outcome = record(row.outcome);
  for (const key of ['predictionId', 'prediction_id', 'predictionRunId', 'prediction_run_id']) {
    if (typeof outcome[key] === 'string' && String(outcome[key]).trim()) return String(outcome[key]).trim();
  }
  return null;
}

export function RealityCalibrationAgent(context: KernelContext): KernelContext {
  const results: RealityCalibrationResult[] = [];
  const unmatchedPredictionIds: string[] = [];

  for (const prediction of context.predictions ?? []) {
    const related = (context.evidence ?? []).find((item) => explicitPredictionRef(item.payload) === prediction.id);
    if (!related) {
      unmatchedPredictionIds.push(prediction.id);
      continue;
    }

    const predictedConfidence = Math.max(0, Math.min(1, prediction.confidence));
    const observedConfidence = Math.max(0, Math.min(1, related.confidence));
    const absoluteError = Math.abs(predictedConfidence - observedConfidence);
    results.push({
      predictionId: prediction.id,
      observedEvidenceId: related.id,
      predictedConfidence,
      observedConfidence,
      absoluteError,
      adjustmentRequired: absoluteError > 0.3,
    });
  }

  context.metadata = {
    ...context.metadata,
    realityCalibration: {
      evaluated: results.length,
      adjustmentsRequired: results.filter((item) => item.adjustmentRequired).length,
      unmatchedPredictionIds,
      results,
      calibrationRule: 'Calibration occurs only against an explicit persisted return that identifies the prediction. Lexical similarity is never treated as a return.',
      learningBoundary: 'This agent measures residuals in the current context. Persistent model learning remains governed by the predictive learning/outcome pipeline.',
      executedAt: new Date().toISOString(),
    },
  };

  return context;
}
