import { mixdownToMono } from '../audioDecode';
import type { StudioDecodedAudio } from '../audioTypes';
import type { RhythmFrame } from './types';

export const RHYTHM_FRAME_SIZE = 1024;
export const RHYTHM_HOP_SIZE = 512;

function hann(index: number, size: number) {
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

function fftMagnitude(frame: Float64Array) {
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

export function buildRhythmFrames(decoded: StudioDecodedAudio): RhythmFrame[] {
  const mono = mixdownToMono(decoded);
  if (mono.length < RHYTHM_FRAME_SIZE) return [];
  const frames: RhythmFrame[] = [];
  for (let start = 0, index = 0; start + RHYTHM_FRAME_SIZE <= mono.length; start += RHYTHM_HOP_SIZE, index += 1) {
    const frame = new Float64Array(RHYTHM_FRAME_SIZE);
    let energy = 0;
    let hfc = 0;
    for (let i = 0; i < RHYTHM_FRAME_SIZE; i += 1) {
      const value = (mono[start + i] ?? 0) * hann(i, RHYTHM_FRAME_SIZE);
      frame[i] = value;
      energy += value * value;
      hfc += Math.abs(value - (mono[start + i - 1] ?? 0));
    }
    frames.push({
      index,
      startSeconds: start / decoded.sampleRate,
      energy: Math.sqrt(energy / RHYTHM_FRAME_SIZE),
      highFrequencyContent: hfc / RHYTHM_FRAME_SIZE,
      spectrum: fftMagnitude(frame),
    });
  }
  return frames;
}

export function rhythmHopSeconds(sampleRate: number) {
  return RHYTHM_HOP_SIZE / sampleRate;
}
