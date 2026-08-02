import { pitchClassName } from './spectralFrames';
import { correlation, KRUMHANSL_MAJOR, KRUMHANSL_MINOR, rotateProfile } from './keyProfiles';
import { clamp01, roundHarmony, type ChromaFrame, type KeyCandidate, type KeyEstimationResult, type PitchFrame } from './types';

function estimateTuningOffset(pitchFrames: PitchFrame[]) {
  const offsets = pitchFrames
    .filter((frame) => frame.voiced && frame.frequencyHz !== null && frame.confidence >= 0.65)
    .map((frame) => {
      const midi = 69 + 12 * Math.log2((frame.frequencyHz as number) / 440);
      return (midi - Math.round(midi)) * 100;
    })
    .sort((left, right) => left - right);
  if (!offsets.length) return null;
  return roundHarmony(offsets[Math.floor(offsets.length / 2)], 2);
}

export function estimateKey(chroma: number[] | null, frames: ChromaFrame[], pitchFrames: PitchFrame[]): KeyEstimationResult {
  const limitations: string[] = [];
  if (!chroma) {
    return {
      selectedKey: null,
      mode: null,
      confidence: 0,
      candidates: [],
      tuningOffsetCents: estimateTuningOffset(pitchFrames),
      method: 'Krumhansl-Schmuckler key profile correlation over aggregate chroma',
      limitations: ['NO_TONAL_CHROMA_AVAILABLE'],
    };
  }
  const candidates: KeyCandidate[] = [];
  for (let root = 0; root < 12; root += 1) {
    candidates.push({
      key: pitchClassName(root),
      mode: 'major',
      score: roundHarmony(correlation(chroma, rotateProfile(KRUMHANSL_MAJOR, root)), 4) ?? 0,
      confidence: 0,
    });
    candidates.push({
      key: pitchClassName(root),
      mode: 'minor',
      score: roundHarmony(correlation(chroma, rotateProfile(KRUMHANSL_MINOR, root)), 4) ?? 0,
      confidence: 0,
    });
  }
  candidates.sort((left, right) => right.score - left.score);
  const best = candidates[0];
  const second = candidates[1];
  const tonalCoverage = frames.length ? frames.filter((frame) => frame.confidence >= 0.12).length / frames.length : 0;
  const margin = Math.max(0, best.score - (second?.score ?? -1));
  const confidence = clamp01((best.score + 1) / 2 * 0.38 + margin * 1.6 + tonalCoverage * 0.22);
  const selected = confidence >= 0.42 && best.score > 0.18 ? best : null;
  if (!selected) limitations.push('KEY_CONFIDENCE_INSUFFICIENT');
  if (second && margin < 0.08) limitations.push('KEY_RELATIVE_OR_MODE_AMBIGUITY');
  return {
    selectedKey: selected?.key ?? null,
    mode: selected?.mode ?? null,
    confidence: roundHarmony(confidence, 4) ?? 0,
    candidates: candidates.slice(0, 8).map((candidate) => ({ ...candidate, confidence: roundHarmony(clamp01((candidate.score + 1) / 2), 4) ?? 0 })),
    tuningOffsetCents: estimateTuningOffset(pitchFrames),
    method: 'Krumhansl-Schmuckler key profile correlation over aggregate chroma',
    limitations,
  };
}
