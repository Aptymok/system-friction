'use client'

import { AlertTriangle, Activity, Eye, TimerReset } from 'lucide-react'
import type { Metrics } from '@/lib/types'
import { cn } from '@/lib/utils/cn'

function barWidth(value: number, mode: 'signed' | 'unit' | 'hours') {
  if (mode === 'signed') return `${Math.min(100, Math.abs(value) * 100)}%`
  if (mode === 'hours') return `${Math.min(100, (value / 168) * 100)}%`
  return `${Math.min(100, value * 100)}%`
}

export function MetricsPanel({ metrics, hardStop }: { metrics: Metrics; hardStop?: boolean }) {
  const ihgTone = metrics.ihg < -0.3 ? 'bg-signalRed' : metrics.ihg > 0.3 ? 'bg-emerald-500' : 'bg-gold'
  return (
    <section className="terminal-panel p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold">Sensores operativos</p>
          <h2 className="mt-2 font-display text-sm uppercase tracking-[0.08em] text-paper">Estado del nodo</h2>
        </div>
        {hardStop ? <AlertTriangle className="h-5 w-5 text-signalRed" /> : <Activity className="h-5 w-5 text-gold" />}
      </div>

      <div className="space-y-5">
        <MetricLine label="IHG" value={metrics.ihg.toFixed(3)} icon={<Activity />} width={barWidth(metrics.ihg, 'signed')} fill={ihgTone} />
        <MetricLine label="NTI" value={metrics.nti.toFixed(3)} icon={<Eye />} width={barWidth(metrics.nti, 'unit')} fill="bg-signalBlue" />
        <MetricLine label="LDI" value={`${metrics.ldi}h`} icon={<TimerReset />} width={barWidth(metrics.ldi, 'hours')} fill="bg-zinc-300" />
      </div>
    </section>
  )
}

function MetricLine({
  label,
  value,
  icon,
  width,
  fill
}: {
  label: string
  value: string
  icon: React.ReactElement
  width: string
  fill: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">
        <span className="flex items-center gap-2">{icon && <span className="h-3 w-3 [&>svg]:h-3 [&>svg]:w-3">{icon}</span>}{label}</span>
        <span className="text-paper">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden bg-zinc-900">
        <div className={cn('h-full transition-all duration-700', fill)} style={{ width }} />
      </div>
    </div>
  )
}
