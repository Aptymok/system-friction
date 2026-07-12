import { mixdownToMono } from '../audioDecode';
import type { StudioDecodedAudio, WaveformPeak } from '../audioTypes';
import { peak, rms } from '../features/basicFeatures';

export function buildWaveformPeaks(decoded: StudioDecodedAudio, pointCount = 4096): WaveformPeak[] {
  const mono = mixdownToMono(decoded);
  if (!mono.length) return [];
  const count = Math.min(pointCount, mono.length);
  const samplesPerPoint = Math.max(1, Math.floor(mono.length / count));
  const peaks: WaveformPeak[] = [];

  for (let index = 0; index < count; index += 1) {
    const start = index * samplesPerPoint;
    const end = index === count - 1 ? mono.length : Math.min(mono.length, start + samplesPerPoint);
    const frame = mono.subarray(start, end);
    let min = 1;
    let max = -1;
    for (const sample of frame) {
      if (sample < min) min = sample;
      if (sample > max) max = sample;
    }
    peaks.push({
      index,
      startSeconds: start / decoded.sampleRate,
      endSeconds: end / decoded.sampleRate,
      min,
      max,
      rms: rms(frame),
    });
  }

  return peaks;
}

export function waveformPeakAmplitudes(peaks: WaveformPeak[]) {
  return peaks.map((item) => peak(new Float32Array([item.min, item.max])));
}
