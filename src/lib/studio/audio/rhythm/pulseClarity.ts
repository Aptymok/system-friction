import type { TempoCandidate } from './types';

export function estimatePulseClarity(candidates: TempoCandidate[], onsetCount: number, durationSeconds: number) {
  if (!candidates.length || onsetCount < 3 || durationSeconds <= 0) return null;
  const primary = candidates[0];
  const runnerUp = candidates[1];
  const separation = runnerUp ? Math.max(0, primary.score - runnerUp.score) / Math.max(primary.score, 1e-9) : 1;
  const eventSupport = Math.min(1, onsetCount / Math.max(4, durationSeconds * (primary.bpm / 60) * 0.5));
  return Number(Math.max(0, Math.min(1, primary.confidence * 0.55 + separation * 0.25 + eventSupport * 0.2)).toFixed(4));
}
