import { StudioAudioError } from './audioErrors';
import type { StudioAudioProbe } from './audioTypes';

type Chunk = {
  id: string;
  offset: number;
  size: number;
  dataOffset: number;
};

function readAscii(bytes: Buffer, offset: number, length: number) {
  return bytes.toString('ascii', offset, offset + length);
}

function collectChunks(bytes: Buffer) {
  const chunks: Chunk[] = [];
  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const id = readAscii(bytes, offset, 4);
    const size = bytes.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    if (dataOffset + size > bytes.byteLength) break;
    chunks.push({ id, offset, size, dataOffset });
    offset = dataOffset + size + (size % 2);
  }
  return chunks;
}

function codecName(formatCode: number, bitsPerSample: number) {
  if (formatCode === 1) return `pcm_s${bitsPerSample}le`;
  if (formatCode === 3) return `float${bitsPerSample}`;
  return `wav_format_${formatCode}`;
}

export function probeStudioAudio(bytes: Buffer): StudioAudioProbe {
  if (bytes.byteLength < 44 || readAscii(bytes, 0, 4) !== 'RIFF' || readAscii(bytes, 8, 4) !== 'WAVE') {
    throw new StudioAudioError('INVALID_AUDIO_CONTAINER', 'Studio audio engine currently accepts RIFF/WAVE containers only.', 415, {
      detectedHeader: bytes.subarray(0, Math.min(bytes.byteLength, 16)).toString('hex'),
    });
  }

  const chunks = collectChunks(bytes);
  const fmt = chunks.find((chunk) => chunk.id === 'fmt ');
  const data = chunks.find((chunk) => chunk.id === 'data');
  if (!fmt || fmt.size < 16 || !data) {
    throw new StudioAudioError('INVALID_AUDIO_CONTAINER', 'WAV file is missing required fmt or data chunk.', 415, {
      chunks: chunks.map((chunk) => chunk.id),
    });
  }

  const formatCode = bytes.readUInt16LE(fmt.dataOffset);
  const channels = bytes.readUInt16LE(fmt.dataOffset + 2);
  const sampleRate = bytes.readUInt32LE(fmt.dataOffset + 4);
  const byteRate = bytes.readUInt32LE(fmt.dataOffset + 8);
  const blockAlign = bytes.readUInt16LE(fmt.dataOffset + 12);
  const bitsPerSample = bytes.readUInt16LE(fmt.dataOffset + 14);
  const codec = codecName(formatCode, bitsPerSample);

  if (![1, 3].includes(formatCode) || ![8, 16, 24, 32, 64].includes(bitsPerSample)) {
    throw new StudioAudioError('UNSUPPORTED_CODEC', 'WAV codec is not supported by the Node Studio audio decoder.', 415, {
      formatCode,
      bitsPerSample,
      codec,
    });
  }
  if (!channels || !sampleRate || !blockAlign || data.size < blockAlign) {
    throw new StudioAudioError('INVALID_AUDIO_CONTAINER', 'WAV metadata is incomplete or inconsistent.', 415, {
      channels,
      sampleRate,
      blockAlign,
      dataLength: data.size,
    });
  }

  const frameCount = Math.floor(data.size / blockAlign);
  return {
    container: 'wav',
    codec,
    sampleRate,
    channels,
    bitsPerSample,
    byteRate,
    blockAlign,
    durationSeconds: frameCount / sampleRate,
    dataOffset: data.dataOffset,
    dataLength: data.size,
  };
}
