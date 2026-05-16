'use client'

import { Activity, CloudCog, Globe2, Layers, MessageCircle, Radar } from 'lucide-react'
import { useNodeStore } from '@/observatory/store/nodeStore'
import { Badge } from '@/components/shared/Badge'

const PHASE_META: Record<number, { title: string; description: string; icon: typeof Activity; highlight: string }> = {
  1: {
    title: 'Infraestructura Visual',
    description: 'Supervisa la telemetría primaria y la fase de observabilidad del nodo. Esta fase consolida eventos, pulso y estado de red.',
    icon: Activity,
    highlight: 'Mantener la resonancia del pulso para evitar deriva de fase.',
  },
  2: {
    title: 'WorldSpectrum',
    description: 'Activa el mapa de espectro global donde convergen señales geoespaciales, cargas y hallazgos de auditoría.',
    icon: Globe2,
    highlight: 'Correlaciona patrones de entrada con ubicaciones y cargas relevantes.',
  },
  3: {
    title: 'Cognitive Twin',
    description: 'Habilita la réplica simbólica del nodo para modelar confianza, contradicciones y trayectoria de identidad.',
    icon: CloudCog,
    highlight: 'El gemelo cognitivo requiere señales de contrafactuales y estado para crecer.',
  },
  4: {
    title: 'Media MIHM',
    description: 'Procesa la capa multimodal en tiempo real, desde espectrogramas hasta memorias semánticas.',
    icon: MessageCircle,
    highlight: 'Observa el flujo de media y su impacto sobre la coherencia del nodo.',
  },
  5: {
    title: 'Campaign Orchestration',
    description: 'Orquesta campañas, eventos y activaciones con una vista de ruta dependiente de fase.',
    icon: Radar,
    highlight: 'Alinea acciones operativas con métricas y disparadores del nodo.',
  },
  6: {
    title: 'Longitudinal Memory',
    description: 'Consolida el registro histórico para construir un observatorio longitudinal de fases y decisiones.',
    icon: Layers,
    highlight: 'La memoria histórica es la base para detectar deriva y reinicios de fase.',
  },
}

export function PhasePanel() {
  const { phase, metrics, snapshotHistory, audits, actions, memoryFacts } = useNodeStore()
  const phaseInfo = PHASE_META[phase]
  const PhaseIcon = phaseInfo.icon
  const lastSnapshot = snapshotHistory[0]

  const summaryMetrics = [
    { label: 'NTI', value: metrics.nti, tone: metrics.nti > 0.85 ? 'gold' : 'zinc' },
    { label: 'IHG', value: metrics.ihg, tone: metrics.ihg > 0.7 ? 'gold' : 'zinc' },
    { label: 'LDI', value: metrics.ldi, tone: metrics.ldi > 0.12 ? 'red' : 'green' },
  ]

  return (
    <section className="terminal-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">Fase activa</p>
          <h2 className="text-base font-semibold text-paper">{phaseInfo.title}</h2>
        </div>
        <Badge tone="gold">Fase {phase}</Badge>
      </div>

      <div className="mb-5 flex items-start gap-4 rounded-lg border border-white/10 bg-[#09090a]/90 p-4">
        <PhaseIcon className="h-6 w-6 text-gold" />
        <div>
          <p className="text-sm leading-relaxed text-zinc-300">{phaseInfo.description}</p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.28em] text-zinc-500">Indicador principal</p>
          <p className="mt-1 text-sm font-medium text-paper">{phaseInfo.highlight}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {summaryMetrics.map((metric) => (
          <div key={metric.label} className="rounded border border-white/10 bg-[#050505]/80 p-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">{metric.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${metric.tone === 'red' ? 'text-signalRed' : metric.tone === 'green' ? 'text-emerald-300' : 'text-gold'}`}>
              {metric.value.toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-white/10 bg-[#050505]/80 p-3">
          <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Auditorías</p>
          <p className="mt-2 text-xl font-semibold text-paper">{audits.length}</p>
        </div>
        <div className="rounded border border-white/10 bg-[#050505]/80 p-3">
          <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Acciones</p>
          <p className="mt-2 text-xl font-semibold text-paper">{actions.length}</p>
        </div>
        <div className="rounded border border-white/10 bg-[#050505]/80 p-3">
          <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Hechos de memoria</p>
          <p className="mt-2 text-xl font-semibold text-paper">{memoryFacts.length}</p>
        </div>
      </div>

      <div className="mt-5 rounded border border-white/10 bg-[#09090a]/90 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">Último snapshot</p>
        {lastSnapshot ? (
          <div className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-300">
            <p className="font-semibold text-paper">{lastSnapshot.label}</p>
            <p>{lastSnapshot.note ?? 'Sin nota adicional'}</p>
            <p className="text-xs text-zinc-500">{new Date(lastSnapshot.timestamp).toLocaleString()}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">Aún no hay registros longitudinales. Inicia una señal o agrega un snapshot para completar la memoria.</p>
        )}
      </div>
    </section>
  )
}
