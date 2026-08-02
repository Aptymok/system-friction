import type { BeatEvent, OnsetEvent } from './types';
import { roundRhythm } from './types';

export function calculateRhythmicDensity(onsets: OnsetEvent[], beats: BeatEvent[], durationSeconds: number) {
  const eventsPerSecond = durationSeconds > 0 ? onsets.length / durationSeconds : null;
  const eventsPerBeat = beats.length ? onsets.length / beats.length : null;
  const windowSeconds = 4;
  const windows: Array<{ startSeconds: number; endSeconds: number; value: number }> = [];
  if (durationSeconds > 0) {
    for (let start = 0; start < durationSeconds; start += windowSeconds) {
      const end = Math.min(durationSeconds, start + windowSeconds);
      const count = onsets.filter((onset) => onset.timestampSeconds >= start && onset.timestampSeconds < end).length;
      windows.push({ startSeconds: Number(start.toFixed(3)), endSeconds: Number(end.toFixed(3)), value: roundRhythm(count / Math.max(1e-9, end - start), 4) ?? 0 });
    }
  }
  return {
    eventsPerSecond: roundRhythm(eventsPerSecond, 4),
    eventsPerBeat: roundRhythm(eventsPerBeat, 4),
    windows,
  };
}
