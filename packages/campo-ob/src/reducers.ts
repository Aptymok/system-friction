import type { SignalEventRecord } from '../../events/src/signal-read-model';
import type { FieldState } from './index';

export type MinimalFieldStateFromSignalsInput = {
  fieldId: string;
  nodeId: string;
  signals: SignalEventRecord[];
  updatedAt: string;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function averageConfidence(signals: SignalEventRecord[]) {
  if (!signals.length) return 0;
  const total = signals.reduce((sum, signal) => sum + clamp01(signal.confidence), 0);
  return clamp01(total / signals.length);
}

function provisionalDegradation(signals: SignalEventRecord[]) {
  if (!signals.length) return 0;
  const volumePressure = clamp01(signals.length / 50);
  const lowConfidencePressure = 1 - averageConfidence(signals);
  return clamp01((volumePressure * 0.35) + (lowConfidencePressure * 0.25));
}

function provisionalOperationalCapacity(confidence: number, degradation: number) {
  return clamp01((0.4 + confidence * 0.6) * (1 - degradation));
}

export function deriveMinimalFieldStateFromSignals(input: MinimalFieldStateFromSignalsInput): FieldState {
  const validSignals = input.signals.filter((signal) => signal.sourceState === 'declared' && signal.evidenceLevel === 'direct');

  if (!validSignals.length) {
    return {
      fieldId: input.fieldId,
      nodeId: input.nodeId,
      regime: 'unknown',
      sourceState: 'missing',
      evidenceLevel: 'none',
      confidence: 0,
      updatedAt: input.updatedAt,
      metrics: {
        ihg: 0,
        nti: 0,
        ldi: 0,
        degradation: 0,
        operationalCapacity: 0,
      },
      operationalCapacity: 0,
      degradation: 0,
      nodes: [],
      links: [],
    };
  }

  const confidence = averageConfidence(validSignals);
  const degradation = provisionalDegradation(validSignals);
  const operationalCapacity = provisionalOperationalCapacity(confidence, degradation);

  return {
    fieldId: input.fieldId,
    nodeId: input.nodeId,
    regime: 'watch',
    sourceState: 'derived',
    evidenceLevel: 'behavioral',
    confidence,
    updatedAt: input.updatedAt,
    metrics: {
      ihg: confidence,
      nti: clamp01(degradation * 0.5),
      ldi: degradation,
      degradation,
      operationalCapacity,
    },
    operationalCapacity,
    degradation,
    nodes: [],
    links: [],
  };
}
