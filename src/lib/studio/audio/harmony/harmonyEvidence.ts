import { HARMONY_ENGINE_NAME, HARMONY_ENGINE_VERSION, type HarmonyAnalysisInput, type HarmonyAnalysisResult } from './types';

export function buildHarmonyEvidence(input: HarmonyAnalysisInput, result: HarmonyAnalysisResult) {
  return {
    evidenceType: 'studio_audio_harmony_analysis',
    source: HARMONY_ENGINE_NAME,
    engineVersion: HARMONY_ENGINE_VERSION,
    objectId: input.objectId,
    trace: input.trace?.correlationId ?? null,
    logbookId: input.trace?.logbookId ?? null,
    method: result.method,
    status: result.status,
    confidence: result.confidence,
    pitchSummary: {
      voicedFrameRatio: result.pitch.voicedFrameRatio,
      medianFrequencyHz: result.pitch.medianFrequencyHz,
      minFrequencyHz: result.pitch.minFrequencyHz,
      maxFrequencyHz: result.pitch.maxFrequencyHz,
      confidence: result.pitch.confidence,
    },
    chromaSummary: {
      distribution: result.chroma.distribution,
      confidence: result.chroma.confidence,
      frameCount: result.chroma.frames.length,
    },
    key: result.key,
    tonalCentroid: {
      movement: result.tonalCentroid.movement,
      stability: result.tonalCentroid.stability,
      sample: result.tonalCentroid.frames.slice(0, 128),
    },
    harmonicChanges: {
      count: result.harmonicChanges.length,
      sample: result.harmonicChanges.slice(0, 128),
    },
    harmonicStability: result.harmonicStability,
    tonalAmbiguity: result.tonalAmbiguity,
    dissonance: result.dissonance,
    chordHypotheses: {
      count: result.chordHypotheses.length,
      sample: result.chordHypotheses.slice(0, 96),
    },
    limitations: result.limitations,
    calibration: result.calibration,
  };
}
