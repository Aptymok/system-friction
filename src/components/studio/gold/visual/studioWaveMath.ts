import type { StudioGoldState } from './studioGoldTypes';

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function roundMetric(value: number, digits = 2) {
  return Number(clamp01(value).toFixed(digits));
}

export function buildCulturalWavePoints(seed: {
  coherence: number;
  entropy: number;
  density: number;
  plasticity: number;
  coverage: number;
}): StudioGoldState['culturalWave']['points'] {
  const coherence = clamp01(seed.coherence);
  const entropy = clamp01(seed.entropy);
  const density = clamp01(seed.density);
  const plasticity = clamp01(seed.plasticity);
  const coverage = clamp01(seed.coverage);

  return Array.from({ length: 72 }, (_, index) => {
    const x = index / 71;
    const carrier = Math.sin(index * 0.42 + density * 3.4);
    const undertow = Math.cos(index * 0.18 + entropy * 4.8);
    const y = 0.5 + carrier * (0.12 + coherence * 0.11) + undertow * (0.04 + plasticity * 0.05);
    const amplitude = clamp01(0.28 + Math.abs(carrier) * 0.35 + coherence * 0.24);
    const pointDensity = clamp01(0.18 + density * 0.46 + coverage * 0.28 + Math.abs(undertow) * 0.08);
    return { x, y: clamp01(y), amplitude, density: pointDensity };
  });
}

export function trendFromDelta(current: number, previous: number): 'up' | 'down' | 'stable' {
  if (current - previous > 0.035) return 'up';
  if (previous - current > 0.035) return 'down';
  return 'stable';
}

export function intensityFromValue(value: number): 'low' | 'medium' | 'high' {
  const safe = clamp01(value);
  if (safe >= 0.7) return 'high';
  if (safe >= 0.42) return 'medium';
  return 'low';
}

export function seriesFromValue(value: number, length = 18) {
  const safe = clamp01(value);
  return Array.from({ length }, (_, index) => {
    const wave = Math.sin(index * 0.8 + safe * 5) * 0.08;
    const drift = (index / Math.max(1, length - 1) - 0.5) * (safe - 0.5) * 0.16;
    return roundMetric(safe + wave + drift, 3);
  });
}
