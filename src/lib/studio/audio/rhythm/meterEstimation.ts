import type { BeatEvent, MeterCandidate, OnsetEvent } from './types';

function beatAccentScores(onsets: OnsetEvent[], beats: BeatEvent[]) {
  return beats.map((beat) => {
    let score = 0;
    for (const onset of onsets) {
      const distance = Math.abs(onset.timestampSeconds - beat.timestampSeconds);
      if (distance <= 0.08) score = Math.max(score, onset.strength * onset.confidence * (1 - distance / 0.08));
    }
    return score;
  });
}

function meterScore(accents: number[], numerator: number) {
  if (accents.length < numerator * 2) return 0;
  let downbeat = 0;
  let other = 0;
  let downbeatCount = 0;
  let otherCount = 0;
  for (let index = 0; index < accents.length; index += 1) {
    if (index % numerator === 0) {
      downbeat += accents[index];
      downbeatCount += 1;
    } else {
      other += accents[index];
      otherCount += 1;
    }
  }
  const downbeatMean = downbeat / Math.max(1, downbeatCount);
  const otherMean = other / Math.max(1, otherCount);
  return Math.max(0, downbeatMean - otherMean);
}

export function estimateMeter(onsets: OnsetEvent[], beats: BeatEvent[]) {
  if (beats.length < 8 || onsets.length < 6) {
    return {
      selected: null,
      candidates: [] as MeterCandidate[],
      confidence: 0,
      status: 'INSUFFICIENT_SIGNAL' as const,
    };
  }
  const accents = beatAccentScores(onsets, beats);
  const raw = [3, 4].map((numerator) => ({ numerator, denominator: 4, raw: meterScore(accents, numerator) }));
  const max = Math.max(...raw.map((item) => item.raw), 1e-9);
  const candidates: MeterCandidate[] = raw
    .map((item) => ({
      numerator: item.numerator,
      denominator: item.denominator,
      confidence: Number(Math.max(0, Math.min(1, item.raw / max)).toFixed(4)),
    }))
    .sort((left, right) => right.confidence - left.confidence);
  const selected = candidates[0]?.confidence >= 0.58 ? candidates[0] : null;
  return {
    selected,
    candidates,
    confidence: selected?.confidence ?? 0,
    status: selected ? 'OBSERVED' as const : 'INSUFFICIENT_SIGNAL' as const,
  };
}
