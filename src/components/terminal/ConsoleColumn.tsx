'use client'

import { useState } from 'react'
import { AlertTriangle, Send, ShieldAlert, Terminal } from 'lucide-react'
import { useNodeStore } from '@/lib/store/nodeStore'
import type { Audit } from '@/lib/types'
import { AMVChat } from './AMVChat'

export function ConsoleColumn() {
  const [narrative, setNarrative] = useState('')
  const [processing, setProcessing] = useState(false)
  const { node, addAudit, updateMetrics } = useNodeStore()

  const handleAudit = async () => {
    if (!narrative.trim() || !node || processing) return
    setProcessing(true)
    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'web', nodeId: node.id, narrative })
      })
      const result = (await response.json()) as { success: boolean; audit?: Audit }
      if (result.success && result.audit) {
        addAudit(result.audit)
        updateMetrics({
          ihg: result.audit.ihg,
          nti: result.audit.nti,
          ldi: result.audit.ldi,
          loop_score: result.audit.loop_score,
          divergence: result.audit.divergence
        })
        setNarrative('')
      }
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-col gap-5">
      <section className="terminal-panel relative flex min-h-[420px] flex-1 flex-col overflow-hidden p-5">
        <div className="scanline" />
        <div className="relative mb-4 flex items-center gap-2 border-b border-gold/10 pb-3">
          <Terminal className="h-4 w-4 text-gold" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-gold">Consola de inferencia</span>
          <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">MODO AUDITORIA</span>
        </div>

        <textarea
          value={narrative}
          onChange={(event) => setNarrative(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) void handleAudit()
          }}
          className="relative z-10 min-h-[240px] flex-1 resize-none border-0 bg-transparent font-serif text-xl leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-700"
          placeholder="Describe la anomalia operacional sin adornos: que se repite, que evitas, que se esta demorando o que podria romperse si continua igual..."
        />

        <div className="relative z-10 mt-5 space-y-3 border-t border-gold/10 pt-4">
          <button
            onClick={handleAudit}
            disabled={processing || !narrative.trim()}
            className="flex w-full items-center justify-center gap-2 bg-gold px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-void transition hover:bg-paper disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {processing ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Send className="h-4 w-4" />}
            Sincronizar auditoria
          </button>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">Ctrl+Enter ejecuta. El sistema detecta patrones y puede activar hard stop.</p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <EmergencyCard title="Emergencia" icon={<ShieldAlert />} text="Si hay riesgo inmediato, la terminal reduce alcance y nombra solo el siguiente paso reversible." />
        <EmergencyCard title="Prevencion" icon={<AlertTriangle />} text="Loops, latencia y opacidad elevan la severidad antes de que aparezca colapso operativo." />
      </div>

      <AMVChat />
    </div>
  )
}

function EmergencyCard({ title, text, icon }: { title: string; text: string; icon: React.ReactElement }) {
  return (
    <div className="border border-gold/10 bg-black/35 p-4">
      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
        <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
        {title}
      </div>
      <p className="text-sm leading-relaxed text-zinc-500">{text}</p>
    </div>
  )
}
