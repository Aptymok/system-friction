export type SfiDecodedPcm24 = {
  sampleRate: 48000;
  bitDepth: 24;
  channels: 1 | 2;
  frames: number;
  samples: Float64Array[];
};

function readAscii(buffer: Buffer, offset: number, length: number) {
  return buffer.toString('ascii', offset, offset + length);
}

function readInt24LE(buffer: Buffer, offset: number) {
  const value = buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
  return value & 0x800000 ? value | ~0xffffff : value;
}

function writeInt24LE(buffer: Buffer, offset: number, value: number) {
  const clamped = Math.max(-8388608, Math.min(8388607, value));
  const encoded = clamped < 0 ? clamped + 0x1000000 : clamped;
  buffer[offset] = encoded & 0xff;
  buffer[offset + 1] = (encoded >> 8) & 0xff;
  buffer[offset + 2] = (encoded >> 16) & 0xff;
}

export function decodePcm24Wav(buffer: Buffer): SfiDecodedPcm24 {
  if (buffer.byteLength < 44 || readAscii(buffer, 0, 4) !== 'RIFF' || readAscii(buffer, 8, 4) !== 'WAVE') {
    throw new Error('SFI_AUDIO_WAV_CONTAINER_INVALID');
  }

  let fmtOffset = -1;
  let fmtSize = 0;
  let dataOffset = -1;
  let dataSize = 0;
  let cursor = 12;
  while (cursor + 8 <= buffer.byteLength) {
    const id = readAscii(buffer, cursor, 4);
    const size = buffer.readUInt32LE(cursor + 4);
    const bodyOffset = cursor + 8;
    if (bodyOffset + size > buffer.byteLength) throw new Error('SFI_AUDIO_WAV_CHUNK_TRUNCATED');
    if (id === 'fmt ') {
      fmtOffset = bodyOffset;
      fmtSize = size;
    } else if (id === 'data') {
      dataOffset = bodyOffset;
      dataSize = size;
    }
    cursor = bodyOffset + size + (size % 2);
  }

  if (fmtOffset < 0 || dataOffset < 0 || fmtSize < 16) throw new Error('SFI_AUDIO_WAV_REQUIRED_CHUNK_MISSING');
  const audioFormat = buffer.readUInt16LE(fmtOffset);
  const channels = buffer.readUInt16LE(fmtOffset + 2);
  const sampleRate = buffer.readUInt32LE(fmtOffset + 4);
  const blockAlign = buffer.readUInt16LE(fmtOffset + 12);
  const bitDepth = buffer.readUInt16LE(fmtOffset + 14);

  if (audioFormat !== 1) throw new Error('SFI_AUDIO_WAV_PCM_REQUIRED');
  if (sampleRate !== 48000 || bitDepth !== 24) throw new Error('SFI_AUDIO_WAV_48K_24BIT_REQUIRED');
  if (channels !== 1 && channels !== 2) throw new Error('SFI_AUDIO_WAV_CHANNELS_UNSUPPORTED');
  const expectedBlockAlign = channels * 3;
  if (blockAlign !== expectedBlockAlign || dataSize % blockAlign !== 0) throw new Error('SFI_AUDIO_WAV_BLOCK_ALIGN_INVALID');

  const frames = dataSize / blockAlign;
  const samples = Array.from({ length: channels }, () => new Float64Array(frames));
  for (let frame = 0; frame < frames; frame += 1) {
    const frameOffset = dataOffset + frame * blockAlign;
    for (let channel = 0; channel < channels; channel += 1) {
      samples[channel][frame] = readInt24LE(buffer, frameOffset + channel * 3) / 8388608;
    }
  }

  return {
    sampleRate: 48000,
    bitDepth: 24,
    channels: channels as 1 | 2,
    frames,
    samples,
  };
}

export function encodePcm24Wav(samples: Float64Array[], sampleRate: 48000 = 48000): Buffer {
  if (samples.length !== 1 && samples.length !== 2) throw new Error('SFI_AUDIO_WAV_CHANNELS_UNSUPPORTED');
  const channels = samples.length as 1 | 2;
  const frames = samples[0]?.length ?? 0;
  if (frames < 1 || samples.some((channel) => channel.length !== frames)) throw new Error('SFI_AUDIO_WAV_FRAME_SHAPE_INVALID');

  const blockAlign = channels * 3;
  const dataSize = frames * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * blockAlign, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(24, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);

  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const normalized = Math.max(-1, Math.min(1 - 1 / 8388608, samples[channel][frame]));
      const integer = normalized < 0 ? Math.round(normalized * 8388608) : Math.round(normalized * 8388607);
      writeInt24LE(buffer, 44 + frame * blockAlign + channel * 3, integer);
    }
  }
  return buffer;
}

export function pcmMetrics(samples: Float64Array[]) {
  let peak = 0;
  let squareSum = 0;
  let count = 0;
  for (const channel of samples) {
    for (const sample of channel) {
      const abs = Math.abs(sample);
      if (abs > peak) peak = abs;
      squareSum += sample * sample;
      count += 1;
    }
  }
  return {
    peak: Number(peak.toFixed(9)),
    rms: Number(Math.sqrt(squareSum / Math.max(1, count)).toFixed(9)),
  };
}
