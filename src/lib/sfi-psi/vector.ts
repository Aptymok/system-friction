import type { SfiReappearance, SfiSignal, SfiVector } from './types';

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function variance(values: number[]) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return mean(values.map((value) => (value - avg) ** 2));
}

export function buildSfiVector(input: {
  eventCount: number;
  tokenCount: number;
  reappearances: SfiReappearance[];
  signals: SfiSignal[];
  nodeCount: number;
}): SfiVector {
  const recurrence = input.reappearances.reduce((sum, item) => sum + item.recurrence, 0);
  const maxRecurrence = Math.max(1, input.eventCount * 3);
  const signalCoherence = mean(input.signals.map((signal) => signal.coherence));
  const signalVisibility = mean(input.signals.map((signal) => signal.visibility));
  const repeatedPatterns = input.reappearances.length;
  const persistentSignals = input.signals.filter((signal) => signal.status === 'persistent_signal' || signal.status === 'emergent_node').length;
  const lexicalLoad = input.tokenCount / Math.max(1, input.eventCount);

  const P = clamp(recurrence / maxRecurrence);
  const C = clamp(signalCoherence || (repeatedPatterns ? 0.42 : 0.12));
  const D = clamp(persistentSignals / Math.max(1, input.signals.length));
  const F = clamp(1 - C + (input.signals.filter((signal) => signal.status === 'weak_signal').length / Math.max(2, input.signals.length + 1)) * 0.35);
  const A = clamp(repeatedPatterns / Math.max(3, input.tokenCount / 8));
  const R = clamp(input.signals.length / Math.max(1, repeatedPatterns));
  const V = clamp(signalVisibility || Math.min(0.9, input.eventCount / 6));
  const survivalStatus = input.eventCount > 0 ? clamp(0.35 + P * 0.65) : 0;
  const H = clamp(P * (1 - C) * survivalStatus);
  const E = clamp(input.nodeCount / Math.max(1, input.signals.length));
  const U = clamp((persistentSignals + input.nodeCount + (lexicalLoad > 12 ? 1 : 0)) / 5);
  const T = clamp(1 - F * 0.55 + H * 0.25);
  const X = clamp((F + A + Math.max(0, P - C)) / 3);
  const varianceScore = clamp(variance([P, C, D, F, A, R, V, H, E, U, T, X]) * 4);
  const collapseRisk = clamp(F * 0.55 + (1 - T) * 0.35 + varianceScore * 0.1);

  return {
    P,
    C,
    D,
    F,
    A,
    R,
    V,
    H,
    E,
    U,
    T,
    X,
    SFI_CONFIRMATION_SCORE: clamp(0.2 * P + 0.18 * C + 0.16 * V + 0.16 * U + 0.14 * T - 0.1 * F - 0.06 * varianceScore),
    SFI_AMBIGUOUS_PERSISTENCE_SCORE: clamp(0.24 * P + 0.22 * H + 0.18 * A + 0.18 * clamp(recurrence / 12) - 0.18 * collapseRisk),
    variance: varianceScore,
    recurrence: clamp(recurrence / 12),
    collapseRisk,
    survivalStatus,
  };
}
