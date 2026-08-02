import { distance } from './tonalCentroid';
import { pitchClassName } from './spectralFrames';
import { roundHarmony, type ChromaFrame, type HarmonicChangeEvent, type TonalCentroidFrame } from './types';

function chromaLabel(values: number[]) {
  let index = 0;
  for (let i = 1; i < values.length; i += 1) if ((values[i] ?? 0) > (values[index] ?? 0)) index = i;
  return pitchClassName(index);
}

export function detectHarmonicChanges(chromaFrames: ChromaFrame[], centroidFrames: TonalCentroidFrame[]): HarmonicChangeEvent[] {
  if (chromaFrames.length < 3 || centroidFrames.length < 3) return [];
  const distances = centroidFrames.slice(1).map((frame, index) => distance(frame.values, centroidFrames[index].values));
  const mean = distances.reduce((sum, value) => sum + value, 0) / distances.length;
  const variance = distances.reduce((sum, value) => sum + (value - mean) ** 2, 0) / distances.length;
  const threshold = mean + Math.sqrt(variance) * 1.25;
  const events: HarmonicChangeEvent[] = [];
  for (let i = 1; i < centroidFrames.length; i += 1) {
    const strength = distances[i - 1] ?? 0;
    if (strength < Math.max(0.08, threshold)) continue;
    const previousChroma = chromaFrames.find((frame) => Math.abs(frame.timestampSeconds - centroidFrames[i - 1].timestampSeconds) < 0.1);
    const nextChroma = chromaFrames.find((frame) => Math.abs(frame.timestampSeconds - centroidFrames[i].timestampSeconds) < 0.1);
    events.push({
      timestampSeconds: roundHarmony(centroidFrames[i].timestampSeconds, 4) ?? 0,
      strength: roundHarmony(strength, 4) ?? 0,
      confidence: roundHarmony(Math.min(1, strength / Math.max(0.08, threshold)), 4) ?? 0,
      previousState: previousChroma ? chromaLabel(previousChroma.values) : 'UNKNOWN',
      nextState: nextChroma ? chromaLabel(nextChroma.values) : 'UNKNOWN',
    });
  }
  return events.slice(0, 128);
}
