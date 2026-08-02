import { clamp01, roundHarmony, type ChromaFrame, type DissonanceResult, type HarmonicChangeEvent, type HarmonicStabilityResult, type KeyEstimationResult } from './types';

function chromaPersistence(frames: ChromaFrame[]) {
  const tonal = frames.filter((frame) => frame.confidence >= 0.12);
  if (tonal.length < 2) return null;
  let similarity = 0;
  for (let index = 1; index < tonal.length; index += 1) {
    let dot = 0;
    let left = 0;
    let right = 0;
    for (let pc = 0; pc < 12; pc += 1) {
      dot += tonal[index - 1].values[pc] * tonal[index].values[pc];
      left += tonal[index - 1].values[pc] ** 2;
      right += tonal[index].values[pc] ** 2;
    }
    similarity += dot / Math.sqrt(Math.max(1e-12, left * right));
  }
  return similarity / (tonal.length - 1);
}

export function estimateHarmonicStability(input: {
  chromaFrames: ChromaFrame[];
  tonalCentroidStability: number | null;
  changes: HarmonicChangeEvent[];
  key: KeyEstimationResult;
  dissonance: DissonanceResult;
  durationSeconds: number;
}): HarmonicStabilityResult {
  const signalSufficiency = input.chromaFrames.length
    ? input.chromaFrames.filter((frame) => frame.confidence >= 0.12).length / input.chromaFrames.length
    : 0;
  const persistence = chromaPersistence(input.chromaFrames);
  const changeRatePerMinute = input.durationSeconds > 0 ? input.changes.length / (input.durationSeconds / 60) : 0;
  const changeRateStability = clamp01(1 - changeRatePerMinute / 18);
  const consonance = input.dissonance.value === null ? null : 1 - input.dissonance.value;
  const limitations: string[] = [];
  if (signalSufficiency < 0.18) limitations.push('HARMONIC_STABILITY_REQUIRES_TONAL_SIGNAL');
  if (persistence === null) limitations.push('HARMONIC_STABILITY_REQUIRES_MULTIPLE_CHROMA_FRAMES');
  if (input.key.selectedKey === null) limitations.push('KEY_NOT_SELECTED_FOR_STABILITY_COMPONENT');
  if (input.dissonance.value === null) limitations.push('DISSONANCE_COMPONENT_UNAVAILABLE');
  if (signalSufficiency < 0.18 || persistence === null) {
    return {
      value: null,
      status: 'INSUFFICIENT_SIGNAL',
      confidence: 0,
      components: {
        chromaPersistence: roundHarmony(persistence, 4),
        tonalCentroidStability: input.tonalCentroidStability,
        changeRateStability: roundHarmony(changeRateStability, 4),
        keyConfidence: input.key.confidence,
        consonance: roundHarmony(consonance, 4),
        signalSufficiency: roundHarmony(signalSufficiency, 4) ?? 0,
      },
      method: ['CHROMA_PERSISTENCE', 'TONNETZ_CENTROID_VARIANCE', 'HARMONIC_CHANGE_RATE', 'KEY_CONFIDENCE', 'SPECTRAL_ROUGHNESS_CONSONANCE'],
      limitations,
    };
  }
  const value = clamp01(
    (persistence ?? 0) * 0.28 +
    (input.tonalCentroidStability ?? 0) * 0.2 +
    changeRateStability * 0.16 +
    input.key.confidence * 0.2 +
    (consonance ?? 0.5) * 0.08 +
    signalSufficiency * 0.08,
  );
  return {
    value: roundHarmony(value, 4),
    status: 'OBSERVED',
    confidence: roundHarmony(clamp01(signalSufficiency * 0.45 + input.key.confidence * 0.35 + (input.dissonance.confidence * 0.2)), 4) ?? 0,
    components: {
      chromaPersistence: roundHarmony(persistence, 4),
      tonalCentroidStability: input.tonalCentroidStability,
      changeRateStability: roundHarmony(changeRateStability, 4),
      keyConfidence: input.key.confidence,
      consonance: roundHarmony(consonance, 4),
      signalSufficiency: roundHarmony(signalSufficiency, 4) ?? 0,
    },
    method: ['CHROMA_PERSISTENCE', 'TONNETZ_CENTROID_VARIANCE', 'HARMONIC_CHANGE_RATE', 'KEY_CONFIDENCE', 'SPECTRAL_ROUGHNESS_CONSONANCE'],
    limitations,
  };
}
