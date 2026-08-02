import type { StudioDecodedAudio } from '../audioTypes';
import { buildRhythmFrames, rhythmHopSeconds } from './analysisFrames';
import { trackBeats, averageBeatConfidence } from './beatTracking';
import { buildRhythmEvidence } from './rhythmEvidence';
import { calculateRhythmicDensity } from './rhythmicDensity';
import { calculateRhythmicRegularity } from './rhythmicRegularity';
import { estimateMeter } from './meterEstimation';
import { detectRhythmOnsets } from './onsetDetection';
import { onsetStrengthEnvelope } from './onsetStrength';
import { estimatePulseClarity } from './pulseClarity';
import { estimateSyncopation } from './syncopation';
import { hasHalfDoubleAmbiguity, selectTempoCandidate, tempoCandidatesFromTempogram } from './tempoCandidates';
import { estimateTempoDrift } from './tempoDrift';
import { buildTempogram } from './tempogram';
import { trackLocalTempo } from './tempoTracking';
import {
  RHYTHM_ENGINE_VERSION,
  type RhythmAnalysisInput,
  type RhythmAnalysisOptions,
  type RhythmAnalysisResult,
  type RhythmCalibrationResult,
  clamp01,
  roundRhythm,
} from './types';

const MIN_RHYTHM_DURATION_SECONDS = 1.5;
const MIN_ONSETS_FOR_TEMPO = 3;

