import { pitchClassName } from './spectralFrames';
import { clamp01, roundHarmony, type ChordHypothesis, type ChromaFrame } from './types';

function scoreTemplate(values: number[], root: number, mode: 'maj' | 'min') {
  const thirds = mode === 'maj' ? 4 : 3;
  const chordPcs = new Set([root, (root + thirds) % 12, (root + 7) % 12]);
  const rootEnergy = values[root] ?? 0;
  const thirdEnergy = values[(root + thirds) % 12] ?? 0;
  const fifthEnergy = values[(root + 7) % 12] ?? 0;
  if (rootEnergy < 0.08 || thirdEnergy < 0.08 || fifthEnergy < 0.08) return -1;
  let chordEnergy = 0;
  let otherEnergy = 0;
  for (let pc = 0; pc < 12; pc += 1) {
    if (chordPcs.has(pc)) chordEnergy += values[pc] ?? 0;
    else otherEnergy += values[pc] ?? 0;
  }
  return chordEnergy - otherEnergy * 0.22;
}

export function estimateChordHypotheses(frames: ChromaFrame[]): ChordHypothesis[] {
  const tonalFrames = frames.filter((frame) => frame.confidence >= 0.2);
  if (!tonalFrames.length) return [];
  const windowSize = 4;
  const hypotheses: ChordHypothesis[] = [];
  for (let start = 0; start + windowSize <= tonalFrames.length; start += windowSize) {
    const values = Array.from({ length: 12 }, () => 0);
    for (const frame of tonalFrames.slice(start, start + windowSize)) {
      for (let pc = 0; pc < 12; pc += 1) values[pc] += frame.values[pc] * frame.confidence;
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total <= 1e-12) continue;
    for (let pc = 0; pc < 12; pc += 1) values[pc] /= total;
    const activeClasses = values.filter((value) => value >= 0.07).length;
    const candidates: Array<{ chord: string; score: number; confidence: number }> = [];
    for (let root = 0; root < 12; root += 1) {
      for (const mode of ['maj', 'min'] as const) {
        const score = scoreTemplate(values, root, mode);
        candidates.push({
          chord: `${pitchClassName(root)}${mode}`,
          score: roundHarmony(score, 4) ?? 0,
          confidence: roundHarmony(clamp01((score + 0.2) / 0.92), 4) ?? 0,
        });
      }
    }
    candidates.sort((left, right) => right.score - left.score);
    const best = candidates[0];
    const second = candidates[1];
    const margin = best.score - (second?.score ?? -1);
    const confidence = activeClasses >= 3 ? clamp01(best.confidence * 0.72 + Math.min(1, margin * 4) * 0.28) : 0;
    hypotheses.push({
      timestampSeconds: tonalFrames[start].timestampSeconds,
      chord: confidence >= 0.58 ? best.chord : null,
      confidence: roundHarmony(confidence, 4) ?? 0,
      candidates: candidates.slice(0, 4),
      status: confidence >= 0.58 ? 'OBSERVED' : 'INSUFFICIENT_SIGNAL',
    });
  }
  return hypotheses.slice(0, 96);
}
