import { mixdownToMono } from '../audioDecode';
import type { StudioDecodedAudio } from '../audioTypes';
import type { HarmonyFrame } from './types';

export const HARMONY_FRAME_SIZE = 4096;
export const HARMONY_HOP_SIZE = 2048;
export const HARMONY_MIN_FREQUENCY = 50;
export const HARMONY_MAX_FREQUENCY = 5000;
export const HARMONY_TUNING_REFERENCE_HZ = 440;

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export function hann(index: number, size: number) {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / Math.max(1, size - 1));
}

function bitReverse(real: Float64Array, imag: Float64Array) {
  const n = real.length;
  let j = 0;
  for (let i = 1; i < n; i += 1) {
    let bit = n >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      const tr = real[i];
      real[i] = real[j];
      real[j] = tr;
      const ti = imag[i];
      imag[i] = imag[j];
      imag[j] = ti;
    }
  }
}

export function fftMagnitude(frame: Float64Array) {
  const real = new Float64Array(frame);
  const imag = new Float64Array(frame.length);
  bitReverse(real, imag);
  for (let len = 2; len <= real.length; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wlenR = Math.cos(angle);
    const wlenI = Math.sin(angle);
    for (let i = 0; i < real.length; i += len) {
      let wr = 1;
      let wi = 0;
      for (let j = 0; j < len / 2; j += 1) {
        const uR = real[i + j];
        const uI = imag[i + j];
        const vR = real[i + j + len / 2] * wr - imag[i + j + len / 2] * wi;
        const vI = real[i + j + len / 2] * wi + imag[i + j + len / 2] * wr;
        real[i + j] = uR + vR;
        imag[i + j] = uI + vI;
        real[i + j + len / 2] = uR - vR;
        imag[i + j + len / 2] = uI - vI;
        const nextWr = wr * wlenR - wi * wlenI;
        wi = wr * wlenI + wi * wlenR;
        wr = nextWr;
      }
    }
  }
  const bins = real.length / 2;
  const magnitude = new Float64Array(bins);
  for (let i = 0; i < bins; i += 1) magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  return magnitude;
}

export function harmonyHopSeconds(sampleRate: number) {
  return HARMONY_HOP_SIZE / sampleRate;
}

export function frequencyToMidi(frequencyHz: number) {
  return 69 + 12 * Math.log2(frequencyHz / HARMONY_TUNING_REFERENCE_HZ);
}

export function midiToNoteName(midi: number) {
  const rounded = Math.round(midi);
  return `${NOTE_NAMES[((rounded % 12) + 12) % 12]}${Math.floor(rounded / 12) - 1}`;
}

export function pitchClassName(index: number) {
  return NOTE_NAMES[((Math.round(index) % 12) + 12) % 12];
}

export function buildHarmonyFrames(decoded: StudioDecodedAudio): { mono: Float32Array; frames: HarmonyFrame[] } {
  const mono = mixdownToMono(decoded);
  if (mono.length < HARMONY_FRAME_SIZE) return { mono, frames: [] };
  const frames: HarmonyFrame[] = [];
  for (let start = 0, index = 0; start + HARMONY_FRAME_SIZE <= mono.length; start += HARMONY_HOP_SIZE, index += 1) {
    const windowed = new Float64Array(HARMONY_FRAME_SIZE);
    let energy = 0;
    for (let i = 0; i < HARMONY_FRAME_SIZE; i += 1) {
      const value = (mono[start + i] ?? 0) * hann(i, HARMONY_FRAME_SIZE);
      windowed[i] = value;
      energy += value * value;
    }
    frames.push({
      index,
      startSeconds: start / decoded.sampleRate,
      rms: Math.sqrt(energy / HARMONY_FRAME_SIZE),
      spectrum: fftMagnitude(windowed),
    });
  }
  return { mono, frames };
}
