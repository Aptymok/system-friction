import type { MetricStatus } from '@/lib/studio/production/studioProductionTypes';
import type { StudioAudioFeature, StudioDecodedAudio } from '../audioTypes';
import {
  RHYTHM_ENGINE_NAME,
  RHYTHM_ENGINE_VERSION,
  analyzeRhythm,
  buildRhythmEvidence,
  type RhythmAnalysisInput,
  type RhythmAnalysisOptions,
  type RhythmAnalysisResult,
} from '../rhythm';

function metricStatus(result: RhythmAnalysisResult, value: number | string | null): MetricStatus {
  if (value !== null && result.status !== 'INSUFFICIENT_SIGNAL' && result.status !== 'FAILED') {
    return result.status;
  }
  if (result.status === 'FAILED') return 'FAILED';
  if (result.status === 'INSUFFICIENT_SIGNAL') return 'INSUFFICIENT_SIGNAL';
  return 'PARTIAL';
}

function rhythmInputFromDecoded(decoded: StudioDecodedAudio, options: RhythmAnalysisOptions): RhythmAnalysisInput {
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
  result: RhythmAnalysisResult;
  explanation: string;
  payload?: Record<string, unknown>;
}): StudioAudioFeature {
  return {
    key: input.key,
    label: input.label,
    value: input.value,
    unit: input.unit,
    status: metricStatus(input.result, input.value),
    source: RHYTHM_ENGINE_NAME,
    confidence: input.value === null ? 0 : input.result.confidence,
    formulaVersion: RHYTHM_ENGINE_VERSION,
    explanation: input.explanation,
    warnings: input.result.limitations,
    payload: {
      metricId: input.key,
      implementationVersion: RHYTHM_ENGINE_VERSION,
      method: input.result.method,
      limitations: input.result.limitations,
      calibration: input.result.calibration,
      rhythmStatus: input.result.status,
      ...input.payload,
    },
  };
}

