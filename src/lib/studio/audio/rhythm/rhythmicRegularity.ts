import type { OnsetEvent } from './types';
import { roundRhythm } from './types';
import { interOnsetIntervals } from './interOnsetIntervals';

export function calculateRhythmicRegularity(onsets: OnsetEvent[]) {
  const intervals = interOnsetIntervals(onsets);
  if (intervals.length < 3) return { value: null, ioiDispersion: null, confidence: 0 };
  const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const std = Math.sqrt(intervals.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / intervals.length);
  const dispersion = mean > 0 ? std / mean : null;
  const value = dispersion === null ? null : Math.max(0, Math.min(1, 1 - dispersion));
  return {
    value: roundRhythm(value),
    ioiDispersion: roundRhythm(dispersion),
    confidence: roundRhythm(Math.min(1, intervals.length / 16), 4) ?? 0,
  };
}
