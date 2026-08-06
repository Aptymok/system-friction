import { calculatePhiH } from '@/core/formulas/canonicalFormulas';

export function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function calculateMophPhi(input: {
  ihg: number;
  nti: number;
  ldi: number;
  go: number;
  epsilon: number;
}) {
  return calculatePhiH(input.ihg, input.nti, input.ldi, input.epsilon, input.go);
}

export function normalizeMophMetrics(input: {
  ihg: number;
  nti: number;
  ldi: number;
  go: number;
  epsilon: number;
}) {
  const metrics = {
    ihg: clamp01(input.ihg),
    nti: clamp01(input.nti),
    ldi: clamp01(input.ldi),
    go: clamp01(input.go),
    epsilon: clamp01(input.epsilon),
  };
  return {
    ...metrics,
    phi: calculateMophPhi(metrics),
  };
}
