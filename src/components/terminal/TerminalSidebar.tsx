'use client'

import { Activity, BrainCircuit, CircleDot, Clock3, Globe2, Layers, LogOut, ShieldCheck, Sparkles, Wifi } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useNodeStore } from '@/lib/store/nodeStore'
import { Badge } from '@/components/shared/Badge'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

const MODE_ITEMS = [
  { label: 'Audit', icon: Activity },
  { label: 'Cognitive Twin', icon: BrainCircuit },
  { label: 'WorldSpectrum', icon: Globe2 },
  { label: 'Media MIHM', icon: Sparkles },
  { label: 'Campaign Engine', icon: Layers },
  { label: 'Timeline', icon: Clock3 },
  { label: 'Event Memory', icon: CircleDot },
  { label: 'Social Dashboard', icon: ShieldCheck },
  { label: 'Attractor Simulation', icon: Activity },
]

function MetricRow({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/5 py-2 text-[11px] text-zinc-400 last:border-b-0">
      <span className="uppercase tracking-[0.24em] text-zinc-500">{label}</span>
      <span className="font-mono text-[11px] text-paper">{value}{unit ? ` ${unit}` : ''}</span>
    </div>
  )
}

function Heatband({ label, ratio }: { label: string; ratio: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-zinc-500">
        <span>{label}</span>
        <span>{Math.round(ratio * 100)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  )
}

const PHASE_STEPS = [
  { id: 1, label: 'Fase 1', subtitle: 'Infraestructura Visual' },
  { id: 2, label: 'Fase 2', subtitle: 'WorldSpectrum' },
  { id: 3, label: 'Fase 3', subtitle: 'Cognitive Twin' },
  { id: 4, label: 'Fase 4', subtitle: 'Media MIHM' },
  { id: 5, label: 'Fase 5', subtitle: 'Campaign Orchestration' },
  { id: 6, label: 'Fase 6', subtitle: 'Longitudinal Memory' },
]

export function TerminalSidebar() {
  const { node, metrics, status, audits, memoryFacts, actions, snapshotHistory, phase, setPhase } = useNodeStore()
  const router = useRouter()
  const syncStatus = node ? 'sincronizado' : 'pendiente'
  const stability = metrics.divergence > 0.6 ? 'inestable' : metrics.divergence > 0.3 ? 'moderada' : 'estabilizada'
  const highNTI = metrics.nti > 0.72
  const highIHG = metrics.ihg > 0.7
  const highLDI = metrics.ldi > 0.45
  const sidebarStateClass = highNTI ? 'animate-jitter border-rose-500/15 shadow-[0_0_40px_rgba(196,41,41,0.12)]' : highIHG ? 'border-cyan-500/10 bg-[#081212]/95 shadow-[0_0_40px_rgba(34,198,214,0.12)]' : ''
  const entropy = Math.min(1, Math.max(0, 0.28 + (1 - metrics.ihg) * 0.58))
  const pressure = Math.min(1, Math.max(0, 0.17 + (1 - metrics.nti) * 0.62))

  const logout = async () => {
    const supabase = createBrowserSupabaseClient()
    await supabase?.auth.signOut()
    router.refresh()
    router.replace('/')
  }

  return (
    <aside className="terminal-panel flex h-full flex-col border border-white/10 bg-[#080808]/95 p-4 shadow-[0_0_40px_rgba(0,0,0,0.26)] backdrop-blur-sm">
      <div className="mb-5 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-gold" />
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.32em] text-gold">NODO OPERACIONAL</p>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-paper">Centro Longitudinal</p>
        </div>
      </div>

      <div className={`space-y-3 rounded border border-white/10 bg-[#050505]/80 p-4 ${sidebarStateClass}`}>
        <MetricRow label="Protocolo" value="SFI-OPS_v1.4" />
        <MetricRow label="Estado nodo" value={status.toUpperCase()} />
        <MetricRow label="Sincronización" value={syncStatus} />
        <MetricRow label="Longitudinal" value={stability} />
        <MetricRow label="IHG" value={metrics.ihg.toFixed(3)} />
        <MetricRow label="NTI" value={metrics.nti.toFixed(3)} />
        <MetricRow label="LDI" value={`${metrics.ldi.toFixed(3)} / 24h`} />
        <MetricRow label="Contradicción" value={(metrics.contradiction ?? 0).toFixed(3)} />
        <MetricRow label="Deriva" value={(metrics.narrativeDrift ?? 0).toFixed(3)} />
        <MetricRow label="Estabilidad" value={(metrics.executionStability ?? 0).toFixed(3)} />
        <MetricRow label="Fricción" value={(metrics.frictionLevel ?? 0).toFixed(3)} />
      </div>

      <div className="mt-5 rounded border border-white/10 bg-[#050505]/80 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">Fases pendientes</p>
        <div className="mt-3 grid gap-2">
          {PHASE_STEPS.map((step) => (
            <button
              key={step.id}
              onClick={() => setPhase(step.id)}
              className={`group flex flex-col gap-1 rounded border px-3 py-2 text-left text-[11px] transition ${phase === step.id ? 'border-gold bg-[#111111]/90 text-paper' : 'border-white/10 bg-[#070707]/80 text-zinc-300 hover:border-gold/20 hover:text-paper'}`}>
              <span className="font-semibold uppercase tracking-[0.18em]">{step.label}</span>
              <span className="text-[10px] text-zinc-500">{step.subtitle}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded border border-white/10 bg-[#050505]/80 p-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-zinc-500">
          <Wifi className="h-4 w-4 text-gold" />
          <span>Red operativa</span>
        </div>
        <div className="relative mt-4 h-32 overflow-hidden rounded-xl border border-white/10 bg-[#060606]/90">
          <div className="absolute left-6 top-7 h-0.5 w-16 bg-white/10" />
          <div className="absolute right-7 top-12 h-0.5 w-20 bg-white/10" />
          <div className="absolute left-14 bottom-10 h-0.5 w-24 bg-white/10" />
          <div className="absolute left-1/2 top-10 h-0.5 w-24 bg-white/10" />
          <div className="absolute left-8 top-6 flex h-3 w-3 items-center justify-center rounded-full bg-gold text-black" />
          <div className="absolute right-10 top-14 flex h-3 w-3 items-center justify-center rounded-full bg-cyan-400 text-black" />
          <div className="absolute left-24 bottom-8 flex h-3 w-3 items-center justify-center rounded-full bg-fuchsia-500 text-black" />
          <div className="absolute left-[52%] top-5 flex h-3 w-3 items-center justify-center rounded-full bg-white/80 text-black" />
          <div className="absolute right-8 bottom-10 flex h-3 w-3 items-center justify-center rounded-full bg-white/80 text-black" />
        </div>
        <div className="mt-4 grid gap-3">
          <Heatband label="Fricción" ratio={entropy} />
          <Heatband label="Actividad" ratio={pressure} />
        </div>
      </div>

      {highLDI && (
        <div className="mt-5 rounded border border-rose-500/10 bg-rose-500/5 p-3 text-[11px] text-rose-200">
          <p className="uppercase tracking-[0.24em] text-rose-300">Alerta Longitudinal</p>
          <p className="mt-2 text-sm leading-relaxed text-rose-100">LDI alto: los gaps temporales y la latencia operativa están generando pérdida de sincronización.</p>
        </div>
      )}

      <div className="mt-auto rounded border border-white/10 bg-[#050505]/80 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">Resumen de capa</p>
          <Badge tone={actions.some((action) => action.status === 'pending') ? 'gold' : 'green'}>{actions.some((action) => action.status === 'pending') ? 'Acciones activas' : 'Estable'}</Badge>
        </div>
        <div className="mt-3 space-y-2 text-[11px] text-zinc-400">
          <p>Auditorias: {audits.length}</p>
          <p>Hechos: {memoryFacts.length}</p>
          <p>Acciones: {actions.length}</p>
          <p>Checkpoints: {snapshotHistory.length}</p>
        </div>
        <button
          onClick={() => void logout()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500 transition hover:border-gold/30 hover:text-gold"
        >
          <LogOut className="h-3.5 w-3.5" />
          Cerrar sesion
        </button>
      </div>
    </aside>
  )
}
