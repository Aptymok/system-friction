import type { StudioDecodedAudio } from '../audioTypes';

export type CapabilityOperationalState =
  | 'AVAILABLE'
  | 'EXECUTING'
  | 'BLOCKED_BY_IMPLEMENTATION'
  | 'BLOCKED_BY_INPUT'
  | 'CALIBRATION_REQUIRED'
  | 'FAILED'
  | 'NOT_APPLICABLE';

export type MetricResolutionStatus =
  | 'OBSERVED'
  | 'DERIVED'
  | 'CALIBRATED'
  | 'INSUFFICIENT_SIGNAL'
  | 'REQUIRES_DECLARATION'
  | 'REQUIRES_FIELD_EVIDENCE'
  | 'CAPABILITY_MISSING'
  | 'NOT_APPLICABLE'
  | 'FAILED';

export const LOUDNESS_STANDARD = 'ITU-R BS.1770-4 / EBU R128';
export const LOUDNESS_IMPLEMENTATION_VERSION = '2026-08-02.bs1770-r128.v1';
export const LOUDNESS_DB_FLOOR = -120;

export type LoudnessProvenance = {
  engine: 'studio_audio_loudness_engine';
  implementationVersion: string;
  standard: string;
  trace: string | null;
  objectId: string | null;
  logbookId: string | null;
  generatedAt: string;
};

export type LoudnessCalibrationInput = {
  metricId: string;
  measuredValue: number | null;
  unit: string;
  standard: string;
  implementationVersion: string;
  referenceExpectation: number | null;
  tolerance: number | null;
  inputProperties: {
    sampleRate: number;
    channels: number;
    durationSeconds: number;
  };
  trace: string | null;
};

export type LoudnessCalibrationResult = {
  agent: 'Reality Calibration Agent';
  metricId: string;
  approved: boolean;
  degraded: boolean;
  rejected: boolean;
  error: number | null;
  confidence: number;
  limitations: string[];
  evidence: {
    metricId: string;
    measuredValue: number | null;
    referenceExpectation: number | null;
    tolerance: number | null;
    trace: string | null;
    standard: string;
    implementationVersion: string;
  };
};

export type LoudnessMetricResult<T = number> = {
  metricId: string;
  value: T | null;
  unit: string;
  status: MetricResolutionStatus;
  confidence: number;
  standard: string;
  implementationVersion: string;
  method: string;
  window: string | null;
  gating: string | null;
  limitations: string[];
  provenance: LoudnessProvenance;
  calibration: LoudnessCalibrationResult;
  details?: Record<string, unknown>;
};

export type LoudnessWindow = {
  index: number;
  startSeconds: number;
  endSeconds: number;
  loudnessLufs: number;
  meanSquare: number;
  gated: boolean;
};

export type LoudnessAnalysisOptions = {
  trace?: string | null;
  objectId?: string | null;
  logbookId?: string | null;
  referenceExpectations?: Record<string, { value: number; tolerance: number }>;
};

export type LoudnessAnalysisResult = {
  integrated: LoudnessMetricResult;
  momentary: LoudnessMetricResult<string>;
  shortTerm: LoudnessMetricResult<string>;
  loudnessRange: LoudnessMetricResult;
  truePeak: LoudnessMetricResult;
  truePeakHeadroom: LoudnessMetricResult;
  samplePeak: LoudnessMetricResult;
  windows: {
    momentary: LoudnessWindow[];
    shortTerm: LoudnessWindow[];
    integratedBlocks: LoudnessWindow[];
  };
  limitations: string[];
  provenance: LoudnessProvenance;
};

export type PreparedKWeightedAudio = {
  decoded: StudioDecodedAudio;
  channels: Float32Array[];
  limitations: string[];
};

