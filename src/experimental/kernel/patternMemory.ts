// src/experimental/kernel/patternMemory.ts
type PatternRecord = {
  errorRate: number;
  divergence: number;
  timestamp: number;
};

const PATTERN_HISTORY: PatternRecord[] = [];
const MAX_HISTORY = 100;

export function recordPattern(metrics: { errorRate: number; divergence: number }) {
  PATTERN_HISTORY.unshift({
    errorRate: metrics.errorRate,
    divergence: metrics.divergence,
    timestamp: Date.now(),
  });
  if (PATTERN_HISTORY.length > MAX_HISTORY) PATTERN_HISTORY.pop();
  console.log(`[patternMemory] registrado: error=${metrics.errorRate}, div=${metrics.divergence}`);
}

export function getRecentPatterns(limit: number = 10): PatternRecord[] {
  return PATTERN_HISTORY.slice(0, limit);
}

export function detectStablePattern(): boolean {
  if (PATTERN_HISTORY.length < 5) return false;
  const recent = PATTERN_HISTORY.slice(0, 5);
  const avgError = recent.reduce((s, r) => s + r.errorRate, 0) / 5;
  const avgDiv = recent.reduce((s, r) => s + r.divergence, 0) / 5;
  // umbrales arbitrarios
  return avgError < 0.2 && avgDiv < 0.3;
}
