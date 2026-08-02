import { HARMONY_MAX_FREQUENCY, HARMONY_MIN_FREQUENCY } from './spectralFrames';
import { clamp01, roundHarmony, type DissonanceResult, type HarmonyFrame } from './types';

function topPeaks(frame: HarmonyFrame, sampleRate: number) {
  const peaks: Array<{ frequency: number; amplitude: number }> = [];
  for (let bin = 2; bin < frame.spectrum.length - 1; bin += 1) {
    const amplitude = frame.spectrum[bin] ?? 0;
    if (amplitude <= (frame.spectrum[bin - 1] ?? 0) || amplitude <= (frame.spectrum[bin + 1] ?? 0)) continue;
    const frequency = (bin * sampleRate) / (frame.spectrum.length * 2);
    if (frequency >= HARMONY_MIN_FREQUENCY && frequency <= HARMONY_MAX_FREQUENCY) peaks.push({ frequency, amplitude });
  }
  return peaks.sort((left, right) => right.amplitude - left.amplitude).slice(0, 8);
}

export function estimateDissonance(frames: HarmonyFrame[], sampleRate: number): DissonanceResult {
  const tonalFrames = frames.filter((frame) => frame.rms > 0.001);
  if (!tonalFrames.length) {
    return {
      value: null,
      confidence: 0,
      model: 'Sethares-style pairwise spectral roughness over dominant peaks',
      range: '0..1',
      normalization: 'bounded weighted pair roughness',
      limitations: ['DISSONANCE_REQUIRES_TONAL_SPECTRAL_ENERGY'],
    };
  }
  let weighted = 0;
  let weightSum = 0;
  for (const frame of tonalFrames.filter((_, index) => index % 2 === 0)) {
    const peaks = topPeaks(frame, sampleRate);
    for (let i = 0; i < peaks.length; i += 1) {
      for (let j = i + 1; j < peaks.length; j += 1) {
        const left = peaks[i];
        const right = peaks[j];
        const minFrequency = Math.min(left.frequency, right.frequency);
        const s = 0.24 / (0.021 * minFrequency + 19);
        const roughness = Math.exp(-3.5 * s * Math.abs(right.frequency - left.frequency)) -
          Math.exp(-5.75 * s * Math.abs(right.frequency - left.frequency));
        const weight = Math.min(left.amplitude, right.amplitude);
        weighted += Math.max(0, roughness) * weight;
        weightSum += weight;
      }
    }
  }
  const value = weightSum > 0 ? clamp01(weighted / weightSum * 2.4) : null;
  return {
    value: roundHarmony(value, 4),
    confidence: roundHarmony(clamp01(Math.min(tonalFrames.length / 24, 1) * 0.72), 4) ?? 0,
    model: 'Sethares-style pairwise spectral roughness over dominant peaks',
    range: '0..1',
    normalization: 'bounded weighted pair roughness',
    limitations: ['DISSONANCE_IS_SPECTRAL_ROUGHNESS_NOT_EMOTIONAL_VALENCE'],
  };
}
