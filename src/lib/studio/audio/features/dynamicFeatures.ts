import { mixdownToMono } from '../audioDecode';
import type { StudioAudioFeature, StudioDecodedAudio } from '../audioTypes';
import { amplitudeToDbfs, feature, rms } from './basicFeatures';

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

function windowRmsValues(samples: Float32Array, sampleRate: number) {
  const size = Math.max(256, Math.floor(sampleRate * 0.05));
  const values: number[] = [];
  for (let offset = 0; offset < samples.length; offset += size) {
    values.push(rms(samples.subarray(offset, Math.min(samples.length, offset + size))));
  }
  return values;
}

function globalSamplePeak(decoded: StudioDecodedAudio) {
  let value = 0;
  for (const channel of decoded.channelData) {
    for (const sample of channel) value = Math.max(value, Math.abs(sample));
  }
  return value;
}

function globalClippingSamples(decoded: StudioDecodedAudio) {
  let count = 0;
  let samples = 0;
  for (const channel of decoded.channelData) {
    samples += channel.length;
    for (const sample of channel) {
      if (Math.abs(sample) >= 0.999) count += 1;
    }
  }
  return { count, ratio: samples ? count / samples : 0 };
}

export function extractDynamicFeatures(decoded: StudioDecodedAudio): StudioAudioFeature[] {
  const mono = mixdownToMono(decoded);
  const rmsValue = rms(mono);
  const peakValue = globalSamplePeak(decoded);
  const windows = windowRmsValues(mono, decoded.sampleRate);
  const quiet = percentile(windows, 0.1);
  const loud = percentile(windows, 0.95);
  const dynamicRangeDb = amplitudeToDbfs(loud) - amplitudeToDbfs(quiet);
  const clipping = globalClippingSamples(decoded);
  const clippingSamples = clipping.count;
  const clippingRisk = clipping.ratio;
  const crestFactorDb = amplitudeToDbfs(peakValue) - amplitudeToDbfs(rmsValue);
  const headroomDb = Math.abs(amplitudeToDbfs(peakValue));

  return [
    feature('rms_dbfs', 'RMS', amplitudeToDbfs(rmsValue), 'dBFS', 'RMS level measured from decoded mono mixdown and expressed as dBFS.'),
    feature('peak_dbfs', 'Sample Peak', amplitudeToDbfs(peakValue), 'dBFS', 'Sample peak measured from decoded mono mixdown. This is not true peak.', 0.9, ['NOT_TRUE_PEAK']),
    feature('clipping_risk', 'Clipping Risk', clippingRisk, null, 'Ratio of decoded samples at or above 0.999 absolute amplitude.', 0.86),
    feature('clipping_sample_count', 'Clipping Samples', clippingSamples, 'samples', 'Count of decoded mono samples at or above 0.999 absolute amplitude.', 0.86),
    feature('dynamic_range_db', 'Dynamic Range', dynamicRangeDb, 'dB', 'Difference between 95th and 10th percentile short-window RMS levels.', 0.74),
    feature('crest_factor_db', 'Crest Factor', crestFactorDb, 'dB', 'Difference between sample peak dBFS and RMS dBFS.', 0.82),
    feature('headroom_db', 'Headroom', headroomDb, 'dB', 'Distance between decoded sample peak and 0 dBFS. This is sample-peak headroom.', 0.82, ['SAMPLE_PEAK_HEADROOM']),
    feature('peak_amplitude', 'Peak Amplitude', peakValue, null, 'Absolute sample peak amplitude measured from decoded mono mixdown.', 0.9),
  ];
}
