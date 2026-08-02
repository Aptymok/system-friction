import type { MetricStatus } from '@/lib/studio/production/studioProductionTypes';
import type { StudioAudioFeature, StudioDecodedAudio } from '../audioTypes';
import {
  HARMONY_ENGINE_NAME,
  HARMONY_ENGINE_VERSION,
  analyzeHarmony,
  buildHarmonyEvidence,
  type HarmonyAnalysisInput,
  type HarmonyAnalysisOptions,
  type HarmonyAnalysisResult,
} from '../harmony';

function metricStatus(result: HarmonyAnalysisResult, value: number | string | null): MetricStatus {
  if (value !== null && result.status !== 'INSUFFICIENT_SIGNAL' && result.status !== 'FAILED') return result.status;
  if (result.status === 'FAILED') return 'FAILED';
  if (result.status === 'INSUFFICIENT_SIGNAL') return 'INSUFFICIENT_SIGNAL';
  return 'PARTIAL';
}

function harmonyInputFromDecoded(decoded: StudioDecodedAudio, options: HarmonyAnalysisOptions): HarmonyAnalysisInput {
  return {
    objectId: options.objectId ?? 'studio-audio-object',
    sampleRate: decoded.sampleRate,
    channels: decoded.channelData,
    durationSeconds: decoded.durationSeconds,
    trace: {
      logbookId: options.logbookId ?? undefined,
      correlationId: options.correlationId ?? undefined,
    },
  };
}

function feature(input: {
  key: string;
  label: string;
  value: number | string | null;
  unit: string | null;
  result: HarmonyAnalysisResult;
  explanation: string;
  payload?: Record<string, unknown>;
}): StudioAudioFeature {
  return {
    key: input.key,
    label: input.label,
    value: input.value,
    unit: input.unit,
    status: metricStatus(input.result, input.value),
    source: HARMONY_ENGINE_NAME,
    confidence: input.value === null ? 0 : input.result.confidence,
    formulaVersion: HARMONY_ENGINE_VERSION,
    explanation: input.explanation,
    warnings: input.result.limitations,
    payload: {
      metricId: input.key,
      implementationVersion: HARMONY_ENGINE_VERSION,
      method: input.result.method,
      limitations: input.result.limitations,
      calibration: input.result.calibration,
      harmonyStatus: input.result.status,
      ...input.payload,
    },
  };
}

function chromaDistributionText(result: HarmonyAnalysisResult) {
  if (!result.chroma.distribution) return null;
  return result.chroma.distribution.map((value) => Number(value.toFixed(4))).join(',');
}

function keyText(result: HarmonyAnalysisResult) {
  return result.key.selectedKey && result.key.mode ? `${result.key.selectedKey} ${result.key.mode}` : null;
}