function decodedToRhythmInput(decoded: StudioDecodedAudio, options: RhythmAnalysisOptions): RhythmAnalysisInput {
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

function emptyCalibration(options: RhythmAnalysisOptions, measuredBpm: number | null, confidence: number): RhythmCalibrationResult {
  const expectedBpm = typeof options.expectedBpm === 'number' && Number.isFinite(options.expectedBpm) ? options.expectedBpm : null;
  if (expectedBpm === null) {
    return {
      agent: 'Reality Calibration Agent',
      approved: false,
      degraded: true,
      rejected: false,
      expectedBpm: null,
      measuredBpm,
      absoluteError: null,
      relativeError: null,
      beatAlignmentError: null,
      confidence: roundRhythm(confidence * 0.86, 4) ?? 0,
      status: 'REFERENCE_UNAVAILABLE',
      limitations: ['RHYTHM_CALIBRATION_REFERENCE_UNAVAILABLE'],
    };
  }

  if (measuredBpm === null) {
    return {
      agent: 'Reality Calibration Agent',
      approved: false,
      degraded: false,
      rejected: true,
      expectedBpm,
      measuredBpm: null,
      absoluteError: null,
      relativeError: null,
      beatAlignmentError: null,
      confidence: 0,
      status: 'REJECTED',
      limitations: ['RHYTHM_CALIBRATION_REQUIRES_MEASURED_BPM'],
    };
  }

  const absoluteError = Math.abs(measuredBpm - expectedBpm);
  const relativeError = absoluteError / Math.max(1e-9, expectedBpm);
  const expectedBeatTimes = (options.expectedBeatTimes ?? []).filter((value) => Number.isFinite(value) && value >= 0);
  const beatAlignmentError = expectedBeatTimes.length ? null : null;
  const approved = absoluteError <= 3 || relativeError <= 0.025;
  const degraded = !approved && (absoluteError <= 7 || relativeError <= 0.06);

  return {
    agent: 'Reality Calibration Agent',
    approved,
    degraded,
    rejected: !approved && !degraded,
    expectedBpm: roundRhythm(expectedBpm, 3),
    measuredBpm: roundRhythm(measuredBpm, 3),
    absoluteError: roundRhythm(absoluteError, 3),
    relativeError: roundRhythm(relativeError, 5),
    beatAlignmentError,
    confidence: approved ? Math.max(confidence, 0.86) : degraded ? Math.min(confidence, 0.64) : Math.min(confidence, 0.34),
    status: approved ? 'APPROVED' : degraded ? 'DEGRADED' : 'REJECTED',
    limitations: approved ? [] : degraded ? ['RHYTHM_CALIBRATION_DEGRADED_BY_BPM_ERROR'] : ['RHYTHM_CALIBRATION_REJECTED_BY_BPM_ERROR'],
  };
}

function emptyResult(input: RhythmAnalysisInput, options: RhythmAnalysisOptions, limitations: string[]): RhythmAnalysisResult {
  const calibration = emptyCalibration(options, null, 0);
  return {
    status: 'INSUFFICIENT_SIGNAL',
    onsetEnvelope: { hopSeconds: input.sampleRate > 0 ? rhythmHopSeconds(input.sampleRate) : 0, frameCount: 0 },
    onsets: [],
    tempo: { globalBpm: null, confidence: 0, candidates: [], localTempo: [] },
    beats: [],
    pulseClarity: null,
    tempoDrift: {
      initialBpm: null,
      finalBpm: null,
      absoluteDelta: null,
      relativeDelta: null,
      slopeBpmPerMinute: null,
      stability: null,
    },
    rhythmicDensity: { eventsPerSecond: null, eventsPerBeat: null, windows: [] },
    rhythmicRegularity: { value: null, ioiDispersion: null, confidence: 0 },
    syncopation: { value: null, confidence: 0, status: 'INSUFFICIENT_SIGNAL' },
    meter: { selected: null, candidates: [], confidence: 0, status: 'INSUFFICIENT_SIGNAL' },
    calibration,
    engineVersion: RHYTHM_ENGINE_VERSION,
    method: [
      'PCM_VALIDATION',
      'POSITIVE_SPECTRAL_FLUX',
      'ENERGY_DELTA',
      'NO_SYNTHETIC_RHYTHM_GENERATED',
    ],
    confidence: 0,
    limitations: [...new Set(limitations)],
  };
}

export function analyzeRhythm(decoded: StudioDecodedAudio, options: RhythmAnalysisOptions = {}): RhythmAnalysisResult {
  const input = decodedToRhythmInput(decoded, options);
  const limitations: string[] = [];

  if (!Number.isFinite(input.sampleRate) || input.sampleRate <= 0) {
    return emptyResult(input, options, ['INVALID_SAMPLE_RATE']);
  }
  if (!input.channels.length || input.channels.every((channel) => channel.length === 0)) {
    return emptyResult(input, options, ['NO_PCM_CHANNELS']);
  }
  if (!Number.isFinite(input.durationSeconds) || input.durationSeconds < MIN_RHYTHM_DURATION_SECONDS) {
    return emptyResult(input, options, ['INSUFFICIENT_DURATION_FOR_RHYTHM']);
  }

  const frames = buildRhythmFrames(decoded);
  const hopSeconds = rhythmHopSeconds(decoded.sampleRate);
  if (frames.length < 8) {
    return emptyResult(input, options, ['INSUFFICIENT_FRAMES_FOR_RHYTHM']);
  }

  const envelope = onsetStrengthEnvelope(frames);
  const onsets = detectRhythmOnsets(envelope, hopSeconds);
  if (onsets.length === 0) limitations.push('NO_ONSETS_DETECTED');
  if (onsets.length < MIN_ONSETS_FOR_TEMPO) limitations.push('TEMPO_REQUIRES_AT_LEAST_THREE_ONSETS');

  const tempogram = onsets.length >= MIN_ONSETS_FOR_TEMPO ? buildTempogram(envelope, hopSeconds) : [];
  const candidates = tempoCandidatesFromTempogram(tempogram);
  const selectedTempo = selectTempoCandidate(candidates);
  const ambiguity = hasHalfDoubleAmbiguity(candidates);
  if (ambiguity) limitations.push('TEMPO_HALF_DOUBLE_AMBIGUITY');
  const competingAlternativeAmbiguity = candidates
    .slice(1)
    .some((candidate) => candidate.confidence >= 0.97 && candidate.relation === 'ALTERNATIVE');
  if (competingAlternativeAmbiguity) limitations.push('TEMPO_AMBIGUOUS_COMPETING_ALTERNATIVES');

  const localTempo = selectedTempo ? trackLocalTempo(envelope, hopSeconds) : [];
  const pulseClarity = estimatePulseClarity(candidates, onsets.length, decoded.durationSeconds);
  const candidateSupport = selectedTempo ? Math.min(1, selectedTempo.confidence / 0.6) : 0;
  const effectivePulseClarity = competingAlternativeAmbiguity
    ? (pulseClarity ?? 0) * 0.3
    : (pulseClarity ?? 0) * candidateSupport;
  const beats = selectedTempo ? trackBeats({
    onsets,
    globalBpm: selectedTempo.bpm,
    durationSeconds: decoded.durationSeconds,
    pulseClarity: effectivePulseClarity,
  }) : [];
  const beatConfidence = averageBeatConfidence(beats);
  if (selectedTempo && beats.length === 0) limitations.push('BEAT_GRID_SUPPRESSED_LOW_PULSE_CLARITY');

  const tempoDrift = estimateTempoDrift(localTempo);
  const rhythmicDensity = calculateRhythmicDensity(onsets, beats, decoded.durationSeconds);
  const rhythmicRegularity = calculateRhythmicRegularity(onsets);
  const meter = estimateMeter(onsets, beats);
  if (meter.status === 'INSUFFICIENT_SIGNAL') limitations.push('METER_CONFIDENCE_INSUFFICIENT');
  const syncopation = estimateSyncopation(onsets, beats, meter.selected);
  if (syncopation.status === 'INSUFFICIENT_SIGNAL') limitations.push('SYNCOPATION_REQUIRES_CONFIDENT_BEAT_AND_METER');

  const tempoConfidence = selectedTempo ? selectedTempo.confidence * (ambiguity ? 0.74 : 1) * (competingAlternativeAmbiguity ? 0.35 : 1) : 0;
  const confidence = clamp01((
    tempoConfidence * 0.38 +
    (effectivePulseClarity ?? 0) * 0.22 +
    beatConfidence * 0.2 +
    rhythmicRegularity.confidence * 0.12 +
    meter.confidence * 0.08
  ));
  const calibration = emptyCalibration(options, selectedTempo?.bpm ?? null, confidence);
  const status = calibration.approved
    ? 'CALIBRATED'
    : selectedTempo && beats.length > 0
      ? 'OBSERVED'
      : selectedTempo
        ? 'PARTIAL'
        : 'INSUFFICIENT_SIGNAL';

  return {
    status,
    onsetEnvelope: {
      hopSeconds: roundRhythm(hopSeconds, 6) ?? hopSeconds,
      frameCount: envelope.length,
      artifactReference: `${input.objectId}:rhythm:onset-envelope:${RHYTHM_ENGINE_VERSION}`,
    },
    onsets,
    tempo: {
      globalBpm: selectedTempo ? roundRhythm(selectedTempo.bpm, 3) : null,
      confidence: roundRhythm(tempoConfidence, 4) ?? 0,
      candidates,
      localTempo,
    },
    beats,
    pulseClarity: selectedTempo ? roundRhythm(effectivePulseClarity, 4) : null,
    tempoDrift,
    rhythmicDensity,
    rhythmicRegularity,
    syncopation,
    meter,
    calibration,
    engineVersion: RHYTHM_ENGINE_VERSION,
    method: [
      'MONO_ANALYTIC_MIXDOWN_WITH_SOURCE_PRESERVED',
      'HANN_WINDOW_1024_SAMPLES',
      '512_SAMPLE_HOP',
      'POSITIVE_SPECTRAL_FLUX',
      'ENERGY_DELTA',
      'ADAPTIVE_THRESHOLD_PEAK_PICKING',
      'AUTOCORRELATION_TEMPO_CANDIDATES',
      'PHASE_SEARCH_BEAT_TRACKING',
      'ACCENT_PATTERN_METER_HYPOTHESIS',
    ],
    confidence: roundRhythm(confidence, 4) ?? 0,
    limitations: [...new Set([...limitations, ...calibration.limitations])],
  };
}

export { buildRhythmEvidence };
export { RHYTHM_ENGINE_NAME, RHYTHM_ENGINE_VERSION } from './types';
export type {
  BeatEvent,
  MeterCandidate,
  OnsetEvent,
  RhythmAnalysisInput,
  RhythmAnalysisOptions,
  RhythmAnalysisResult,
  RhythmCalibrationResult,
  RhythmStatus,
  TempoCandidate,
} from './types';
