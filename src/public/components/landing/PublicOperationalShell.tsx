'use client'

import { Activity, Gauge, Radio, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNodeStore } from '@/observatory/store/nodeStore'

const STREAM = [
  'public.shell: persistent',
  'auth.boundary: awaiting operator',
  'telemetry.pulse: low-resolution',
  'memory.layer: read-only until authorization',
  'terminal.expansion: staged',
]

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[44px_1fr_38px] items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">
      <span>{label}</span>
      <div className="h-1 overflow-hidden bg-white/10">
        <div className="h-full bg-gold transition-all duration-700" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <span className="text-right text-gold/70">{Math.round(value * 100)}</span>
    </div>
  )
}

export function PublicOperationalShell() {
  const { metrics, logs, ingestSignal } = useNodeStore()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((current) => current + 1)
      ingestSignal('syncPulse', 'Observatorio publico mantiene pulso minimo')
    }, 14000)

    return () => window.clearInterval(interval)
  }, [ingestSignal])

  const stream = useMemo(() => {
    const latest = logs.slice(0, 2).map((log) => `${log.type}: ${log.content}`)
    return [...latest, ...STREAM].slice(0, 5)
  }, [logs])

  return (
    <>
      <aside className="pointer-events-none fixed right-4 top-24 z-40 hidden w-[292px] border border-gold/15 bg-[#070706]/85 p-4 text-paper shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md 2xl:block">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(212,175,55,0.06),transparent_36%)]" />
        <div className="scanline" />
        <div className="relative">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-gold/10 pb-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-gold" />
              <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-gold">Public Node</p>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">r{String(tick % 99).padStart(2, '0')}</span>
          </div>

          <div className="space-y-3">
            <Metric label="ihg" value={metrics.ihg} />
            <Metric label="nti" value={metrics.nti} />
            <Metric label="ldi" value={metrics.ldi} />
            <Metric label="drf" value={metrics.divergence} />
          </div>

          <div className="mt-5 space-y-2 border-t border-gold/10 pt-4">
            {stream.map((line, index) => (
              <div key={`${line}-${index}`} className="border-l border-gold/20 bg-black/25 px-3 py-2 font-mono text-[9px] leading-relaxed text-zinc-500">
                {line}
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gold/10 pt-4">
            {[
              { label: 'shell', icon: ShieldCheck },
              { label: 'pulse', icon: Activity },
              { label: 'gate', icon: Gauge },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="border border-white/10 bg-white/[0.03] px-2 py-2 text-center">
                  <Icon className="mx-auto h-3.5 w-3.5 text-gold/70" />
                  <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.18em] text-zinc-600">{item.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </aside>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 border-t border-gold/15 bg-[#070706]/90 px-4 py-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 overflow-hidden font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">
          <span className="shrink-0 text-gold">SFI public shell</span>
          <span className="hidden min-w-0 truncate sm:block">{stream[0]}</span>
          <span className="shrink-0">IHG {metrics.ihg.toFixed(2)} / NTI {metrics.nti.toFixed(2)} / LDI {metrics.ldi.toFixed(2)}</span>
        </div>
      </div>
    </>
  )
}
