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

function summarize(values: number[]) {
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

export function calculateMomentaryLoudness(decoded: StudioDecodedAudio, options: LoudnessAnalysisOptions = {}) {
  const provenance = makeProvenance(decoded, options);
  const limitations = [...channelWeightingLimitations(decoded.channels)];
  const computed = computeLoudnessWindows(decoded, { windowSeconds: 0.4, stepSeconds: 0.1 });
  limitations.push(...computed.limitations);
  const summary = summarize(computed.windows.map((window) => window.loudnessLufs));
  const value = summary ? `${summary.min}..${summary.max}` : null;
  const calibration = calibrateLoudnessMetric({
    metricId: 'momentary_lufs_summary',
    measuredValue: summary?.average ?? null,
    unit: 'LUFS',
    standard: provenance.standard,
    implementationVersion: provenance.implementationVersion,
    referenceExpectation: options.referenceExpectations?.momentary_lufs_average?.value ?? null,
    tolerance: options.referenceExpectations?.momentary_lufs_average?.tolerance ?? null,
    inputProperties: { sampleRate: decoded.sampleRate, channels: decoded.channels, durationSeconds: decoded.durationSeconds },
    trace: provenance.trace,
  });

  return {
    result: buildMetric<string>({
      metricId: 'momentary_lufs_summary',
      value,
      unit: 'LUFS',
      status: value === null ? 'INSUFFICIENT_SIGNAL' : calibration.approved ? 'CALIBRATED' : 'OBSERVED',
      confidence: value === null ? 0 : calibration.approved ? calibration.confidence : 0.86,
      method: 'K-weighted momentary loudness windows',
      window: '400 ms / 100 ms step',
      gating: 'ungated momentary windows',
      limitations,
      provenance,
      calibration,
    }),
    summary,
    windows: computed.windows,
  };
}
