'use client'

import { BrainCircuit } from 'lucide-react'
import { useNodeStore } from '@/observatory/store/nodeStore'
import { Badge } from '@/components/shared/Badge'

export function SystemLog() {
  const { node, audits, memoryFacts, actions } = useNodeStore()
  const last = audits[0]
  const activePattern = node?.active_pattern || last?.pattern || 'sin patron activo'
  const severity = Number(node?.current_severity ?? last?.divergence ?? 0)
  const avoidance = memoryFacts.find((fact) => fact.fact_type === 'emotion_pattern' || fact.label.toLowerCase().includes('evitacion'))
  const repeated = memoryFacts.find((fact) => fact.fact_type === 'loop' || fact.recurrence_count > 1)
  const pending = actions.find((action) => action.status === 'pending')

  return (
    <section className="terminal-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-gold" />
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">Bitacora del sistema</p>
        </div>
        <Badge tone={severity > 0.62 ? 'red' : severity > 0.36 ? 'gold' : 'green'}>
          Severidad {severity.toFixed(2)}
        </Badge>
      </div>

      <div className="space-y-4 text-sm leading-relaxed">
        <LogLine
          label="Que cree el sistema"
          value={
            last
              ? `Hay una friccion activa alrededor de "${activePattern}". El nodo muestra IHG ${last.ihg.toFixed(2)}, NTI ${last.nti.toFixed(2)} y LDI ${last.ldi}h.`
              : 'Aun no existe auditoria suficiente. El MOP-H debe crear la primera lectura.'
          }
        />
        <LogLine label="Patron detectado" value={activePattern} />
        <LogLine
          label="Lo que parece estar evitando"
          value={avoidance?.value && avoidance.value !== 'No explicitada' ? avoidance.value : 'No hay evitacion explicitada; el sistema seguira buscando senales en AMV y auditorias.'}
        />
        <LogLine
          label="Lo que se esta repitiendo"
          value={repeated?.value && repeated.value !== 'No explicitada' ? repeated.value : 'Aun no hay repeticion confirmada. La siguiente auditoria definira recurrencia.'}
        />
        <LogLine
          label="Accion viva"
          value={pending ? `${pending.description} Criterio: ${pending.verification_criterion}` : 'No hay accion pendiente registrada.'}
        />
      </div>
    </section>
  )
}

function LogLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-gold/25 pl-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">{label}</p>
      <p className="mt-1 text-zinc-300">{value}</p>
    </div>
  )
}
