import type { RhythmFrame } from './types';

export function positiveSpectralFlux(frames: RhythmFrame[]) {
  const values = new Float64Array(frames.length);
  for (let index = 1; index < frames.length; index += 1) {
    const current = frames[index].spectrum;
    const previous = frames[index - 1].spectrum;
    let flux = 0;
    const bins = Math.min(current.length, previous.length);
    for (let bin = 1; bin < bins; bin += 1) {
      const delta = current[bin] - previous[bin];
      if (delta > 0) flux += delta;
    }
    values[index] = flux / Math.max(1, bins);
  }
  return values;
}

export function normalizeEnvelope(values: Float64Array) {
  let max = 0;
  for (const value of values) max = Math.max(max, value);
  if (max <= 0 || !Number.isFinite(max)) return new Float64Array(values.length);
  return Float64Array.from(values, (value) => Math.max(0, value / max));
}
