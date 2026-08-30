import type { KernelContext } from '../kernelContext';

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function clamp01(value: unknown, fallback = 0.5) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed > 1 ? parsed / 100 : parsed)) : fallback;
}

export function TrajectoryAgent(context: KernelContext): KernelContext {
  const signal = row(context.metadata?.signal);
  const extracted = row(signal.extracted);
  const structuredPrediction = row(extracted.prediction);
  const description = text(structuredPrediction.statement)
    ?? text(structuredPrediction.description)
    ?? text(structuredPrediction.prediction);

  let structuredPredictionPreserved = false;
  if (description) {
    const alreadyPresent = context.predictions.some((prediction) => prediction.description.trim().toLowerCase() === description.toLowerCase());
    if (!alreadyPresent) {
      context.predictions.push({
        id: text(structuredPrediction.id) ?? crypto.randomUUID(),
        description,
        confidence: clamp01(structuredPrediction.confidence, 0.5),
        expectedSignals: strings(structuredPrediction.expectedSignals),
        contradictionSignals: strings(structuredPrediction.contradictionSignals),
        observationWindow: text(structuredPrediction.observationWindow),
      });
      structuredPredictionPreserved = true;
    }
  }

  context.metadata = {
    ...context.metadata,
    trajectoryAssessment: {
      executedAt: new Date().toISOString(),
      status: context.predictions.length ? 'prediction_available' : 'no_prediction_available',
      predictionCount: context.predictions.length,
      structuredPredictionPreserved,
      epistemicRule: 'PREDICTION_REMAINS_CONTRASTABLE_AND_DOES_NOT_BECOME_OBSERVATION',
    },
  };

  return context;
}
