export function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

export function calculateMophPhi(input: {
  ihg: number
  nti: number
  ldi: number
  go: number
  epsilon: number
}) {
  const ihg = clamp01(input.ihg)
  const nti = clamp01(input.nti)
  const ldi = clamp01(input.ldi)
  const go = clamp01(input.go)
  const epsilon = clamp01(input.epsilon)
  return clamp01(((1 / (ihg + 0.1)) * nti * (1 / (ldi + 0.1)) + epsilon - go * 0.15) / 12)
}

export function normalizeMophMetrics(input: {
  ihg: number
  nti: number
  ldi: number
  go: number
  epsilon: number
}) {
  const metrics = {
    ihg: clamp01(input.ihg),
    nti: clamp01(input.nti),
    ldi: clamp01(input.ldi),
    go: clamp01(input.go),
    epsilon: clamp01(input.epsilon),
  }
  return {
    ...metrics,
    phi: calculateMophPhi(metrics),
  }
}
