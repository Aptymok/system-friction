import type { StudioDecodedAudio } from '../audioTypes';
import { channelWeights } from './channelWeighting';
import { prepareKWeightedAudio } from './kWeighting';
import { loudnessFromMeanSquare, type LoudnessWindow } from './types';

export type LoudnessWindowOptions = {
  windowSeconds: number;
  stepSeconds: number;
};

export function weightedMeanSquare(
  channels: Float32Array[],
  channelCount: number,
  startFrame: number,
  endFrame: number,
) {
  const frameCount = Math.max(0, endFrame - startFrame);
  if (!frameCount || !channels.length) return 0;

  let total = 0;
  for (const channel of channelWeights(channelCount)) {
    const samples = channels[channel.index];
    if (!samples || channel.weight === 0) continue;
    let sum = 0;
    for (let frame = startFrame; frame < endFrame; frame += 1) {
      const sample = samples[frame] ?? 0;
      sum += sample * sample;
    }
    total += channel.weight * (sum / frameCount);
  }
  return total;
}

export function computeLoudnessWindows(decoded: StudioDecodedAudio, options: LoudnessWindowOptions) {
  const prepared = prepareKWeightedAudio(decoded);
  const windowFrames = Math.max(1, Math.round(options.windowSeconds * decoded.sampleRate));
  const stepFrames = Math.max(1, Math.round(options.stepSeconds * decoded.sampleRate));
  const limitations = [...prepared.limitations];

  if (!prepared.channels.length) {
    return { windows: [] as LoudnessWindow[], limitations: [...limitations, 'K_WEIGHTING_UNAVAILABLE'] };
  }
  if (decoded.frameCount < windowFrames) {
    return { windows: [] as LoudnessWindow[], limitations: [...limitations, 'WINDOW_REQUIRES_LONGER_SIGNAL'] };
  }

  const windows: LoudnessWindow[] = [];
  for (let start = 0, index = 0; start + windowFrames <= decoded.frameCount; start += stepFrames, index += 1) {
    const meanSquare = weightedMeanSquare(prepared.channels, decoded.channels, start, start + windowFrames);
    windows.push({
      index,
      startSeconds: start / decoded.sampleRate,
      endSeconds: (start + windowFrames) / decoded.sampleRate,
      loudnessLufs: loudnessFromMeanSquare(meanSquare),
      meanSquare,
      gated: false,
    });
  }

  return { windows, limitations };
}
