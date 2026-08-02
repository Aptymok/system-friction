import { HARMONY_FRAME_SIZE, HARMONY_HOP_SIZE, frequencyToMidi, hann } from './spectralFrames';
import { clamp01, roundHarmony, type PitchFrame } from './types';

const MIN_PITCH_HZ = 55;
const MAX_PITCH_HZ = 1200;
const SILENCE_RMS = 0.0008;

function detectFramePitch(frame: Float32Array, sampleRate: number) {
  let energy = 0;
  const windowed = new Float64Array(frame.length);
  for (let i = 0; i < frame.length; i += 1) {
    const value = frame[i] * hann(i, frame.length);
    windowed[i] = value;
    energy += value * value;
  }
  const rms = Math.sqrt(energy / frame.length);
  if (rms < SILENCE_RMS) return { frequencyHz: null, confidence: 0, voiced: false };

  const minLag = Math.max(2, Math.floor(sampleRate / MAX_PITCH_HZ));
  const maxLag = Math.min(frame.length - 2, Math.ceil(sampleRate / MIN_PITCH_HZ));
  let bestLag = 0;
  let bestScore = 0;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;
    let left = 0;
    let right = 0;
    for (let i = 0; i < frame.length - lag; i += 1) {
      const a = windowed[i];
      const b = windowed[i + lag];
      correlation += a * b;
      left += a * a;
      right += b * b;
    }
    const score = correlation / Math.sqrt(Math.max(1e-12, left * right));
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  if (!bestLag || bestScore < 0.48) return { frequencyHz: null, confidence: clamp01(bestScore), voiced: false };
  return {
    frequencyHz: sampleRate / bestLag,
    confidence: clamp01((bestScore - 0.38) / 0.55),
    voiced: bestScore >= 0.55,
  };
}

export function detectPitchFrames(mono: Float32Array, sampleRate: number): PitchFrame[] {
  if (mono.length < HARMONY_FRAME_SIZE || sampleRate <= 0) return [];
  const frames: PitchFrame[] = [];
  for (let start = 0, index = 0; start + HARMONY_FRAME_SIZE <= mono.length; start += HARMONY_HOP_SIZE, index += 1) {
    const frame = mono.subarray(start, start + HARMONY_FRAME_SIZE);
    const detected = detectFramePitch(frame, sampleRate);
    const frequencyHz = roundHarmony(detected.frequencyHz, 3);
    const midi = frequencyHz === null ? undefined : Math.round(frequencyToMidi(frequencyHz));
    frames.push({
      timestampSeconds: roundHarmony(start / sampleRate, 4) ?? 0,
      frequencyHz,
      midiNote: midi,
      confidence: roundHarmony(detected.confidence, 4) ?? 0,
      voiced: detected.voiced,
    });
  }
  return frames;
}
