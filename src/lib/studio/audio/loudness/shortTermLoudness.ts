import type { StudioDecodedAudio } from '../audioTypes';
import { channelWeightingLimitations } from './channelWeighting';
import { computeLoudnessWindows } from './loudnessWindows';
import {
  buildMetric,
  calibrateLoudnessMetric,
  makeProvenance,
  roundMetric,
  type LoudnessAnalysisOptions,
} from './types';

export function summarizeShortTerm(values: number[]) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    min: roundMetric(min),
    max: roundMetric(max),
    average: roundMetric(average),
    count: values.length,
  };
}

export function calculateShortTermLoudness(decoded: StudioDecodedAudio, options: LoudnessAnalysisOptions = {}) {
  const provenance = makeProvenance(decoded, options);
  const limitations = [...channelWeightingLimitations(decoded.channels)];
  const computed = computeLoudnessWindows(decoded, { windowSeconds: 3, stepSeconds: 1 });
  limitations.push(...computed.limitations);
  const summary = summarizeShortTerm(computed.windows.map((window) => window.loudnessLufs));
  const value = summary ? `${summary.min}..${summary.max}` : null;
  const calibration = calibrateLoudnessMetric({
    metricId: 'short_term_lufs_summary',
    measuredValue: summary?.average ?? null,
    unit: 'LUFS',
    standard: provenance.standard,
    implementationVersion: provenance.implementationVersion,
    referenceExpectation: options.referenceExpectations?.short_term_lufs_average?.value ?? null,
    tolerance: options.referenceExpectations?.short_term_lufs_average?.tolerance ?? null,
    inputProperties: { sampleRate: decoded.sampleRate, channels: decoded.channels, durationSeconds: decoded.durationSeconds },
    trace: provenance.trace,
  });

  return {
    result: buildMetric<string>({
      metricId: 'short_term_lufs_summary',
      value,
      unit: 'LUFS',
      status: value === null ? 'INSUFFICIENT_SIGNAL' : calibration.approved ? 'CALIBRATED' : 'OBSERVED',
      confidence: value === null ? 0 : calibration.approved ? calibration.confidence : 0.84,
      method: 'K-weighted short-term loudness windows',
      window: '3 s / 1 s step',
      gating: 'ungated short-term windows',
      limitations,
      provenance,
      calibration,
    }),
    summary,
    windows: computed.windows,
  };
}
