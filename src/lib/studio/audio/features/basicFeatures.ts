import { mixdownToMono } from '../audioDecode';
import {
  STUDIO_AUDIO_DBFS_FLOOR,
  STUDIO_AUDIO_ENGINE_NAME,
  STUDIO_AUDIO_ENGINE_VERSION,
  type StudioAudioFeature,
  type StudioDecodedAudio,
} from '../audioTypes';

export function amplitudeToDbfs(value: number) {
  const magnitude = Math.max(0, Math.abs(value));
  if (magnitude <= 0) return STUDIO_AUDIO_DBFS_FLOOR;
  return Math.max(STUDIO_AUDIO_DBFS_FLOOR, 20 * Math.log10(Math.min(1, magnitude)));
}

export function rms(samples: Float32Array) {
  if (!samples.length) return 0;
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / samples.length);
}

export function peak(samples: Float32Array) {
  let value = 0;
  for (const sample of samples) value = Math.max(value, Math.abs(sample));
  return value;
}

export function zeroCrossingRate(samples: Float32Array) {
  if (samples.length < 2) return 0;
  let crossings = 0;
  for (let index = 1; index < samples.length; index += 1) {
    if ((samples[index - 1] < 0 && samples[index] >= 0) || (samples[index - 1] >= 0 && samples[index] < 0)) crossings += 1;
  }
  return crossings / (samples.length - 1);
}

export function feature(
  key: string,
  label: string,
  value: number | string | null,
  unit: string | null,
  explanation: string,
  confidence = 0.88,
  warnings: string[] = []
): StudioAudioFeature {
  return {
    key,
    label,
    value,
    unit,
    status: value === null ? 'MISSING' : 'OBSERVED',
    source: STUDIO_AUDIO_ENGINE_NAME,
    confidence: value === null ? 0 : confidence,
    formulaVersion: STUDIO_AUDIO_ENGINE_VERSION,
    explanation,
    warnings,
  };
}

export function missingFeature(key: string, label: string, explanation: string, warnings: string[]) {
  return feature(key, label, null, null, explanation, 0, warnings);
}

export function extractBasicFeatures(decoded: StudioDecodedAudio): StudioAudioFeature[] {
  const mono = mixdownToMono(decoded);
  return [
    feature('duration_seconds', 'Duration', decoded.durationSeconds, 's', 'Duration derived from decoded frame count and WAV sample rate.'),
    feature('sample_rate_hz', 'Sample Rate', decoded.sampleRate, 'Hz', 'Sample rate observed from WAV fmt chunk.'),
    feature('channel_count', 'Channels', decoded.channels, null, 'Channel count observed from WAV fmt chunk.'),
    feature('bit_depth', 'Bit Depth', decoded.bitsPerSample, 'bit', 'Bit depth observed from WAV fmt chunk.'),
    feature('zero_crossing_rate', 'Zero Crossing Rate', zeroCrossingRate(mono), null, 'Zero crossings measured over decoded mono mixdown.'),
  ];
}
