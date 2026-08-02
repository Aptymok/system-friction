import type { StudioDecodedAudio } from '../audioTypes';
import { buildChromaFrames, aggregateChroma } from './chroma';
import { estimateChordHypotheses } from './chordHypotheses';
import { estimateDissonance } from './dissonance';
import { detectHarmonicChanges } from './harmonicChange';
import { estimateHarmonicStability } from './harmonicStability';
import { estimateKey } from './keyEstimation';
import { detectPitchFrames } from './pitchDetection';
import { summarizePitch } from './pitchConfidence';
import { buildHarmonyFrames } from './spectralFrames';
import { estimateTonalAmbiguity } from './tonalAmbiguity';
import { buildTonalCentroid } from './tonalCentroid';
import {
  HARMONY_ENGINE_NAME,
  HARMONY_ENGINE_VERSION,
  clamp01,
  roundHarmony,
  type HarmonyAnalysisInput,
  type HarmonyAnalysisOptions,
  type HarmonyAnalysisResult,
  type HarmonyCalibrationResult,
} from './types';
import { buildHarmonyEvidence } from './harmonyEvidence';

const MIN_HARMONY_DURATION_SECONDS = 1.25;
const MIN_HARMONY_FRAMES = 3;

function decodedToHarmonyInput(decoded: StudioDecodedAudio, options: HarmonyAnalysisOptions): HarmonyAnalysisInput {
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

function calibrateHarmony(
  options: HarmonyAnalysisOptions,
  result: Pick<HarmonyAnalysisResult, 'pitch' | 'key' | 'chordHypotheses' | 'confidence'>,
): HarmonyCalibrationResult {
  const expected: Record<string, unknown> = {};
  if (typeof options.expectedPitchHz === 'number' && Number.isFinite(options.expectedPitchHz)) expected.pitchHz = options.expectedPitchHz;
  if (options.expectedKey) expected.key = options.expectedKey;
  if (options.expectedMode) expected.mode = options.expectedMode;
  if (options.expectedChord) expected.chord = options.expectedChord;

  const measured = {
    pitchHz: result.pitch.medianFrequencyHz,
    key: result.key.selectedKey,
    mode: result.key.mode,
    chord: result.chordHypotheses.find((item) => item.status === 'OBSERVED')?.chord ?? null,
  };

  if (!Object.keys(expected).length) {
    return {
      agent: 'Reality Calibration Agent',
      approved: false,
      degraded: true,
      rejected: false,
      expected: null,
      measured,
      error: { pitchHz: null, keyMismatch: null, chordMismatch: null },
      confidence: roundHarmony(result.confidence * 0.86, 4) ?? 0,
      status: 'REFERENCE_UNAVAILABLE',
      limitations: ['HARMONY_CALIBRATION_REFERENCE_UNAVAILABLE'],
    };
  }

  const pitchError = typeof expected.pitchHz === 'number' && measured.pitchHz !== null
    ? Math.abs(measured.pitchHz - expected.pitchHz)
    : null;
  const keyMismatch = typeof expected.key === 'string'
    ? measured.key === expected.key && (!expected.mode || measured.mode === expected.mode) ? 0 : 1
    : null;
  const chordMismatch = typeof expected.chord === 'string'
    ? measured.chord === expected.chord ? 0 : 1
    : null;
  const pitchOk = pitchError === null || pitchError <= Math.max(1.5, Number(expected.pitchHz) * 0.015);
  const keyOk = keyMismatch === null || keyMismatch === 0;
  const chordOk = chordMismatch === null || chordMismatch === 0;
  const approved = pitchOk && keyOk && chordOk;
  const degraded = !approved && ((pitchError !== null && pitchError <= Math.max(4, Number(expected.pitchHz) * 0.035)) || keyOk || chordOk);
  return {
    agent: 'Reality Calibration Agent',
    approved,
    degraded,
    rejected: !approved && !degraded,
    expected,
    measured,
    error: {
      pitchHz: roundHarmony(pitchError, 4),
      keyMismatch,
      chordMismatch,
    },
    confidence: approved ? Math.max(result.confidence, 0.86) : degraded ? Math.min(result.confidence, 0.64) : Math.min(result.confidence, 0.34),
    status: approved ? 'APPROVED' : degraded ? 'DEGRADED' : 'REJECTED',
    limitations: approved ? [] : degraded ? ['HARMONY_CALIBRATION_DEGRADED'] : ['HARMONY_CALIBRATION_REJECTED'],
  };
}

function emptyResult(input: HarmonyAnalysisInput, options: HarmonyAnalysisOptions, limitations: string[]): HarmonyAnalysisResult {
  const result: HarmonyAnalysisResult = {
    status: 'INSUFFICIENT_SIGNAL',
    pitch: {
      frames: [],
      voicedFrameRatio: 0,
      medianFrequencyHz: null,
      minFrequencyHz: null,
      maxFrequencyHz: null,
      confidence: 0,
    },
    chroma: {
      frames: [],
      distribution: null,
      confidence: 0,
    },
    key: {
      selectedKey: null,
      mode: null,
      confidence: 0,
      candidates: [],
      tuningOffsetCents: null,
      method: 'Krumhansl-Schmuckler key profile correlation over aggregate chroma',
      limitations: ['NO_TONAL_CHROMA_AVAILABLE'],
    },
    tonalCentroid: { frames: [], movement: null, stability: null },
    harmonicChanges: [],
    harmonicStability: {
      value: null,
      status: 'INSUFFICIENT_SIGNAL',
      confidence: 0,
      components: {
        chromaPersistence: null,
        tonalCentroidStability: null,
        changeRateStability: null,
        keyConfidence: null,
        consonance: null,
        signalSufficiency: 0,
      },
      method: ['NO_SYNTHETIC_HARMONY_GENERATED'],
      limitations,
    },
    tonalAmbiguity: { value: null, confidence: 0, drivers: ['NO_TONAL_SIGNAL'], status: 'INSUFFICIENT_SIGNAL' },
    dissonance: {
      value: null,
      confidence: 0,
      model: 'Sethares-style pairwise spectral roughness over dominant peaks',
      range: '0..1',
      normalization: 'bounded weighted pair roughness',
      limitations: ['DISSONANCE_REQUIRES_TONAL_SPECTRAL_ENERGY'],
    },
    chordHypotheses: [],
    calibration: {
      agent: 'Reality Calibration Agent',
      approved: false,
      degraded: true,
      rejected: false,
      expected: null,
      measured: { pitchHz: null, key: null, mode: null, chord: null },
      error: { pitchHz: null, keyMismatch: null, chordMismatch: null },
      confidence: 0,
      status: 'REFERENCE_UNAVAILABLE',
      limitations: ['HARMONY_CALIBRATION_REFERENCE_UNAVAILABLE'],
    },
    engineVersion: HARMONY_ENGINE_VERSION,
    method: [
      'PCM_VALIDATION',
      'MONO_ANALYTIC_MIXDOWN_WITH_SOURCE_PRESERVED',
      'AUTOCORRELATION_PITCH_TRACKING',
      'SPECTRAL_CHROMA_12_CLASS',
      'NO_SYNTHETIC_HARMONY_GENERATED',
    ],
    confidence: 0,
    limitations: [...new Set(limitations)],
  };
  result.calibration = calibrateHarmony(options, result);
  return result;
}

export function analyzeHarmony(decoded: StudioDecodedAudio, options: HarmonyAnalysisOptions = {}): HarmonyAnalysisResult {
  const input = decodedToHarmonyInput(decoded, options);
  const limitations: string[] = [];
  if (!Number.isFinite(input.sampleRate) || input.sampleRate <= 0) return emptyResult(input, options, ['INVALID_SAMPLE_RATE']);
  if (!input.channels.length || input.channels.every((channel) => channel.length === 0)) return emptyResult(input, options, ['NO_PCM_CHANNELS']);
  if (!Number.isFinite(input.durationSeconds) || input.durationSeconds < MIN_HARMONY_DURATION_SECONDS) return emptyResult(input, options, ['INSUFFICIENT_DURATION_FOR_HARMONY']);

  const { mono, frames } = buildHarmonyFrames(decoded);
  if (frames.length < MIN_HARMONY_FRAMES) return emptyResult(input, options, ['INSUFFICIENT_FRAMES_FOR_HARMONY']);

  const pitchFrames = detectPitchFrames(mono, decoded.sampleRate);
  const pitch = { frames: pitchFrames, ...summarizePitch(pitchFrames) };
  if (pitch.voicedFrameRatio < 0.04) limitations.push('LOW_VOICED_FRAME_RATIO');
  if (pitch.confidence < 0.35) limitations.push('PITCH_CONFIDENCE_INSUFFICIENT_FOR_MONOPHONIC_CLAIM');
  if ((pitch.maxFrequencyHz ?? 0) >= 1195) limitations.push('PITCH_TRACKING_UPPER_BOUND_REACHED');
  if ((pitch.maxFrequencyHz ?? 0) - (pitch.minFrequencyHz ?? 0) > 900) limitations.push('MONOPHONIC_PITCH_AMBIGUOUS_IN_COMPLEX_AUDIO');

  const chromaFrames = buildChromaFrames(frames, decoded.sampleRate);
  const chromaDistribution = aggregateChroma(chromaFrames);
  const chromaConfidence = chromaFrames.length
    ? chromaFrames.reduce((sum, frame) => sum + frame.confidence, 0) / chromaFrames.length
    : 0;
  if (!chromaDistribution || chromaConfidence < 0.08) limitations.push('CHROMA_CONFIDENCE_INSUFFICIENT');

  const key = estimateKey(chromaDistribution, chromaFrames, pitchFrames);
  limitations.push(...key.limitations);
  const tonalCentroid = buildTonalCentroid(chromaFrames);
  const harmonicChanges = detectHarmonicChanges(chromaFrames, tonalCentroid.frames);
  const dissonance = estimateDissonance(frames, decoded.sampleRate);
  const tonalAmbiguity = estimateTonalAmbiguity(key, chromaFrames);
  const harmonicStability = estimateHarmonicStability({
    chromaFrames,
    tonalCentroidStability: tonalCentroid.stability,
    changes: harmonicChanges,
    key,
    dissonance,
    durationSeconds: decoded.durationSeconds,
  });
  limitations.push(...harmonicStability.limitations, ...dissonance.limitations);
  const chordHypotheses = estimateChordHypotheses(chromaFrames);
  if (!chordHypotheses.some((item) => item.status === 'OBSERVED')) limitations.push('CHORD_CONFIDENCE_INSUFFICIENT');

  const confidence = clamp01(
    pitch.confidence * 0.18 +
    chromaConfidence * 0.24 +
    key.confidence * 0.2 +
    (tonalCentroid.stability ?? 0) * 0.12 +
    harmonicStability.confidence * 0.16 +
    dissonance.confidence * 0.1,
  );
  const resultWithoutCalibration: HarmonyAnalysisResult = {
    status: 'PARTIAL',
    pitch,
    chroma: {
      frames: chromaFrames,
      distribution: chromaDistribution,
      confidence: roundHarmony(chromaConfidence, 4) ?? 0,
    },
    key,
    tonalCentroid,
    harmonicChanges,
    harmonicStability,
    tonalAmbiguity,
    dissonance,
    chordHypotheses,
    calibration: {
      agent: 'Reality Calibration Agent',
      approved: false,
      degraded: true,
      rejected: false,
      expected: null,
      measured: {},
      error: {},
      confidence: 0,
      status: 'REFERENCE_UNAVAILABLE',
      limitations: [],
    },
    engineVersion: HARMONY_ENGINE_VERSION,
    method: [
      'MONO_ANALYTIC_MIXDOWN_WITH_SOURCE_PRESERVED',
      'HANN_WINDOW_4096_SAMPLES',
      '2048_SAMPLE_HOP',
      'AUTOCORRELATION_PITCH_TRACKING',
      'SPECTRAL_CHROMA_12_CLASS',
      'KRUMHANSL_KEY_PROFILES',
      'TONNETZ_TONAL_CENTROID',
      'ADAPTIVE_HARMONIC_CHANGE_DETECTION',
      'SPECTRAL_ROUGHNESS_DISSONANCE',
      'TEMPLATE_CHORD_HYPOTHESES_WITH_CONFIDENCE_GATE',
    ],
    confidence: roundHarmony(confidence, 4) ?? 0,
    limitations: [],
  };
  const calibration = calibrateHarmony(options, resultWithoutCalibration);
  const status = calibration.approved
    ? 'CALIBRATED'
    : harmonicStability.status === 'OBSERVED' || key.selectedKey
      ? 'OBSERVED'
      : chromaDistribution
        ? 'PARTIAL'
        : 'INSUFFICIENT_SIGNAL';
  return {
    ...resultWithoutCalibration,
    status,
    calibration,
    limitations: [...new Set([...limitations, ...calibration.limitations])],
  };
}

export { buildHarmonyEvidence };
export { HARMONY_ENGINE_NAME, HARMONY_ENGINE_VERSION } from './types';
export type {
  ChordHypothesis,
  ChromaFrame,
  DissonanceResult,
  HarmonicChangeEvent,
  HarmonicStabilityResult,
  HarmonyAnalysisInput,
  HarmonyAnalysisOptions,
  HarmonyAnalysisResult,
  HarmonyCalibrationResult,
  HarmonyStatus,
  KeyCandidate,
  KeyEstimationResult,
  PitchFrame,
  TonalAmbiguityResult,
  TonalCentroidFrame,
} from './types';
