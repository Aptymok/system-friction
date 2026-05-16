'use client'

import { AlertTriangle, CheckCircle2, GitBranch } from 'lucide-react'
import { useNodeStore } from '@/observatory/store/nodeStore'
import { MetricsPanel } from './MetricsPanel'
import { SimulationCanvas } from './SimulationCanvas'
import { Badge } from '@/components/shared/Badge'
import { SystemLog } from './SystemLog'

export function StateColumn() {
  const { audits } = useNodeStore()
  const last = audits[0]
  const hardStop = Boolean(last?.hard_stop)

  return (
    <div className="flex min-h-0 flex-col gap-5">
      <MetricsPanel />
      <SystemLog />
      <SimulationCanvas />

      <section className="terminal-panel p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">Resolucion del kernel</p>
          <Badge tone={hardStop ? 'red' : 'gold'}>{hardStop ? 'hard stop' : 'resolucion'}</Badge>
        </div>
        {last ? (
          <div className="space-y-4">
            <div className="flex gap-3">
              {hardStop ? <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-signalRed" /> : <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-gold" />}
              <div>
                <h3 className="font-serif text-xl italic text-paper">{last.verdict}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{last.diagnosis}</p>
              </div>
            </div>
            <div className="border-l border-gold/30 pl-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">Propuesta minima</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{last.proposed_action}</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 text-zinc-500">
            <GitBranch className="mt-1 h-5 w-5 text-gold" />
            <p className="text-sm leading-relaxed">Sin auditorias. El primer registro crea una linea base; los siguientes permiten detectar patrones y prevenir deriva.</p>
          </div>
        )}
      </section>
    </div>
  )
}
