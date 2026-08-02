import type { BeatEvent, MeterCandidate, OnsetEvent } from './types';
import { roundRhythm } from './types';

export function estimateSyncopation(onsets: OnsetEvent[], beats: BeatEvent[], meter: MeterCandidate | null) {
  if (!meter || beats.length < meter.numerator * 2 || onsets.length < 4) {
    return { value: null, confidence: 0, status: 'INSUFFICIENT_SIGNAL' as const };
  }
  const beatPeriod = beats.length > 1 ? beats[1].timestampSeconds - beats[0].timestampSeconds : null;
  if (!beatPeriod || beatPeriod <= 0) return { value: null, confidence: 0, status: 'INSUFFICIENT_SIGNAL' as const };
  let offGrid = 0;
  for (const onset of onsets) {
    let nearest = Infinity;
    for (const beat of beats) nearest = Math.min(nearest, Math.abs(onset.timestampSeconds - beat.timestampSeconds));
    if (nearest > beatPeriod * 0.18 && nearest < beatPeriod * 0.5) offGrid += 1;
  }
  const value = onsets.length ? offGrid / onsets.length : null;
  return {
    value: roundRhythm(value),
    confidence: roundRhythm(Math.min(1, meter.confidence * 0.6 + Math.min(1, beats.length / 24) * 0.4), 4) ?? 0,
    status: 'OBSERVED' as const,
  };
}
