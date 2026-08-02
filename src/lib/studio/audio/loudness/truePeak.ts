import type { StudioDecodedAudio } from '../audioTypes';
import {
  buildMetric,
  calibrateLoudnessMetric,
  makeProvenance,
  roundMetric,
  type LoudnessAnalysisOptions,
} from './types';

const OVERSAMPLE_FACTOR = 4;
const SINC_RADIUS = 16;

function amplitudeToDb(value: number) {
  if (!Number.isFinite(value) || value <= 0) return -120;
  return Math.max(-120, 20 * Math.log10(value));
}

function sinc(value: number) {
  if (Math.abs(value) < 1e-12) return 1;
  const angle = Math.PI * value;
  return Math.sin(angle) / angle;
}

function blackmanWindow(offset: number, radius: number) {
  const x = Math.abs(offset) / radius;
  if (x >= 1) return 0;
  return 0.42 + 0.5 * Math.cos(Math.PI * x) + 0.08 * Math.cos(2 * Math.PI * x);
}

function reconstructAt(samples: Float32Array, position: number) {
  const center = Math.floor(position);
  let value = 0;
  let weightTotal = 0;
  for (let index = center - SINC_RADIUS + 1; index <= center + SINC_RADIUS; index += 1) {
    if (index < 0 || index >= samples.length) continue;
    const distance = position - index;
    const weight = sinc(distance) * blackmanWindow(distance, SINC_RADIUS);
    value += (samples[index] ?? 0) * weight;
    weightTotal += weight;
  }
  return weightTotal === 0 ? 0 : value / weightTotal;
}

export function samplePeakAmplitude(decoded: StudioDecodedAudio) {
  let peak = 0;
  for (const channel of decoded.channelData) {
    for (const sample of channel) peak = Math.max(peak, Math.abs(sample));
  }
  return peak;
}

