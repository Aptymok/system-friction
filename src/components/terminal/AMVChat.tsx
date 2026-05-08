'use client'

import { useMemo, useState } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { useNodeStore } from '@/lib/store/nodeStore'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function AMVChat() {
  const { audits } = useNodeStore()
  const initial = useMemo(() => {
    const last = audits[0]
    if (!last) return 'Observacion inicial: aun no hay memoria. Nombra una friccion actual y la terminal separara patron, riesgo y siguiente paso minimo.'
    return `Memoria activa: ultimo patron "${last.pattern || 'sin clasificar'}". IHG ${last.ihg.toFixed(3)}. No repetire la auditoria; preguntare por el punto de mayor friccion.`
  }, [audits])
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: initial }])
  const [input, setInput] = useState('')

  const respond = () => {
    const value = input.trim()
    if (!value) return
    const last = audits[0]
    const loopSignal = last?.loop_score && last.loop_score > 0.35
    const hard = last?.hard_stop
    const response = hard
      ? `HARD STOP sostenido. No ampliare el problema. Pregunta unica: que accion irreversible puedes pausar durante las proximas 2 horas?`
      : loopSignal
        ? `Detecto repeticion longitudinal. Pregunta unica: cual evidencia nueva existe hoy que no existia en la auditoria anterior?`
        : `Observacion: la narrativa necesita convertirse en estructura. Pregunta unica: que decision minima puedes cerrar con criterio verificable antes de 24 horas?`

    setMessages((prev) => [...prev, { role: 'user', content: value }, { role: 'assistant', content: response }])
    setInput('')
  }

  return (
    <section className="terminal-panel flex h-[360px] flex-col">
      <div className="flex items-center gap-2 border-b border-gold/10 px-4 py-3">
        <MessageSquare className="h-4 w-4 text-gold" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-gold">AMV propositivo</span>
        <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">contextual</span>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={index} className={message.role === 'user' ? 'text-right' : 'border-l border-gold/30 pl-3'}>
            <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-zinc-400">{message.content}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-gold/10 p-3">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && respond()}
          className="min-w-0 flex-1 border border-zinc-800 bg-black/50 px-3 py-2 font-mono text-[11px] text-zinc-300 outline-none focus:border-gold/50"
          placeholder="Responder al AMV..."
        />
        <button
          onClick={respond}
          className="border border-gold/30 bg-gold/10 px-3 text-gold transition hover:bg-gold hover:text-void"
          aria-label="Enviar mensaje"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}
