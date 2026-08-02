import type { RhythmFrame } from './types';
import { normalizeEnvelope, positiveSpectralFlux } from './spectralFlux';

function energyDelta(frames: RhythmFrame[]) {
  const values = new Float64Array(frames.length);
  for (let index = 1; index < frames.length; index += 1) {
    values[index] = Math.max(0, frames[index].energy - frames[index - 1].energy);
  }
  return normalizeEnvelope(values);
}

function hfcDelta(frames: RhythmFrame[]) {
  const values = new Float64Array(frames.length);
  for (let index = 1; index < frames.length; index += 1) {
    values[index] = Math.max(0, frames[index].highFrequencyContent - frames[index - 1].highFrequencyContent);
  }
  return normalizeEnvelope(values);
}

function smooth(values: Float64Array) {
  const output = new Float64Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    const previous = values[index - 1] ?? values[index];
    const current = values[index] ?? 0;
    const next = values[index + 1] ?? current;
    output[index] = previous * 0.2 + current * 0.6 + next * 0.2;
  }
  return output;
}

export function onsetStrengthEnvelope(frames: RhythmFrame[]) {
  const flux = normalizeEnvelope(positiveSpectralFlux(frames));
  const energy = energyDelta(frames);
  const hfc = hfcDelta(frames);
  const combined = new Float64Array(frames.length);
  for (let index = 0; index < frames.length; index += 1) {
    combined[index] = flux[index] * 0.62 + energy[index] * 0.25 + hfc[index] * 0.13;
  }
  return smooth(combined);
}
