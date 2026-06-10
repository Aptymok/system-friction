'use client'

import { useMemo, useState } from 'react'

type AmvChatMessage = {
  role: 'operator' | 'amv'
  text: string
  meta?: string
}

type AmvChatResponse = {
  ok?: boolean
  error?: string
  response?: string
  inference?: {
    intent: string
    uncertainty: number
    impact: number
    requiredAction: string
    usedMemory: string[]
    sourceTrust: string
  }
  memoryDelta?: { id: string; evidenceHash: string; kind: string }
  requiresHumanValidation?: boolean
  nextObservation?: string | null
}

export function AmvChat({
  module = 'sfi',
  sessionId,
  title = 'AMV',
  context,
  compact = false,
}: {
  module?: string
  sessionId?: string
  title?: string
  context?: Record<string, unknown>
  compact?: boolean
}) {
  const stableSessionId = useMemo(() => sessionId ?? `amv_${module}_${Date.now().toString(36)}`, [module, sessionId])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<AmvChatMessage[]>([
    { role: 'amv', text: `Registro: AMV activo en ${module}. Espera evidencia o pregunta observable.`, meta: 'local trace' },
  ])
  const [last, setLast] = useState<AmvChatResponse | null>(null)

  async function submit() {
    const message = input.trim()
    if (!message || busy) return
    setInput('')
    setBusy(true)
    setMessages((current) => [...current, { role: 'operator', text: message }])
    try {
      const response = await fetch('/api/amv/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ module, sessionId: stableSessionId, message, context }),
      })
      const json = await response.json() as AmvChatResponse
      setLast(json)
      setMessages((current) => [
        ...current,
        {
          role: 'amv',
          text: json.response ?? `AMV no pudo responder: ${json.error ?? 'respuesta invalida'}`,
          meta: json.memoryDelta ? `${json.memoryDelta.kind} / ${json.memoryDelta.id}` : json.error,
        },
      ])
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'amv_chat_failed'
      setLast({ ok: false, error: messageText })
      setMessages((current) => [...current, { role: 'amv', text: `AMV no disponible. Lectura local sin persistencia: ${messageText}`, meta: 'degraded' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`border border-[#c8a95122] bg-[#060605]/92 font-mono text-[#c8c4b8] ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[9px] uppercase tracking-[0.24em] text-[#c8a951]">{title}</div>
          <div className="mt-1 text-[8px] uppercase tracking-[0.18em] text-[#5d5547]">{module} / {stableSessionId}</div>
        </div>
        <div className="text-right text-[8px] uppercase tracking-[0.16em] text-[#6f6658]">
          <div>{last?.inference?.sourceTrust ?? 'unknown'}</div>
          <div>{last?.requiresHumanValidation ? 'humano requerido' : 'traza local'}</div>
        </div>
      </div>

      {last?.inference ? (
        <div className="mt-3 grid grid-cols-3 gap-2 text-[9px] uppercase tracking-[0.12em]">
          <Metric label="uncert" value={last.inference.uncertainty.toFixed(2)} warn={last.inference.uncertainty > 0.65} />
          <Metric label="impact" value={last.inference.impact.toFixed(2)} warn={last.inference.impact > 0.7} />
          <Metric label="action" value={last.inference.requiredAction} />
        </div>
      ) : null}

      <div className={`${compact ? 'mt-3 max-h-44' : 'mt-4 max-h-64'} space-y-2 overflow-auto pr-1 text-[10px] leading-5`}>
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={message.role === 'operator' ? 'border-l border-[#6f9cc855] pl-3 text-[#b8c7d4]' : 'border-l border-[#c8a95155] pl-3 text-[#d8d0bd]'}>
            <div className="mb-1 text-[8px] uppercase tracking-[0.16em] text-[#6f6658]">{message.role === 'operator' ? 'operador' : 'amv'}{message.meta ? ` / ${message.meta}` : ''}</div>
            <div className="whitespace-pre-line">{message.text}</div>
          </div>
        ))}
      </div>

      {last?.nextObservation ? <div className="mt-3 border border-[#c8a95118] bg-[#0a0a09] p-2 text-[9px] leading-4 text-[#a89469]">{last.nextObservation}</div> : null}

      <form onSubmit={(event) => { event.preventDefault(); void submit() }} className="mt-3 flex border border-[#c8a95118] bg-[#080706]">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={busy}
          placeholder="Pregunta observable..."
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[11px] text-[#e0d6c1] outline-none placeholder:text-[#6f6658] disabled:opacity-50"
        />
        <button type="submit" disabled={!input.trim() || busy} className="border-l border-[#c8a95118] px-4 text-[9px] uppercase tracking-[0.18em] text-[#c8a951] disabled:text-[#5d5547]">
          {busy ? 'Leyendo' : 'Enviar'}
        </button>
      </form>
    </section>
  )
}

function Metric({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="border border-[#c8a95118] bg-[#0a0a09] p-2">
      <div className="text-[#4a4a45]">{label}</div>
      <div className={warn ? 'mt-1 text-[#b85050]' : 'mt-1 text-[#c8a951]'}>{value}</div>
    </div>
  )
}
