import { roundRhythm } from './types';

export function estimateTempoDrift(localTempo: Array<{ timestampSeconds: number; bpm: number; confidence: number }>) {
  const reliable = localTempo.filter((item) => item.confidence >= 0.35);
  if (reliable.length < 2) {
    return {
      initialBpm: null,
      finalBpm: null,
      absoluteDelta: null,
      relativeDelta: null,
      slopeBpmPerMinute: null,
      stability: null,
    };
  }
  const first = reliable[0];
  const last = reliable[reliable.length - 1];
  const absoluteDelta = last.bpm - first.bpm;
  const minutes = Math.max(1e-9, (last.timestampSeconds - first.timestampSeconds) / 60);
  const mean = reliable.reduce((sum, item) => sum + item.bpm, 0) / reliable.length;
  const dispersion = Math.sqrt(reliable.reduce((sum, item) => sum + Math.pow(item.bpm - mean, 2), 0) / reliable.length);
  return {
    initialBpm: roundRhythm(first.bpm, 3),
    finalBpm: roundRhythm(last.bpm, 3),
    absoluteDelta: roundRhythm(absoluteDelta, 3),
    relativeDelta: roundRhythm(first.bpm ? absoluteDelta / first.bpm : null, 5),
    slopeBpmPerMinute: roundRhythm(absoluteDelta / minutes, 4),
    stability: roundRhythm(Math.max(0, Math.min(1, 1 - dispersion / Math.max(1, mean))), 4),
  };
}
