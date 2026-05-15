'use client'

import { Circle, Clock3, SquareDot, Zap } from 'lucide-react'
import { useMemo } from 'react'
import { useNodeStore } from '@/lib/store/nodeStore'

export function TerminalTimeline() {
  const { audits, actions, logs, metrics, snapshotHistory } = useNodeStore()

  const events = useMemo(() => {
    const auditEvents = audits.slice(0, 2).map((audit) => ({
      ts: audit.created_at,
      label: 'AUDITORÍA',
      detail: audit.pattern || audit.verdict,
      type: 'audit' as const,
    }))
    const actionEvents = actions.slice(0, 2).map((action) => ({
      ts: action.created_at ?? new Date().toISOString(),
      label: `ACCIÓN ${action.status.toUpperCase()}`,
      detail: action.description,
      type: 'action' as const,
    }))
    const logEvents = logs.slice(0, 2).map((log) => ({
      ts: log.timestamp,
      label: `EVENTO ${log.type.toUpperCase()}`,
      detail: log.content,
      type: 'log' as const,
    }))
    const snapshotEvents = snapshotHistory.slice(0, 2).map((snapshot) => ({
      ts: snapshot.timestamp,
      label: snapshot.label,
      detail: snapshot.note ?? 'Historial longitudinal',
      type: 'snapshot' as const,
    }))

    return [...auditEvents, ...actionEvents, ...logEvents, ...snapshotEvents]
      .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
  }, [audits, actions, logs, snapshotHistory])

  const highNTI = metrics.nti > 0.72
  const highLDI = metrics.ldi > 0.45
  const pulseBars = [
    metrics.ihg,
    metrics.nti,
    metrics.divergence * 0.8,
    0.75 + (1 - metrics.ihg) * 0.15,
    0.6 + metrics.nti * 0.2,
  ].map((value) => Math.min(1, Math.max(0, value)))

  return (
    <section className={`terminal-panel rounded border border-white/10 p-4 shadow-[0_0_40px_rgba(0,0,0,0.24)] ${highNTI ? 'border-rose-500/10 bg-[#110b0c] animate-jitter' : 'bg-[#060606]/95'}`}>
      <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-3">
        <Clock3 className="h-4 w-4 text-gold" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">Timeline Longitudinal</p>
          <p className="text-sm uppercase tracking-[0.18em] text-zinc-400">Pulso de nodo, eventos y calor operativo</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-[#070707]/90 p-4">
          <div className="relative h-24 overflow-hidden">
            <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10" />
            {events.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-[11px] text-zinc-500">Sin trazas temporales</div>
            ) : (
              events.map((event, index) => {
                const progress = (index / Math.max(1, events.length - 1)) * 100
                return (
                  <div key={event.ts} className="absolute top-1/2 flex flex-col items-center text-center" style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#0b0b0b]/95 text-[11px] text-paper">
                      {event.type === 'audit' ? <Zap className="h-4 w-4 text-gold" /> : event.type === 'action' ? <SquareDot className="h-4 w-4 text-cyan-400" /> : <Circle className="h-2 w-2 rounded-full bg-zinc-400" />}
                    </div>
                    <span className="mt-2 max-w-[90px] text-[10px] uppercase tracking-[0.2em] text-zinc-500">{event.label}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#070707]/90 p-4">
          <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-zinc-500">
            <span>Pulse telemetry</span>
            <span>ECG operativo</span>
          </div>
          <div className="space-y-2">
            {['IHG', 'NTI', 'Divergencia', 'Señal', 'Latencia'].map((label, index) => (
              <div key={label} className="flex items-center gap-3 text-[11px] text-zinc-300">
                <span className="w-16 text-zinc-500">{label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.round(pulseBars[index] * 100)}%` }} />
                </div>
                <span className="w-10 text-right text-zinc-400">{Math.round(pulseBars[index] * 100)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#070707]/90 p-4">
          <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-zinc-500">
            <span>Mapa de calor</span>
            <span>Fricción / Paquetes</span>
          </div>
          <div className="grid grid-cols-8 gap-1">
            {Array.from({ length: 16 }).map((_, index) => (
              <div key={index} className={`h-6 rounded-sm ${index % 3 === 0 ? 'bg-gold/70' : index % 3 === 1 ? 'bg-cyan-500/40' : 'bg-zinc-700/80'}`} />
            ))}
          </div>
          {highLDI && (
            <div className="mt-4 rounded border border-rose-500/10 bg-rose-500/5 p-3 text-[11px] text-rose-200">
              <p className="uppercase tracking-[0.24em]">Gaps longitudinales</p>
              <p className="mt-1 text-sm text-rose-100">El observatorio detecta latencia de decisión elevada; se recomienda trazar la siguiente acción mínima.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