export function rhythmFeaturesFromAnalysis(result: RhythmAnalysisResult, evidence: Record<string, unknown>): StudioAudioFeature[] {
  const candidateText = result.tempo.candidates.length
    ? result.tempo.candidates.map((candidate) => `${candidate.bpm} ${candidate.relation ?? 'ALTERNATIVE'} ${candidate.confidence}`).join('; ')
    : null;
  const selectedMeter = result.meter.selected
    ? `${result.meter.selected.numerator}/${result.meter.selected.denominator}`
    : null;

  return [
    feature({
      key: 'rhythm_onset_count',
      label: 'Onset Count',
      value: result.onsets.length,
      unit: 'events',
      result,
      explanation: 'Detected onset events derived from spectral flux, energy delta, adaptive thresholding and local peak picking.',
      payload: { evidence, onsets: result.onsets.slice(0, 128) },
    }),
    feature({
      key: 'rhythm_onset_density_per_second',
      label: 'Onset Density',
      value: result.rhythmicDensity.eventsPerSecond,
      unit: 'events/s',
      result,
      explanation: 'Onset count divided by decoded object duration.',
      payload: { evidence, density: result.rhythmicDensity },
    }),
    feature({
      key: 'rhythmic_density_events_per_second',
      label: 'Rhythmic Density per Second',
      value: result.rhythmicDensity.eventsPerSecond,
      unit: 'events/s',
      result,
      explanation: 'Detected onset density per second, exposed under the rhythm density contract.',
      payload: { evidence, density: result.rhythmicDensity },
    }),
    feature({
      key: 'rhythm_onset_strength_max',
      label: 'Max Onset Strength',
      value: result.onsets.length ? Math.max(...result.onsets.map((onset) => onset.strength)) : null,
      unit: null,
      result,
      explanation: 'Maximum normalized onset strength among detected real onset events.',
      payload: { evidence },
    }),
    feature({
      key: 'tempo_global_bpm',
      label: 'Global BPM',
      value: result.tempo.globalBpm,
      unit: 'BPM',
      result,
      explanation: 'Global tempo selected from autocorrelation tempo candidates without automatically preferring the highest BPM.',
      payload: { evidence, candidates: result.tempo.candidates },
    }),
    feature({
      key: 'tempo_confidence',
      label: 'Tempo Confidence',
      value: result.tempo.globalBpm === null ? null : result.tempo.confidence,
      unit: null,
      result,
      explanation: 'Tempo confidence reduced when half-time or double-time candidates are competitively plausible.',
      payload: { evidence },
    }),
    feature({
      key: 'tempo_candidates',
      label: 'Tempo Candidates',
      value: candidateText,
      unit: null,
      result,
      explanation: 'Ranked BPM hypotheses with half-time, double-time or alternative relation labels.',
      payload: { evidence, candidates: result.tempo.candidates },
    }),
    feature({
      key: 'beat_count',
      label: 'Beat Count',
      value: result.beats.length || null,
      unit: 'beats',
      result,
      explanation: 'Beat positions generated only when pulse clarity is sufficient for a defensible grid.',
      payload: { evidence, beats: result.beats.slice(0, 256) },
    }),
    feature({
      key: 'beat_confidence',
      label: 'Beat Confidence',
      value: result.beats.length ? result.beats.reduce((sum, beat) => sum + beat.confidence, 0) / result.beats.length : null,
      unit: null,
      result,
      explanation: 'Mean confidence of tracked beat positions against the detected onset field.',
      payload: { evidence },
    }),
    feature({
      key: 'pulse_clarity',
      label: 'Pulse Clarity',
      value: result.pulseClarity,
      unit: null,
      result,
      explanation: 'Strength of the dominant rhythmic periodicity relative to competing tempo candidates and onset density.',
      payload: { evidence },
    }),
    feature({
      key: 'tempo_drift_bpm',
      label: 'Tempo Drift',
      value: result.tempoDrift.absoluteDelta,
      unit: 'BPM',
      result,
      explanation: 'Absolute change between first and last defensible local tempo windows.',
      payload: { evidence, drift: result.tempoDrift },
    }),
    feature({
      key: 'tempo_stability',
      label: 'Tempo Stability',
      value: result.tempoDrift.stability,
      unit: null,
      result,
      explanation: 'Stability derived from local tempo drift; null when local tempo cannot be reconstructed.',
      payload: { evidence, drift: result.tempoDrift },
    }),
    feature({
      key: 'rhythmic_density_events_per_beat',
      label: 'Rhythmic Density per Beat',
      value: result.rhythmicDensity.eventsPerBeat,
      unit: 'events/beat',
      result,
      explanation: 'Detected onset density normalized by beat count when a beat grid exists.',
      payload: { evidence, density: result.rhythmicDensity },
    }),
    feature({
      key: 'rhythmic_regularity',
      label: 'Rhythmic Regularity',
      value: result.rhythmicRegularity.value,
      unit: null,
      result,
      explanation: 'Regularity estimated from inter-onset interval dispersion.',
      payload: { evidence, regularity: result.rhythmicRegularity },
    }),
    feature({
      key: 'ioi_dispersion',
      label: 'Inter-Onset Dispersion',
      value: result.rhythmicRegularity.ioiDispersion,
      unit: 's',
      result,
      explanation: 'Standard deviation to mean ratio of inter-onset intervals.',
      payload: { evidence, regularity: result.rhythmicRegularity },
    }),
    feature({
      key: 'syncopation',
      label: 'Syncopation',
      value: result.syncopation.value,
      unit: null,
      result,
      explanation: 'Syncopation is evaluated only when a beat grid and meter hypothesis are sufficiently confident.',
      payload: { evidence, syncopation: result.syncopation },
    }),
    feature({
      key: 'meter_hypothesis',
      label: 'Meter Hypothesis',
      value: selectedMeter,
      unit: null,
      result,
      explanation: 'Meter remains a hypothesis based on downbeat accent patterns, not a certainty.',
      payload: { evidence, meter: result.meter },
    }),
    feature({
      key: 'meter_confidence',
      label: 'Meter Confidence',
      value: result.meter.selected ? result.meter.confidence : null,
      unit: null,
      result,
      explanation: 'Confidence of the selected meter hypothesis; null when meter is not defensible.',
      payload: { evidence, meter: result.meter },
    }),
  ];
}

export function extractRhythmFeatures(decoded: StudioDecodedAudio, options: RhythmAnalysisOptions = {}): StudioAudioFeature[] {
  const result = analyzeRhythm(decoded, options);
  const evidence = buildRhythmEvidence(rhythmInputFromDecoded(decoded, options), result);
  return rhythmFeaturesFromAnalysis(result, evidence);
}
