import { clamp01, roundHarmony, type ChromaFrame, type KeyEstimationResult, type TonalAmbiguityResult } from './types';

function entropy(values: number[]) {
  const valid = values.filter((value) => value > 0);
  if (!valid.length) return 1;
  const raw = -valid.reduce((sum, value) => sum + value * Math.log2(value), 0);
  return raw / Math.log2(12);
}

export function estimateTonalAmbiguity(key: KeyEstimationResult, chromaFrames: ChromaFrame[]): TonalAmbiguityResult {
  if (!chromaFrames.length) return { value: null, confidence: 0, drivers: ['NO_CHROMA_FRAMES'], status: 'INSUFFICIENT_SIGNAL' };
  const top = key.candidates[0];
  const second = key.candidates[1];
  const margin = top && second ? Math.max(0, top.score - second.score) : 0;
  const meanEntropy = chromaFrames.reduce((sum, frame) => sum + entropy(frame.values), 0) / chromaFrames.length;
  const tonalCoverage = chromaFrames.filter((frame) => frame.confidence >= 0.12).length / chromaFrames.length;
  const value = clamp01((1 - Math.min(1, margin * 8)) * 0.38 + meanEntropy * 0.38 + (1 - tonalCoverage) * 0.24);
  const drivers: string[] = [];
  if (margin < 0.08) drivers.push('KEY_CANDIDATES_CLOSE');
  if (meanEntropy > 0.72) drivers.push('DISTRIBUTED_CHROMA_ENERGY');
  if (tonalCoverage < 0.45) drivers.push('LOW_TONAL_COVERAGE');
  return {
    value: roundHarmony(value, 4),
    confidence: roundHarmony(clamp01(tonalCoverage * 0.7 + key.confidence * 0.3), 4) ?? 0,
    drivers,
    status: tonalCoverage < 0.12 ? 'INSUFFICIENT_SIGNAL' : 'OBSERVED',
  };
}
