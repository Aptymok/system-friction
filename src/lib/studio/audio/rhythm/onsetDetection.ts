import type { OnsetEvent } from './types';

function localStats(values: Float64Array, center: number, radius: number) {
  const start = Math.max(0, center - radius);
  const end = Math.min(values.length, center + radius + 1);
  let sum = 0;
  let count = 0;
  for (let index = start; index < end; index += 1) {
    sum += values[index];
    count += 1;
  }
  const mean = count ? sum / count : 0;
  let variance = 0;
  for (let index = start; index < end; index += 1) variance += Math.pow(values[index] - mean, 2);
  return { mean, std: count ? Math.sqrt(variance / count) : 0 };
}

export function detectRhythmOnsets(envelope: Float64Array, hopSeconds: number): OnsetEvent[] {
  if (envelope.length < 4) return [];
  const minIntervalFrames = Math.max(1, Math.round(0.08 / hopSeconds));
  const events: OnsetEvent[] = [];
  let lastFrame = -Infinity;

  for (let index = 1; index < envelope.length - 1; index += 1) {
    const value = envelope[index];
    const stats = localStats(envelope, index, Math.max(4, Math.round(0.35 / hopSeconds)));
    const threshold = Math.max(0.12, stats.mean + stats.std * 1.05);
    const isPeak = value >= envelope[index - 1] && value > envelope[index + 1];
    const localProminence = value - Math.max(envelope[index - 1], envelope[index + 1], stats.mean);
    if (!isPeak || value < threshold || localProminence < 0.035 || index - lastFrame < minIntervalFrames) continue;
    const confidence = Math.max(0, Math.min(1, (value - threshold) / Math.max(0.001, 1 - threshold)));
    events.push({
      timestampSeconds: Number((index * hopSeconds).toFixed(4)),
      frameIndex: index,
      strength: Number(value.toFixed(6)),
      confidence: Number(Math.max(0.18, confidence).toFixed(4)),
      method: 'positive_spectral_flux_energy_delta_adaptive_peak_pick',
    });
    lastFrame = index;
  }

  return events;
}