export function calculateTruePeak(decoded: StudioDecodedAudio, options: LoudnessAnalysisOptions = {}) {
  const provenance = makeProvenance(decoded, options);
  const limitations: string[] = [];

  if (!decoded.frameCount || !decoded.channelData.length || decoded.sampleRate <= 0) {
    const calibration = calibrateLoudnessMetric({
      metricId: 'true_peak_dbtp',
      measuredValue: null,
      unit: 'dBTP',
      standard: provenance.standard,
      implementationVersion: provenance.implementationVersion,
      referenceExpectation: options.referenceExpectations?.true_peak_dbtp?.value ?? null,
      tolerance: options.referenceExpectations?.true_peak_dbtp?.tolerance ?? null,
      inputProperties: { sampleRate: decoded.sampleRate, channels: decoded.channels, durationSeconds: decoded.durationSeconds },
      trace: provenance.trace,
    });
    return {
      truePeak: buildMetric<number>({
        metricId: 'true_peak_dbtp',
        value: null,
        unit: 'dBTP',
        status: 'INSUFFICIENT_SIGNAL',
        confidence: 0,
        method: `${OVERSAMPLE_FACTOR}x windowed-sinc inter-sample peak reconstruction`,
        window: null,
        gating: null,
        limitations: ['DECODED_AUDIO_REQUIRED'],
        provenance,
        calibration,
      }),
      samplePeak: buildMetric<number>({
        metricId: 'sample_peak_dbfs',
        value: null,
        unit: 'dBFS',
        status: 'INSUFFICIENT_SIGNAL',
        confidence: 0,
        method: 'maximum absolute decoded sample across channels',
        window: null,
        gating: null,
        limitations: ['DECODED_AUDIO_REQUIRED'],
        provenance,
        calibration,
      }),
      headroom: buildMetric<number>({
        metricId: 'true_peak_headroom_db',
        value: null,
        unit: 'dB',
        status: 'INSUFFICIENT_SIGNAL',
        confidence: 0,
        method: '0 dBTP minus measured true peak',
        window: null,
        gating: null,
        limitations: ['DECODED_AUDIO_REQUIRED'],
        provenance,
        calibration,
      }),
    };
  }

  const samplePeak = samplePeakAmplitude(decoded);
  let truePeak = samplePeak;
  let truePeakPosition = 0;
  let truePeakChannel = 0;
  let samplePeakPosition = 0;
  let samplePeakChannel = 0;

  decoded.channelData.forEach((channel, channelIndex) => {
    if (!channel.length) {
      limitations.push('EMPTY_CHANNEL_SKIPPED');
      return;
    }
    for (let frame = 0; frame < channel.length; frame += 1) {
      if (Math.abs(channel[frame]) >= samplePeak) {
        samplePeakPosition = frame;
        samplePeakChannel = channelIndex;
      }
    }
    for (let frame = 0; frame < channel.length - 1; frame += 1) {
      for (let phase = 1; phase < OVERSAMPLE_FACTOR; phase += 1) {
        const reconstructed = reconstructAt(channel, frame + phase / OVERSAMPLE_FACTOR);
        const magnitude = Math.abs(reconstructed);
        if (magnitude >= truePeak) {
          truePeak = magnitude;
          truePeakPosition = frame + phase / OVERSAMPLE_FACTOR;
          truePeakChannel = channelIndex;
        }
      }
    }
  });

  const samplePeakDbfs = roundMetric(amplitudeToDb(samplePeak), 3);
  const truePeakDbtp = roundMetric(amplitudeToDb(truePeak), 3);
  const headroomDb = truePeakDbtp === null ? null : roundMetric(0 - truePeakDbtp, 3);
  if (truePeak > 1) limitations.push('INTER_SAMPLE_PEAK_EXCEEDS_FULL_SCALE');
  if (samplePeak >= 0.999) limitations.push('DIGITAL_SAMPLE_CLIP_DETECTED');

  const truePeakCalibration = calibrateLoudnessMetric({
    metricId: 'true_peak_dbtp',
    measuredValue: truePeakDbtp,
    unit: 'dBTP',
    standard: provenance.standard,
    implementationVersion: provenance.implementationVersion,
    referenceExpectation: options.referenceExpectations?.true_peak_dbtp?.value ?? null,
    tolerance: options.referenceExpectations?.true_peak_dbtp?.tolerance ?? null,
    inputProperties: { sampleRate: decoded.sampleRate, channels: decoded.channels, durationSeconds: decoded.durationSeconds },
    trace: provenance.trace,
  });

  const samplePeakCalibration = calibrateLoudnessMetric({
    metricId: 'sample_peak_dbfs',
    measuredValue: samplePeakDbfs,
    unit: 'dBFS',
    standard: provenance.standard,
    implementationVersion: provenance.implementationVersion,
    referenceExpectation: options.referenceExpectations?.sample_peak_dbfs?.value ?? null,
    tolerance: options.referenceExpectations?.sample_peak_dbfs?.tolerance ?? null,
    inputProperties: { sampleRate: decoded.sampleRate, channels: decoded.channels, durationSeconds: decoded.durationSeconds },
    trace: provenance.trace,
  });

  const headroomCalibration = calibrateLoudnessMetric({
    metricId: 'true_peak_headroom_db',
    measuredValue: headroomDb,
    unit: 'dB',
    standard: provenance.standard,
    implementationVersion: provenance.implementationVersion,
    referenceExpectation: options.referenceExpectations?.true_peak_headroom_db?.value ?? null,
    tolerance: options.referenceExpectations?.true_peak_headroom_db?.tolerance ?? null,
    inputProperties: { sampleRate: decoded.sampleRate, channels: decoded.channels, durationSeconds: decoded.durationSeconds },
    trace: provenance.trace,
  });

  return {
    truePeak: buildMetric<number>({
      metricId: 'true_peak_dbtp',
      value: truePeakDbtp,
      unit: 'dBTP',
      status: truePeakCalibration.approved ? 'CALIBRATED' : 'OBSERVED',
      confidence: truePeakCalibration.approved ? truePeakCalibration.confidence : 0.84,
      method: `${OVERSAMPLE_FACTOR}x windowed-sinc inter-sample peak reconstruction`,
      window: null,
      gating: null,
      limitations,
      provenance,
      calibration: truePeakCalibration,
      details: {
        peakLocation: {
          channel: truePeakChannel,
          framePosition: roundMetric(truePeakPosition, 3),
          timestampSeconds: roundMetric(truePeakPosition / decoded.sampleRate, 6),
          oversampleFactor: OVERSAMPLE_FACTOR,
        },
      },
    }),
    samplePeak: buildMetric<number>({
      metricId: 'sample_peak_dbfs',
      value: samplePeakDbfs,
      unit: 'dBFS',
      status: samplePeakCalibration.approved ? 'CALIBRATED' : 'OBSERVED',
      confidence: samplePeakCalibration.approved ? samplePeakCalibration.confidence : 0.94,
      method: 'maximum absolute decoded sample across channels',
      window: null,
      gating: null,
      limitations: samplePeak >= 0.999 ? ['DIGITAL_SAMPLE_CLIP_DETECTED'] : [],
      provenance,
      calibration: samplePeakCalibration,
      details: {
        peakLocation: {
          channel: samplePeakChannel,
          framePosition: samplePeakPosition,
          timestampSeconds: roundMetric(samplePeakPosition / decoded.sampleRate, 6),
        },
      },
    }),
    headroom: buildMetric<number>({
      metricId: 'true_peak_headroom_db',
      value: headroomDb,
      unit: 'dB',
      status: headroomCalibration.approved ? 'CALIBRATED' : 'OBSERVED',
      confidence: headroomCalibration.approved ? headroomCalibration.confidence : 0.84,
      method: '0 dBTP minus measured true peak',
      window: null,
      gating: null,
      limitations: headroomDb !== null && headroomDb < 0 ? ['TRUE_PEAK_HEADROOM_NEGATIVE'] : [],
      provenance,
      calibration: headroomCalibration,
    }),
  };
}
