/**
 * Browser-only export of a technically gain-adjusted PCM WAV.
 * Does not equal mastering: no equalization, compression, limiting or true-peak validation.
 * All samples remain in browser memory. No upload, persistence or external API.
 */
function writeString(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}
export function exportPcm24Wav(channels: Float32Array[], sampleRate: number, gainDb: number): Blob {
  if (channels.length < 1 || channels.length > 2 || !Number.isFinite(sampleRate) || sampleRate <= 0 ||
      !channels.length || channels.some(channel => channel.length !== channels[0].length) ||
      !Number.isFinite(gainDb) || gainDb < -60 || gainDb > 24) {
    throw new Error('INVALID_WAV_EXPORT_PARAMETERS');
  }
  const frames = channels[0].length;
  const bytesPerSample = 3;
  const dataLength = frames * channels.length * bytesPerSample;
  if (dataLength > 400 * 1024 * 1024) throw new Error('DERIVED_WAV_EXCEEDS_LOCAL_EXPORT_LIMIT');
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels.length * bytesPerSample, true);
  view.setUint16(32, channels.length * bytesPerSample, true);
  view.setUint16(34, 24, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  const gain = Math.pow(10, gainDb / 20);
  let index = 44;
  for (let frame = 0; frame < frames; frame++) {
    for (let channel = 0; channel < channels.length; channel++) {
      const sample = channels[channel][frame] * gain;
      if (!Number.isFinite(sample) || sample > 1 || sample < -1) {
        throw new Error('WAV_EXPORT_WOULD_CLIP_SAMPLES');
      }
      const signed = Math.min(8388607, Math.max(-8388608, Math.round(sample * 8388607)));
      view.setUint8(index++, signed & 255);
      view.setUint8(index++, (signed >> 8) & 255);
      view.setUint8(index++, (signed >> 16) & 255);
    }
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Exact measurement of decoded samples for safe sample-peak gain. */
export function samplePeak(channels: Float32Array[]): number {
  let peak = 0;
  for (const channel of channels) for (const sample of channel) {
    const magnitude = Math.abs(sample);
    if (magnitude > peak) peak = magnitude;
  }
  return peak;
}
