export type RhythmStatus = 'OBSERVED' | 'CALIBRATED' | 'PARTIAL' | 'INSUFFICIENT_SIGNAL' | 'FAILED';

export const RHYTHM_ENGINE_NAME = 'studio_audio_rhythm_engine';
export const RHYTHM_ENGINE_VERSION = '2026-08-02.rhythm.v1';

export interface RhythmAnalysisInput {
  objectId: string;
  sampleRate: number;
  channels: Float32Array[];
  durationSeconds: number;
  trace?: {
    logbookId?: string;
    correlationId?: string;
  };
}

export interface RhythmFrame {
  index: number;
  startSeconds: number;
  energy: number;
  highFrequencyContent: number;
  spectrum: Float64Array;
}

export interface OnsetEvent {
  timestampSeconds: number;
  frameIndex: number;
  strength: number;
  confidence: number;
  method: string;
}

export interface TempoCandidate {
  bpm: number;
  score: number;
  confidence: number;
  relation?: 'PRIMARY' | 'HALF_TIME' | 'DOUBLE_TIME' | 'ALTERNATIVE';
}

export interface BeatEvent {
  index: number;
  timestampSeconds: number;
  confidence: number;
  localBpm?: number;
}

export interface MeterCandidate {
  numerator: number;
  denominator: number;
  confidence: number;
}

export interface RhythmCalibrationResult {
  agent: 'Reality Calibration Agent';
  approved: boolean;
  degraded: boolean;
  rejected: boolean;
  expectedBpm: number | null;
  measuredBpm: number | null;
  absoluteError: number | null;
  relativeError: number | null;
  beatAlignmentError: number | null;
  confidence: number;
  status: 'APPROVED' | 'DEGRADED' | 'REJECTED' | 'REFERENCE_UNAVAILABLE';
  limitations: string[];
}

export interface RhythmAnalysisResult {
  status: RhythmStatus;
  onsetEnvelope: {
    hopSeconds: number;
    frameCount: number;
    artifactReference?: string;
  };
  onsets: OnsetEvent[];
  tempo: {
    globalBpm: number | null;
    confidence: number;
    candidates: TempoCandidate[];
    localTempo: Array<{
      timestampSeconds: number;
      bpm: number;
      confidence: number;
    }>;
  };
  beats: BeatEvent[];
  pulseClarity: number | null;
  tempoDrift: {
    initialBpm: number | null;
    finalBpm: number | null;
    absoluteDelta: number | null;
    relativeDelta: number | null;
    slopeBpmPerMinute: number | null;
    stability: number | null;
  };
  rhythmicDensity: {
    eventsPerSecond: number | null;
    eventsPerBeat: number | null;
    windows: Array<{
      startSeconds: number;
      endSeconds: number;
      value: number;
    }>;
  };
  rhythmicRegularity: {
    value: number | null;
    ioiDispersion: number | null;
    confidence: number;
  };
  syncopation: {
    value: number | null;
    confidence: number;
    status: 'OBSERVED' | 'INSUFFICIENT_SIGNAL';
  };
  meter: {
    selected: MeterCandidate | null;
    candidates: MeterCandidate[];
    confidence: number;
    status: 'OBSERVED' | 'INSUFFICIENT_SIGNAL';
  };
  calibration: RhythmCalibrationResult;
  engineVersion: string;
  method: string[];
  confidence: number;
  limitations: string[];
}

export type RhythmAnalysisOptions = {
  objectId?: string | null;
  logbookId?: string | null;
  correlationId?: string | null;
  expectedBpm?: number | null;
  expectedBeatTimes?: number[];
};

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function roundRhythm(value: number | null, digits = 4) {
  return value === null || !Number.isFinite(value) ? null : Number(value.toFixed(digits));
}
