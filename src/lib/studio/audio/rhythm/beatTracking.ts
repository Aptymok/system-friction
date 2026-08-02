import type { BeatEvent, OnsetEvent } from './types';

function nearestOnsetConfidence(onsets: OnsetEvent[], timestamp: number, tolerance: number) {
  let best = 0;
  for (const onset of onsets) {
    const distance = Math.abs(onset.timestampSeconds - timestamp);
    if (distance <= tolerance) best = Math.max(best, onset.confidence * (1 - distance / tolerance));
  }
  return best;
}

export function trackBeats(input: {
  onsets: OnsetEvent[];
  globalBpm: number | null;
  durationSeconds: number;
  pulseClarity: number | null;
}): BeatEvent[] {
  if (!input.globalBpm || !input.onsets.length || (input.pulseClarity ?? 0) < 0.28) return [];
  const period = 60 / input.globalBpm;
  const tolerance = Math.min(0.09, period * 0.2);
  const maxPhase = Math.min(input.onsets.length, 16);
  let bestPhase = input.onsets[0].timestampSeconds;
  let bestScore = -Infinity;

  for (let phaseIndex = 0; phaseIndex < maxPhase; phaseIndex += 1) {
    const phase = input.onsets[phaseIndex].timestampSeconds;
    let score = 0;
    for (let beatTime = phase; beatTime <= input.durationSeconds; beatTime += period) {
      score += nearestOnsetConfidence(input.onsets, beatTime, tolerance);
    }
    if (score > bestScore) {
      bestScore = score;
      bestPhase = phase;
    }
  }

  const beats: BeatEvent[] = [];
  let index = 0;
  for (let time = bestPhase; time <= input.durationSeconds; time += period) {
    const confidence = Math.max(0.08, nearestOnsetConfidence(input.onsets, time, tolerance) * 0.75 + (input.pulseClarity ?? 0) * 0.25);
    beats.push({
      index,
      timestampSeconds: Number(time.toFixed(4)),
      confidence: Number(Math.min(1, confidence).toFixed(4)),
      localBpm: Number(input.globalBpm.toFixed(3)),
    });
    index += 1;
  }

  return beats;
}

export function averageBeatConfidence(beats: BeatEvent[]) {
  return beats.length ? beats.reduce((sum, beat) => sum + beat.confidence, 0) / beats.length : 0;
}
