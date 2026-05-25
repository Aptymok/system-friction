'use client'

import { useMemo, useState } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { useNodeStore } from '@/observatory/store/nodeStore'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function AMVChat() {
  const { audits, node } = useNodeStore()
  const initial = useMemo(() => {
    const last = audits[0]
    if (!last) return 'Observacion inicial: aun no hay memoria. Nombra una friccion actual y la terminal separara patron, riesgo y siguiente paso minimo.'
    return `Memoria activa: ultimo patron "${last.pattern || 'sin clasificar'}". IHG ${last.ihg.toFixed(3)}. No repetire la auditoria; preguntare por el punto de mayor friccion.`
  }, [audits])
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: initial }])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(false)

  const startSession = async () => {
    if (!node || sessionId || loading) return
    setLoading(true)
    try {
      const response = await fetch('/api/amv/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: node.id })
      })
      const result = await response.json()
      if (result.success) {
        setSessionId(result.session_id)
        setQuestionIndex(result.question_index)
        setMessages((prev) => [...prev, { role: 'assistant', content: result.question }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'AMV local activo. Supabase no esta configurado para sesion persistente.' }])
    } finally {
      setLoading(false)
    }
  }

  const respond = async () => {
    const value = input.trim()
    if (!value || loading || completed) return

    if (node && sessionId) {
      setLoading(true)
      setMessages((prev) => [...prev, { role: 'user', content: value }])
      setInput('')
      try {
        const response = await fetch('/api/amv/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodeId: node.id, sessionId, answer: value, questionIndex })
        })
        const result = await response.json()
        if (result.completed) {
          setCompleted(true)
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content:
                `${result.final.reading}\nPatron: ${result.final.pattern}\nRiesgo: ${result.final.risk}\nAccion: ${result.final.minimum_action}\nCriterio: ${result.final.verification_criterion}\nLimite: ${new Date(result.final.deadline).toLocaleString()}`
            }
          ])
        } else if (result.question) {
          setQuestionIndex(result.question_index)
          setMessages((prev) => [...prev, { role: 'assistant', content: result.question }])
        }
      } catch {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'No se pudo persistir respuesta AMV. Reintenta cuando el nodo este sincronizado.' }])
      } finally {
        setLoading(false)
      }
      return
    }

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
        <button onClick={startSession} className="ml-auto font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600 hover:text-gold">
          {sessionId ? `q${questionIndex + 1}/3` : 'iniciar'}
        </button>
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
          onKeyDown={(event) => event.key === 'Enter' && void respond()}
          className="min-w-0 flex-1 border border-zinc-800 bg-black/50 px-3 py-2 font-mono text-[11px] text-zinc-300 outline-none focus:border-gold/50"
          placeholder={completed ? 'Sesion cerrada con accion verificable' : 'Responder al AMV...'}
        />
        <button
          onClick={() => void respond()}
          disabled={loading || completed}
          className="border border-gold/30 bg-gold/10 px-3 text-gold transition hover:bg-gold hover:text-void"
          aria-label="Enviar mensaje"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}
