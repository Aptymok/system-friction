export type HarmonyStatus = 'OBSERVED' | 'CALIBRATED' | 'PARTIAL' | 'INSUFFICIENT_SIGNAL' | 'FAILED';

export const HARMONY_ENGINE_NAME = 'studio_audio_harmony_engine';
export const HARMONY_ENGINE_VERSION = '2026-08-02.harmony.v1';

export interface HarmonyAnalysisInput {
  objectId: string;
  sampleRate: number;
  channels: Float32Array[];
  durationSeconds: number;
  trace?: {
    logbookId?: string;
    correlationId?: string;
  };
}

export interface HarmonyFrame {
  index: number;
  startSeconds: number;
  rms: number;
  spectrum: Float64Array;
}

export interface PitchFrame {
  timestampSeconds: number;
  frequencyHz: number | null;
  midiNote?: number;
  confidence: number;
  voiced: boolean;
}

export interface ChromaFrame {
  timestampSeconds: number;
  values: [number, number, number, number, number, number, number, number, number, number, number, number];
  confidence: number;
}

export interface KeyCandidate {
  key: string;
  mode: 'major' | 'minor';
  score: number;
  confidence: number;
}

export interface KeyEstimationResult {
  selectedKey: string | null;
  mode: 'major' | 'minor' | null;
  confidence: number;
  candidates: KeyCandidate[];
  tuningOffsetCents: number | null;
  method: string;
  limitations: string[];
}

export interface TonalCentroidFrame {
  timestampSeconds: number;
  values: [number, number, number, number, number, number];
  movement: number;
}

export interface HarmonicChangeEvent {
  timestampSeconds: number;
  strength: number;
  confidence: number;
  previousState: string;
  nextState: string;
}

export interface HarmonicStabilityResult {
  value: number | null;
  status: 'OBSERVED' | 'INSUFFICIENT_SIGNAL';
  confidence: number;
  components: {
    chromaPersistence: number | null;
    tonalCentroidStability: number | null;
    changeRateStability: number | null;
    keyConfidence: number | null;
    consonance: number | null;
    signalSufficiency: number;
  };
  method: string[];
  limitations: string[];
}

export interface TonalAmbiguityResult {
  value: number | null;
  confidence: number;
  drivers: string[];
  status: 'OBSERVED' | 'INSUFFICIENT_SIGNAL';
}

export interface DissonanceResult {
  value: number | null;
  confidence: number;
  model: string;
  range: '0..1';
  normalization: string;
  limitations: string[];
}

export interface ChordHypothesis {
  timestampSeconds: number;
  chord: string | null;
  confidence: number;
  candidates: Array<{ chord: string; score: number; confidence: number }>;
  status: 'OBSERVED' | 'INSUFFICIENT_SIGNAL';
}

export interface HarmonyCalibrationResult {
  agent: 'Reality Calibration Agent';
  approved: boolean;
  degraded: boolean;
  rejected: boolean;
  expected: Record<string, unknown> | null;
  measured: Record<string, unknown>;
  error: Record<string, number | null>;
  confidence: number;
  status: 'APPROVED' | 'DEGRADED' | 'REJECTED' | 'REFERENCE_UNAVAILABLE';
  limitations: string[];
}

export interface HarmonyAnalysisResult {
  status: HarmonyStatus;
  pitch: {
    frames: PitchFrame[];
    voicedFrameRatio: number;
    medianFrequencyHz: number | null;
    minFrequencyHz: number | null;
    maxFrequencyHz: number | null;
    confidence: number;
  };
  chroma: {
    frames: ChromaFrame[];
    distribution: [number, number, number, number, number, number, number, number, number, number, number, number] | null;
    confidence: number;
  };
  key: KeyEstimationResult;
  tonalCentroid: {
    frames: TonalCentroidFrame[];
    movement: number | null;
    stability: number | null;
  };
  harmonicChanges: HarmonicChangeEvent[];
  harmonicStability: HarmonicStabilityResult;
  tonalAmbiguity: TonalAmbiguityResult;
  dissonance: DissonanceResult;
  chordHypotheses: ChordHypothesis[];
  calibration: HarmonyCalibrationResult;
  engineVersion: string;
  method: string[];
  confidence: number;
  limitations: string[];
}

export type HarmonyAnalysisOptions = {
  objectId?: string | null;
  logbookId?: string | null;
  correlationId?: string | null;
  expectedPitchHz?: number | null;
  expectedKey?: string | null;
  expectedMode?: 'major' | 'minor' | null;
  expectedChord?: string | null;
};

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function roundHarmony(value: number | null, digits = 4) {
  return value === null || !Number.isFinite(value) ? null : Number(value.toFixed(digits));
}
