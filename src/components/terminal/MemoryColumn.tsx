'use client'

import { HardDrive, Link as LinkIcon, MessageSquare, Zap } from 'lucide-react'
import { useState } from 'react'
import { useNodeStore } from '@/lib/store/nodeStore'
import { Badge } from '@/components/shared/Badge'

export function MemoryColumn() {
  const { audits, node, memoryFacts, actions } = useNodeStore()
  const [link, setLink] = useState<string>('')

  const generateLink = async () => {
    if (!node) return
    const response = await fetch('/api/link/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId: node.id })
    })
    const result = (await response.json()) as { url?: string }
    if (result.url) setLink(result.url)
  }

  return (
    <aside className="terminal-panel flex min-h-0 flex-col">
      <div className="border-b border-gold/10 p-4">
        <div className="mb-2 flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-gold" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-gold">Memoria operacional</span>
        </div>
        <p className="font-mono text-[10px] text-zinc-600">Nodo: {node?.id.slice(0, 18) || 'sincronizando'} · {audits.length} auditorias · {memoryFacts.length} hechos</p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {memoryFacts.length > 0 && (
          <div className="space-y-3 border-b border-gold/10 pb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">Hechos persistentes</p>
            {memoryFacts.slice(0, 6).map((fact) => (
              <article key={fact.id} className="border-l border-zinc-800 pl-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">{fact.fact_type} · {Math.round(fact.confidence * 100)}%</p>
                <p className="mt-1 text-sm text-zinc-400">{fact.label}: {fact.value}</p>
              </article>
            ))}
          </div>
        )}

        {actions.length > 0 && (
          <div className="space-y-3 border-b border-gold/10 pb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">Acciones vivas</p>
            {actions.slice(0, 4).map((action) => (
              <article key={action.id} className="border-l border-gold/20 pl-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">{action.status} {action.due_at ? `· ${new Date(action.due_at).toLocaleString()}` : ''}</p>
                <p className="mt-1 text-sm text-zinc-300">{action.description}</p>
              </article>
            ))}
          </div>
        )}

        {audits.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-serif text-lg italic text-zinc-500">No hay patrones longitudinales todavia.</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-700">Ejecuta una auditoria</p>
          </div>
        ) : (
          audits.map((audit) => (
            <article key={audit.id} className="border-l border-gold/25 pl-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {audit.source === 'whatsapp' ? <MessageSquare className="h-3.5 w-3.5 text-emerald-400" /> : <Zap className="h-3.5 w-3.5 text-gold" />}
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">{new Date(audit.created_at).toLocaleString()}</span>
                <Badge tone={audit.hard_stop ? 'red' : audit.ihg > 0.3 ? 'green' : 'gold'}>IHG {audit.ihg.toFixed(2)}</Badge>
              </div>
              <p className="line-clamp-3 text-sm leading-relaxed text-zinc-400">{audit.narrative || audit.diagnosis}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">{audit.pattern}</p>
            </article>
          ))
        )}
      </div>

      <div className="border-t border-gold/10 p-4">
        <button
          onClick={generateLink}
          className="flex w-full items-center justify-center gap-2 border border-gold/30 bg-gold/10 px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-gold transition hover:bg-gold hover:text-void"
        >
          <LinkIcon className="h-4 w-4" />
          Generar token magico
        </button>
        {link && <p className="mt-3 break-all font-mono text-[10px] leading-relaxed text-zinc-500">{link}</p>}
      </div>
    </aside>
  )
}
