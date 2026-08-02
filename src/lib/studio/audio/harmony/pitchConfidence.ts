import { roundHarmony, type PitchFrame } from './types';

export function summarizePitch(frames: PitchFrame[]) {
  const voiced = frames.filter((frame) => frame.voiced && frame.frequencyHz !== null && frame.confidence >= 0.5);
  const voicedFrameRatio = frames.length ? voiced.length / frames.length : 0;
  const frequencies = voiced.map((frame) => frame.frequencyHz as number).sort((left, right) => left - right);
  const confidence = voiced.length
    ? voiced.reduce((sum, frame) => sum + frame.confidence, 0) / voiced.length
    : 0;
  const median = frequencies.length ? frequencies[Math.floor(frequencies.length / 2)] : null;
  const aggregatePitchDefensible = voicedFrameRatio >= 0.2;
  return {
    voicedFrameRatio: roundHarmony(voicedFrameRatio, 4) ?? 0,
    medianFrequencyHz: aggregatePitchDefensible ? roundHarmony(median, 3) : null,
    minFrequencyHz: aggregatePitchDefensible ? roundHarmony(frequencies[0] ?? null, 3) : null,
    maxFrequencyHz: aggregatePitchDefensible ? roundHarmony(frequencies[frequencies.length - 1] ?? null, 3) : null,
    confidence: aggregatePitchDefensible ? roundHarmony(confidence, 4) ?? 0 : 0,
  };
}
