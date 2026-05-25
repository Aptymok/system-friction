import type { Metrics } from '@/lib/types'

export type TelemetrySignal = 'contradiction' | 'evasion' | 'executionMinimum' | 'syncPulse' | 'auditPulse'

const clamp = (value: number) => Math.min(1, Math.max(0, value))

export function normalizeMetrics(metrics: Partial<Metrics>): Metrics {
  const ihg = clamp(metrics.ihg ?? 0.85)
  const nti = clamp(metrics.nti ?? 0.5)
  const ldi = clamp(metrics.ldi ?? 0.05)
  const divergence = clamp(metrics.divergence ?? 0.05)
  const loop_score = clamp(metrics.loop_score ?? 0)

  const frictionLevel = clamp(0.18 + (1 - ihg) * 0.5 + nti * 0.18 + ldi * 0.12 + divergence * 0.15)
  const narrativeDrift = clamp(0.22 + nti * 0.38 - ihg * 0.25 + ldi * 0.12)
  const executionStability = clamp(ihg * 0.42 + (1 - divergence) * 0.37 + (1 - nti) * 0.18)
  const contradiction = clamp(nti * 0.8 + divergence * 0.25 + ldi * 0.1)

  return {
    ihg,
    nti,
    ldi,
    loop_score,
    divergence,
    frictionLevel,
    narrativeDrift,
    executionStability,
    contradiction,
  }
}

export function applySignalEffect(metrics: Metrics, signal: TelemetrySignal): Metrics {
  switch (signal) {
    case 'contradiction':
      return normalizeMetrics({
        ...metrics,
        nti: metrics.nti + 0.08,
        ldi: metrics.ldi + 0.05,
        divergence: metrics.divergence + 0.04,
        frictionLevel: (metrics.frictionLevel ?? 0) + 0.05,
        narrativeDrift: (metrics.narrativeDrift ?? 0) + 0.07,
        executionStability: (metrics.executionStability ?? 0) - 0.04,
      })
    case 'evasion':
      return normalizeMetrics({
        ...metrics,
        nti: metrics.nti + 0.04,
        ldi: metrics.ldi + 0.12,
        divergence: metrics.divergence + 0.03,
        narrativeDrift: (metrics.narrativeDrift ?? 0) + 0.08,
        executionStability: (metrics.executionStability ?? 0) - 0.08,
      })
    case 'executionMinimum':
      return normalizeMetrics({
        ...metrics,
        ihg: metrics.ihg + 0.05,
        nti: metrics.nti - 0.04,
        ldi: metrics.ldi - 0.06,
        divergence: metrics.divergence - 0.05,
        narrativeDrift: (metrics.narrativeDrift ?? 0) - 0.06,
        executionStability: (metrics.executionStability ?? 0) + 0.12,
      })
    case 'syncPulse':
      return normalizeMetrics({
        ...metrics,
        nti: metrics.nti - 0.03,
        ldi: metrics.ldi - 0.02,
        frictionLevel: (metrics.frictionLevel ?? 0) - 0.02,
        executionStability: (metrics.executionStability ?? 0) + 0.04,
      })
    case 'auditPulse':
      return normalizeMetrics({
        ...metrics,
        nti: metrics.nti + 0.01,
        ldi: metrics.ldi + 0.01,
        divergence: metrics.divergence + 0.01,
      })
    default:
      return normalizeMetrics(metrics)
  }
}
