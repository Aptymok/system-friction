import type { StudioDecodedAudio } from '../audioTypes';
import { applyAbsoluteGate, BS1770_ABSOLUTE_GATE_LUFS } from './absoluteGate';
import { channelWeightingLimitations } from './channelWeighting';
import { computeLoudnessWindows } from './loudnessWindows';
import { applyRelativeGate, averageMeanSquare, BS1770_RELATIVE_GATE_LU } from './relativeGate';
import {
  buildMetric,
  calibrateLoudnessMetric,
  loudnessFromMeanSquare,
  makeProvenance,
  roundMetric,
  type LoudnessAnalysisOptions,
  type LoudnessWindow,
} from './types';

export function calculateIntegratedLoudness(decoded: StudioDecodedAudio, options: LoudnessAnalysisOptions = {}) {
  const provenance = makeProvenance(decoded, options);
  const limitations = [...channelWeightingLimitations(decoded.channels)];
  const computed = computeLoudnessWindows(decoded, { windowSeconds: 0.4, stepSeconds: 0.1 });
  limitations.push(...computed.limitations);

  if (computed.windows.length === 0) {
    const calibration = calibrateLoudnessMetric({
      metricId: 'lufs_integrated',
      measuredValue: null,
      unit: 'LUFS',
      standard: provenance.standard,
      implementationVersion: provenance.implementationVersion,
      referenceExpectation: options.referenceExpectations?.lufs_integrated?.value ?? null,
      tolerance: options.referenceExpectations?.lufs_integrated?.tolerance ?? null,
      inputProperties: { sampleRate: decoded.sampleRate, channels: decoded.channels, durationSeconds: decoded.durationSeconds },
      trace: provenance.trace,
    });
    return {
      result: buildMetric<number>({
        metricId: 'lufs_integrated',
        value: null,
        unit: 'LUFS',
        status: 'INSUFFICIENT_SIGNAL',
        confidence: 0,
        method: 'K-weighted 400 ms blocks with 75 percent overlap',
        window: '400 ms / 100 ms step',
        gating: `absolute ${BS1770_ABSOLUTE_GATE_LUFS} LUFS, relative ${BS1770_RELATIVE_GATE_LU} LU`,
        limitations,
        provenance,
        calibration,
      }),
      blocks: [] as LoudnessWindow[],
    };
  }

  const absolute = applyAbsoluteGate(computed.windows);
  if (absolute.length === 0) {
    const value = -120;
    const calibration = calibrateLoudnessMetric({
      metricId: 'lufs_integrated',
      measuredValue: value,
      unit: 'LUFS',
      standard: provenance.standard,
      implementationVersion: provenance.implementationVersion,
      referenceExpectation: options.referenceExpectations?.lufs_integrated?.value ?? null,
      tolerance: options.referenceExpectations?.lufs_integrated?.tolerance ?? null,
      inputProperties: { sampleRate: decoded.sampleRate, channels: decoded.channels, durationSeconds: decoded.durationSeconds },
      trace: provenance.trace,
    });
    return {
      result: buildMetric<number>({
        metricId: 'lufs_integrated',
        value,
        unit: 'LUFS',
        status: calibration.approved ? 'CALIBRATED' : 'OBSERVED',
        confidence: calibration.approved ? calibration.confidence : 0.84,
        method: 'K-weighted 400 ms blocks with 75 percent overlap',
        window: '400 ms / 100 ms step',
        gating: `absolute ${BS1770_ABSOLUTE_GATE_LUFS} LUFS, relative ${BS1770_RELATIVE_GATE_LU} LU`,
        limitations: [...limitations, 'SIGNAL_BELOW_ABSOLUTE_GATE_REPORTED_AT_ENGINE_FLOOR'],
        provenance,
        calibration,
      }),
      blocks: computed.windows,
    };
  }

  const relative = applyRelativeGate(absolute);
  const gated = relative.windows.length ? relative.windows : absolute;
  const value = roundMetric(loudnessFromMeanSquare(averageMeanSquare(gated)), 3);
  const calibration = calibrateLoudnessMetric({
    metricId: 'lufs_integrated',
    measuredValue: value,
    unit: 'LUFS',
    standard: provenance.standard,
    implementationVersion: provenance.implementationVersion,
    referenceExpectation: options.referenceExpectations?.lufs_integrated?.value ?? null,
    tolerance: options.referenceExpectations?.lufs_integrated?.tolerance ?? null,
    inputProperties: { sampleRate: decoded.sampleRate, channels: decoded.channels, durationSeconds: decoded.durationSeconds },
    trace: provenance.trace,
  });

  return {
    result: buildMetric<number>({
      metricId: 'lufs_integrated',
      value,
      unit: 'LUFS',
      status: calibration.approved ? 'CALIBRATED' : 'OBSERVED',
      confidence: calibration.approved ? calibration.confidence : 0.88,
      method: 'K-weighted 400 ms blocks with 75 percent overlap',
      window: '400 ms / 100 ms step',
      gating: `absolute ${BS1770_ABSOLUTE_GATE_LUFS} LUFS, relative threshold ${roundMetric(relative.threshold)} LUFS`,
      limitations,
      provenance,
      calibration,
    }),
    blocks: computed.windows.map((window) => ({ ...window, gated: gated.some((item) => item.index === window.index) })),
  };
}
