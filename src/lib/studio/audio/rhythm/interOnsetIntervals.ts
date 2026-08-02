import type { OnsetEvent } from './types';

export function interOnsetIntervals(onsets: OnsetEvent[]) {
  const intervals: number[] = [];
  for (let index = 1; index < onsets.length; index += 1) {
    const interval = onsets[index].timestampSeconds - onsets[index - 1].timestampSeconds;
    if (Number.isFinite(interval) && interval > 0) intervals.push(Number(interval.toFixed(6)));
  }
  return intervals;
}

export function ioiBpmValues(intervals: number[]) {
  return intervals
    .map((interval) => 60 / interval)
    .filter((bpm) => Number.isFinite(bpm) && bpm >= 40 && bpm <= 240);
}
