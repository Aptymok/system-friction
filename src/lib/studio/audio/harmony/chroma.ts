import { HARMONY_MAX_FREQUENCY, HARMONY_MIN_FREQUENCY, frequencyToMidi } from './spectralFrames';
import { chromaConfidence, normalizeChroma } from './chromaNormalization';
import { roundHarmony, type ChromaFrame, type HarmonyFrame } from './types';

export function buildChromaFrames(frames: HarmonyFrame[], sampleRate: number): ChromaFrame[] {
  return frames.map((frame) => {
    const values = Array.from({ length: 12 }, () => 0);
    let tonalEnergy = 0;
    let totalEnergy = 0;
    for (let bin = 1; bin < frame.spectrum.length; bin += 1) {
      const frequency = (bin * sampleRate) / (frame.spectrum.length * 2);
      const magnitude = frame.spectrum[bin] ?? 0;
      totalEnergy += magnitude;
      if (frequency < HARMONY_MIN_FREQUENCY || frequency > HARMONY_MAX_FREQUENCY) continue;
      const midi = frequencyToMidi(frequency);
      const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
      const detune = Math.abs(midi - Math.round(midi));
      const tuningWeight = Math.max(0.2, 1 - detune * 1.8);
      const weighted = magnitude * tuningWeight;
      values[pitchClass] += weighted;
      tonalEnergy += weighted;
    }
    return {
      timestampSeconds: roundHarmony(frame.startSeconds, 4) ?? 0,
      values: normalizeChroma(values),
      confidence: roundHarmony(chromaConfidence(values, tonalEnergy, totalEnergy), 4) ?? 0,
    };
  });
}

export function aggregateChroma(frames: ChromaFrame[]) {
  const tonalFrames = frames.filter((frame) => frame.confidence >= 0.1);
  if (!tonalFrames.length) return null;
  const values = Array.from({ length: 12 }, () => 0);
  for (const frame of tonalFrames) {
    for (let i = 0; i < 12; i += 1) values[i] += frame.values[i] * frame.confidence;
  }
  return normalizeChroma(values);
}