export function finiteOrNull(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

export function roundMetric(value: number | null, digits = 3) {
  return value === null || !Number.isFinite(value) ? null : Number(value.toFixed(digits));
}

export function loudnessFromMeanSquare(meanSquare: number) {
  if (!Number.isFinite(meanSquare) || meanSquare <= 0) return LOUDNESS_DB_FLOOR;
  return Math.max(LOUDNESS_DB_FLOOR, -0.691 + 10 * Math.log10(meanSquare));
}

export function makeProvenance(decoded: StudioDecodedAudio, options: LoudnessAnalysisOptions = {}): LoudnessProvenance {
  void decoded;
  return {
    engine: 'studio_audio_loudness_engine',
    implementationVersion: LOUDNESS_IMPLEMENTATION_VERSION,
    standard: LOUDNESS_STANDARD,
    trace: options.trace ?? null,
    objectId: options.objectId ?? null,
    logbookId: options.logbookId ?? null,
    generatedAt: new Date().toISOString(),
  };
}

export function calibrateLoudnessMetric(input: LoudnessCalibrationInput): LoudnessCalibrationResult {
  const limitations: string[] = [];
  if (input.measuredValue === null || !Number.isFinite(input.measuredValue)) {
    limitations.push('MEASURED_VALUE_UNAVAILABLE');
    return {
      agent: 'Reality Calibration Agent',
      metricId: input.metricId,
      approved: false,
      degraded: false,
      rejected: true,
      error: null,
      confidence: 0,
      limitations,
      evidence: {
        metricId: input.metricId,
        measuredValue: null,
        referenceExpectation: input.referenceExpectation,
        tolerance: input.tolerance,
        trace: input.trace,
        standard: input.standard,
        implementationVersion: input.implementationVersion,
      },
    };
  }

  if (input.referenceExpectation === null || input.tolerance === null) {
    limitations.push('REFERENCE_EXPECTATION_UNAVAILABLE');
    return {
      agent: 'Reality Calibration Agent',
      metricId: input.metricId,
      approved: false,
      degraded: true,
      rejected: false,
      error: null,
      confidence: 0.82,
      limitations,
      evidence: {
        metricId: input.metricId,
        measuredValue: roundMetric(input.measuredValue),
        referenceExpectation: null,
        tolerance: null,
        trace: input.trace,
        standard: input.standard,
        implementationVersion: input.implementationVersion,
      },
    };
  }

  const error = Math.abs(input.measuredValue - input.referenceExpectation);
  const approved = error <= input.tolerance;
  return {
    agent: 'Reality Calibration Agent',
    metricId: input.metricId,
    approved,
    degraded: !approved,
    rejected: false,
    error: roundMetric(error, 6),
    confidence: approved ? 0.94 : 0.62,
    limitations: approved ? [] : ['REFERENCE_TOLERANCE_EXCEEDED'],
    evidence: {
      metricId: input.metricId,
      measuredValue: roundMetric(input.measuredValue),
      referenceExpectation: roundMetric(input.referenceExpectation),
      tolerance: roundMetric(input.tolerance, 6),
      trace: input.trace,
      standard: input.standard,
      implementationVersion: input.implementationVersion,
    },
  };
}

export function buildMetric<T = number>(input: {
  metricId: string;
  value: T | null;
  unit: string;
  status: MetricResolutionStatus;
  confidence: number;
  method: string;
  window: string | null;
  gating: string | null;
  limitations: string[];
  provenance: LoudnessProvenance;
  calibration: LoudnessCalibrationResult;
  details?: Record<string, unknown>;
}): LoudnessMetricResult<T> {
  return {
    metricId: input.metricId,
    value: input.value,
    unit: input.unit,
    status: input.status,
    confidence: Math.max(0, Math.min(1, Number.isFinite(input.confidence) ? input.confidence : 0)),
    standard: LOUDNESS_STANDARD,
    implementationVersion: LOUDNESS_IMPLEMENTATION_VERSION,
    method: input.method,
    window: input.window,
    gating: input.gating,
    limitations: input.limitations,
    provenance: input.provenance,
    calibration: input.calibration,
    details: input.details,
  };
}
