import { StudioAudioError } from './audioErrors';
import { probeStudioAudio } from './audioProbe';
import type { StudioDecodedAudio } from './audioTypes';

function clampSample(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

function readPcm(bytes: Buffer, offset: number, bitsPerSample: number) {
  if (bitsPerSample === 8) return (bytes.readUInt8(offset) - 128) / 128;
  if (bitsPerSample === 16) return bytes.readInt16LE(offset) / 32768;
  if (bitsPerSample === 24) return bytes.readIntLE(offset, 3) / 8388608;
  if (bitsPerSample === 32) return bytes.readInt32LE(offset) / 2147483648;
  throw new StudioAudioError('UNSUPPORTED_CODEC', 'Unsupported PCM bit depth.', 415, { bitsPerSample });
}

function readFloat(bytes: Buffer, offset: number, bitsPerSample: number) {
  if (bitsPerSample === 32) return bytes.readFloatLE(offset);
  if (bitsPerSample === 64) return bytes.readDoubleLE(offset);
  throw new StudioAudioError('UNSUPPORTED_CODEC', 'Unsupported float WAV bit depth.', 415, { bitsPerSample });
}

export function decodeStudioAudio(bytes: Buffer, maxDurationSeconds?: number): StudioDecodedAudio {
  const probe = probeStudioAudio(bytes);
  if (maxDurationSeconds && probe.durationSeconds > maxDurationSeconds) {
    throw new StudioAudioError('DURATION_TOO_LONG', 'Audio duration exceeds synchronous Studio audio engine limit.', 413, {
      durationSeconds: probe.durationSeconds,
      maxDurationSeconds,
    });
  }

  const formatIsFloat = probe.codec.startsWith('float');
  const bytesPerSample = probe.bitsPerSample / 8;
  const frameCount = Math.floor(probe.dataLength / probe.blockAlign);
  const channelData = Array.from({ length: probe.channels }, () => new Float32Array(frameCount));

  try {
    for (let frame = 0; frame < frameCount; frame += 1) {
      const frameOffset = probe.dataOffset + frame * probe.blockAlign;
      for (let channel = 0; channel < probe.channels; channel += 1) {
        const sampleOffset = frameOffset + channel * bytesPerSample;
        const sample = formatIsFloat
          ? readFloat(bytes, sampleOffset, probe.bitsPerSample)
          : readPcm(bytes, sampleOffset, probe.bitsPerSample);
        channelData[channel][frame] = clampSample(sample);
      }
    }
  } catch (error) {
    if (error instanceof StudioAudioError) throw error;
    throw new StudioAudioError('DECODE_FAILED', error instanceof Error ? error.message : 'WAV decode failed.', 422, {
      codec: probe.codec,
      bitsPerSample: probe.bitsPerSample,
    });
  }

  return {
    ...probe,
    channelData,
    frameCount,
    durationSeconds: frameCount / probe.sampleRate,
  };
}

export function mixdownToMono(decoded: StudioDecodedAudio) {
  const mono = new Float32Array(decoded.frameCount);
  for (let frame = 0; frame < decoded.frameCount; frame += 1) {
    let sum = 0;
    for (let channel = 0; channel < decoded.channels; channel += 1) {
      sum += decoded.channelData[channel][frame] ?? 0;
    }
    mono[frame] = sum / decoded.channels;
  }
  return mono;
}
