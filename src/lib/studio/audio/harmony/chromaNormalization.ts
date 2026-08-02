import { clamp01 } from './types';

export function normalizeChroma(values: number[]): [number, number, number, number, number, number, number, number, number, number, number, number] {
  const total = values.reduce((sum, value) => sum + Math.max(0, Number.isFinite(value) ? value : 0), 0);
  const normalized = values.map((value) => (total > 1e-12 ? Math.max(0, value) / total : 0));
  return normalized.slice(0, 12) as [number, number, number, number, number, number, number, number, number, number, number, number];
}

export function chromaConfidence(values: number[], tonalEnergy: number, totalEnergy: number) {
  const sorted = values.slice().sort((left, right) => right - left);
  const dominance = sorted[0] > 0 ? (sorted[0] - (sorted[1] ?? 0)) / Math.max(1e-12, sorted[0]) : 0;
  const tonalRatio = totalEnergy > 1e-12 ? tonalEnergy / totalEnergy : 0;
  return clamp01(0.45 * tonalRatio + 0.55 * dominance);
}