export function harmonyFeaturesFromAnalysis(result: HarmonyAnalysisResult, evidence: Record<string, unknown>): StudioAudioFeature[] {
  const firstObservedChord = result.chordHypotheses.find((item) => item.status === 'OBSERVED')?.chord ?? null;
  return [
    feature({
      key: 'pitch_voiced_frame_ratio',
      label: 'Voiced Frame Ratio',
      value: result.pitch.voicedFrameRatio,
      unit: null,
      result,
      explanation: 'Share of analysis frames with a defensible monophonic pitch estimate.',
      payload: { evidence, pitch: { ...result.pitch, frames: result.pitch.frames.slice(0, 160) } },
    }),
    feature({
      key: 'fundamental_frequency_hz',
      label: 'Median Fundamental Frequency',
      value: result.pitch.medianFrequencyHz,
      unit: 'Hz',
      result,
      explanation: 'Median voiced-frame pitch from autocorrelation tracking; null when confidence is insufficient.',
      payload: { evidence, pitch: { ...result.pitch, frames: result.pitch.frames.slice(0, 160) } },
    }),
    feature({
      key: 'pitch_confidence',
      label: 'Pitch Confidence',
      value: result.pitch.voicedFrameRatio > 0 ? result.pitch.confidence : null,
      unit: null,
      result,
      explanation: 'Mean confidence across voiced pitch frames.',
      payload: { evidence },
    }),
    feature({
      key: 'pitch_range_hz',
      label: 'Pitch Range',
      value: result.pitch.minFrequencyHz !== null && result.pitch.maxFrequencyHz !== null
        ? `${result.pitch.minFrequencyHz}-${result.pitch.maxFrequencyHz}`
        : null,
      unit: 'Hz',
      result,
      explanation: 'Observed min and max voiced pitch range, not forced for noisy or unvoiced material.',
      payload: { evidence },
    }),
    feature({
      key: 'chroma_distribution',
      label: 'Chroma Distribution',
      value: chromaDistributionText(result),
      unit: null,
      result,
      explanation: 'Aggregate 12-class chroma distribution from spectral harmonic energy.',
      payload: { evidence, chroma: { distribution: result.chroma.distribution, frames: result.chroma.frames.slice(0, 160) } },
    }),
    feature({
      key: 'chroma_confidence',
      label: 'Chroma Confidence',
      value: result.chroma.distribution ? result.chroma.confidence : null,
      unit: null,
      result,
      explanation: 'Tonal signal confidence derived from chroma dominance and tonal energy coverage.',
      payload: { evidence },
    }),
    feature({
      key: 'key_estimate',
      label: 'Key Estimate',
      value: keyText(result),
      unit: null,
      result,
      explanation: 'Selected key only when Krumhansl profile confidence is sufficient.',
      payload: { evidence, key: result.key },
    }),
    feature({
      key: 'key_confidence',
      label: 'Key Confidence',
      value: result.key.selectedKey ? result.key.confidence : null,
      unit: null,
      result,
      explanation: 'Key confidence reduced by close relative major/minor candidates and low tonal coverage.',
      payload: { evidence, key: result.key },
    }),
    feature({
      key: 'tuning_offset_cents',
      label: 'Tuning Offset',
      value: result.key.tuningOffsetCents,
      unit: 'cents',
      result,
      explanation: 'Median cents deviation of high-confidence pitched frames from equal-tempered A440 tuning.',
      payload: { evidence },
    }),
    feature({
      key: 'tonal_centroid_movement',
      label: 'Tonal Centroid Movement',
      value: result.tonalCentroid.movement,
      unit: null,
      result,
      explanation: 'Mean Tonnetz movement between consecutive tonal chroma frames.',
      payload: { evidence, tonalCentroid: result.tonalCentroid },
    }),
    feature({
      key: 'harmonic_change_count',
      label: 'Harmonic Change Count',
      value: result.harmonicChanges.length,
      unit: 'events',
      result,
      explanation: 'Adaptive harmonic-change events from chroma and tonal-centroid distance.',
      payload: { evidence, harmonicChanges: result.harmonicChanges.slice(0, 128) },
    }),
    feature({
      key: 'harmonic_stability',
      label: 'Harmonic Stability',
      value: result.harmonicStability.value,
      unit: null,
      result,
      explanation: 'Composite of chroma persistence, tonal centroid stability, harmonic change rate, key confidence, consonance and signal sufficiency.',
      payload: { evidence, harmonicStability: result.harmonicStability },
    }),
    feature({
      key: 'tonal_ambiguity',
      label: 'Tonal Ambiguity',
      value: result.tonalAmbiguity.value,
      unit: null,
      result,
      explanation: 'Ambiguity from close key candidates, distributed chroma energy and low tonal coverage.',
      payload: { evidence, tonalAmbiguity: result.tonalAmbiguity },
    }),
    feature({
      key: 'spectral_dissonance',
      label: 'Spectral Dissonance',
      value: result.dissonance.value,
      unit: null,
      result,
      explanation: 'Bounded spectral roughness estimate; not an emotional label.',
      payload: { evidence, dissonance: result.dissonance },
    }),
    feature({
      key: 'chord_hypothesis',
      label: 'Chord Hypothesis',
      value: firstObservedChord,
      unit: null,
      result,
      explanation: 'Chord hypothesis emitted only when chroma template confidence is sufficient.',
      payload: { evidence, chordHypotheses: result.chordHypotheses.slice(0, 96) },
    }),
  ];
}

export function extractHarmonyFeatures(decoded: StudioDecodedAudio, options: HarmonyAnalysisOptions = {}): StudioAudioFeature[] {
  const result = analyzeHarmony(decoded, options);
  const evidence = buildHarmonyEvidence(harmonyInputFromDecoded(decoded, options), result);
  return harmonyFeaturesFromAnalysis(result, evidence);
}
