import type { StudioDecodedAudio } from '../audioTypes';
import type { PreparedKWeightedAudio } from './types';

type Biquad = {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
};

function normalize(b0: number, b1: number, b2: number, a0: number, a1: number, a2: number): Biquad {
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

function highShelf(sampleRate: number, frequency: number, gainDb: number, q: number): Biquad {
  const a = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * frequency) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  const sqrtA = Math.sqrt(a);

  return normalize(
    a * ((a + 1) + (a - 1) * cos + 2 * sqrtA * alpha),
    -2 * a * ((a - 1) + (a + 1) * cos),
    a * ((a + 1) + (a - 1) * cos - 2 * sqrtA * alpha),
    (a + 1) - (a - 1) * cos + 2 * sqrtA * alpha,
    2 * ((a - 1) - (a + 1) * cos),
    (a + 1) - (a - 1) * cos - 2 * sqrtA * alpha,
  );
}

function highPass(sampleRate: number, frequency: number, q: number): Biquad {
  const w0 = (2 * Math.PI * frequency) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  return normalize(
    (1 + cos) / 2,
    -(1 + cos),
    (1 + cos) / 2,
    1 + alpha,
    -2 * cos,
    1 - alpha,
  );
}

function applyBiquad(samples: Float32Array, biquad: Biquad): Float32Array {
  const output = new Float32Array(samples.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const x0 = samples[index] ?? 0;
    const y0 = biquad.b0 * x0 + biquad.b1 * x1 + biquad.b2 * x2 - biquad.a1 * y1 - biquad.a2 * y2;
    output[index] = Number.isFinite(y0) ? y0 : 0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = output[index];
  }

  return output;
}

export function applyKWeighting(samples: Float32Array, sampleRate: number): Float32Array {
  const shelf = highShelf(sampleRate, 1681.974450955533, 4, 1 / Math.SQRT2);
  const rlb = highPass(sampleRate, 38.13547087613982, 0.5);
  return applyBiquad(applyBiquad(samples, shelf), rlb);
}

export function prepareKWeightedAudio(decoded: StudioDecodedAudio): PreparedKWeightedAudio {
  const limitations: string[] = [];
  if (!Number.isFinite(decoded.sampleRate) || decoded.sampleRate <= 0) {
    return { decoded, channels: [], limitations: ['INVALID_SAMPLE_RATE'] };
  }
  if (!decoded.channels || decoded.channelData.length !== decoded.channels) {
    return { decoded, channels: [], limitations: ['INVALID_CHANNEL_COUNT'] };
  }

  const channels = decoded.channelData.map((channel, index) => {
    if (!channel.length) limitations.push(`EMPTY_CHANNEL_${index}`);
    return applyKWeighting(channel, decoded.sampleRate);
  });

  return { decoded, channels, limitations };
}
