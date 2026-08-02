import type { StudioDecodedAudio } from '../audioTypes';
import { applyAbsoluteGate } from './absoluteGate';
import { channelWeightingLimitations } from './channelWeighting';
import { applyRelativeGate } from './relativeGate';
import { calculateShortTermLoudness } from './shortTermLoudness';
import {
  buildMetric,
  calibrateLoudnessMetric,
  makeProvenance,
  roundMetric,
  type LoudnessAnalysisOptions,
} from './types';

function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function calculateLoudnessRange(decoded: StudioDecodedAudio, options: LoudnessAnalysisOptions = {}) {
  const provenance = makeProvenance(decoded, options);
  const shortTerm = calculateShortTermLoudness(decoded, options);
  const limitations = [...channelWeightingLimitations(decoded.channels), ...shortTerm.result.limitations];

  if (shortTerm.windows.length < 2) {
    const calibration = calibrateLoudnessMetric({
      metricId: 'loudness_range_lu',
      measuredValue: null,
      unit: 'LU',
      standard: provenance.standard,
      implementationVersion: provenance.implementationVersion,
      referenceExpectation: options.referenceExpectations?.loudness_range_lu?.value ?? null,
      tolerance: options.referenceExpectations?.loudness_range_lu?.tolerance ?? null,
      inputProperties: { sampleRate: decoded.sampleRate, channels: decoded.channels, durationSeconds: decoded.durationSeconds },
      trace: provenance.trace,
    });
    return buildMetric<number>({
      metricId: 'loudness_range_lu',
      value: null,
      unit: 'LU',
      status: 'INSUFFICIENT_SIGNAL',
      confidence: 0,
      method: 'EBU Tech 3342 loudness range from short-term loudness distribution',
      window: '3 s short-term windows',
      gating: 'absolute -70 LUFS and relative -20 LU against short-term distribution',
      limitations: [...new Set([...limitations, 'LRA_REQUIRES_AT_LEAST_TWO_SHORT_TERM_WINDOWS'])],
      provenance,
      calibration,
    });
  }

  const absolute = applyAbsoluteGate(shortTerm.windows);
  const relative = applyRelativeGate(absolute, -20);
  const gated = relative.windows.length ? relative.windows : absolute;
  const values = gated.map((window) => window.loudnessLufs);
  const p10 = percentile(values, 0.1);
  const p95 = percentile(values, 0.95);
  const value = p10 === null || p95 === null ? null : roundMetric(p95 - p10, 3);
  const calibration = calibrateLoudnessMetric({
    metricId: 'loudness_range_lu',
    measuredValue: value,
    unit: 'LU',
    standard: provenance.standard,
    implementationVersion: provenance.implementationVersion,
    referenceExpectation: options.referenceExpectations?.loudness_range_lu?.value ?? null,
    tolerance: options.referenceExpectations?.loudness_range_lu?.tolerance ?? null,
    inputProperties: { sampleRate: decoded.sampleRate, channels: decoded.channels, durationSeconds: decoded.durationSeconds },
    trace: provenance.trace,
  });

  return buildMetric<number>({
    metricId: 'loudness_range_lu',
    value,
    unit: 'LU',
    status: value === null ? 'INSUFFICIENT_SIGNAL' : calibration.approved ? 'CALIBRATED' : 'OBSERVED',
    confidence: value === null ? 0 : calibration.approved ? calibration.confidence : 0.8,
    method: 'EBU Tech 3342 loudness range from short-term loudness distribution',
    window: '3 s short-term windows',
    gating: `absolute -70 LUFS and relative threshold ${roundMetric(relative.threshold)} LUFS`,
    limitations,
    provenance,
    calibration,
  });
}
