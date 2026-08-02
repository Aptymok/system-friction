import type { TempoCandidate } from './types';

function relationToPrimary(bpm: number, primary: number): TempoCandidate['relation'] {
  if (Math.abs(bpm - primary) <= 2) return 'PRIMARY';
  if (Math.abs(bpm * 2 - primary) <= 3) return 'HALF_TIME';
  if (Math.abs(bpm / 2 - primary) <= 3) return 'DOUBLE_TIME';
  return 'ALTERNATIVE';
}

export function tempoCandidatesFromTempogram(tempogram: Array<{ bpm: number; score: number }>): TempoCandidate[] {
  if (!tempogram.length) return [];
  const peaks = [...tempogram]
    .sort((left, right) => right.score - left.score)
    .filter((candidate, index, all) => all.findIndex((item) => Math.abs(item.bpm - candidate.bpm) < 3) === index)
    .slice(0, 6);
  const maxScore = Math.max(...peaks.map((item) => item.score), 1e-9);
  const primary = peaks[0]?.bpm ?? 0;
  return peaks.map((item) => ({
    bpm: Number(item.bpm.toFixed(3)),
    score: Number(item.score.toFixed(6)),
    confidence: Number(Math.max(0, Math.min(1, (item.score / maxScore) * Math.min(1, item.score / 0.45))).toFixed(4)),
    relation: relationToPrimary(item.bpm, primary),
  }));
}

export function selectTempoCandidate(candidates: TempoCandidate[]) {
  if (!candidates.length) return null;
  const sorted = [...candidates].sort((left, right) => right.score - left.score);
  return sorted[0];
}

export function hasHalfDoubleAmbiguity(candidates: TempoCandidate[]) {
  const primary = selectTempoCandidate(candidates);
  if (!primary) return false;
  return candidates.some((candidate) => (
    candidate !== primary &&
    candidate.confidence >= 0.82 &&
    (candidate.relation === 'HALF_TIME' || candidate.relation === 'DOUBLE_TIME')
  ));
}
