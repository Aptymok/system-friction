'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader2, Send } from 'lucide-react'
import { MOPH_QUESTIONS } from '@/lib/agents/moph'

interface IntakeResult {
  success: boolean
  node_id?: string
  error?: string
}

export function IntakeTerminal() {
  const router = useRouter()
  const [alias, setAlias] = useState('')
  const [email, setEmail] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [index, setIndex] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const question = MOPH_QUESTIONS[index]
  const answeredCount = MOPH_QUESTIONS.filter((item) => answers[item.id]?.trim()).length
  const canSubmit = alias.trim().length > 1 && email.includes('@') && answeredCount === MOPH_QUESTIONS.length

  const submit = async () => {
    setError('')
    if (!canSubmit) {
      setError('MOP-H incompleto. El nodo requiere diagnostico inicial completo.')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alias,
          email,
          responses: MOPH_QUESTIONS.map((item) => ({
            question_id: item.id,
            question_text: item.text,
            phase: item.phase,
            answer: answers[item.id]
          }))
        })
      })
      const result = (await response.json()) as IntakeResult
      if (!response.ok || !result.success) {
        setError(result.error || 'No se pudo crear el nodo operacional.')
        return
      }
      window.localStorage.setItem('sf-active-node-id', result.node_id || '')
      router.push('/terminal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="terminal-panel relative mx-auto max-w-3xl overflow-hidden p-5 md:p-8">
      <div className="scanline" />
      <div className="relative">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold">Protocolo de entrada</p>
        <h1 className="mt-3 font-display text-xl uppercase tracking-[0.1em] text-paper md:text-2xl">Crear nodo operacional</h1>
        <p className="mt-4 font-serif text-lg italic leading-relaxed text-zinc-500">
          MOP-H es la unica entrada. El nodo no nace de un formulario: nace de una lectura inicial de friccion, contradiccion y costo real.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Field label="Alias de nodo" value={alias} onChange={setAlias} placeholder="NODO-UMBRAL" />
          <Field label="Correo de persistencia" value={email} onChange={setEmail} placeholder="tu@correo.net" type="email" />
        </div>

        <div className="mt-6 border border-gold/15 bg-black/35 p-5">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-gold/10 pb-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">{question.phase}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">{question.id} / {MOPH_QUESTIONS.length}</p>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">{answeredCount} respuestas</p>
          </div>

          <p className="font-serif text-2xl italic leading-relaxed text-paper">{question.text}</p>
          <textarea
            value={answers[question.id] || ''}
            onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
            className="mt-5 min-h-[170px] w-full resize-none border border-gold/15 bg-black/40 px-4 py-3 font-serif text-lg leading-relaxed text-paper outline-none placeholder:text-zinc-700 focus:border-gold/50"
            placeholder="Responder sin justificar. Lo concreto antes que lo correcto."
          />

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
              disabled={index === 0}
              className="inline-flex items-center gap-2 border border-gold/20 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gold disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <button
              onClick={() => setIndex((current) => Math.min(MOPH_QUESTIONS.length - 1, current + 1))}
              disabled={index === MOPH_QUESTIONS.length - 1}
              className="inline-flex items-center gap-2 border border-gold/20 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gold disabled:opacity-30"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error && <p className="mt-5 border-l border-signalRed bg-signalRed/10 p-3 font-mono text-[11px] uppercase tracking-[0.14em] text-red-200">{error}</p>}

        <button
          onClick={submit}
          disabled={loading || !canSubmit}
          className="mt-7 flex w-full items-center justify-center gap-2 bg-gold px-5 py-4 font-mono text-[11px] font-bold uppercase tracking-[0.26em] text-void transition hover:bg-paper disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Persistir linea base
        </button>
      </div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text'
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full border border-gold/15 bg-black/40 px-4 py-3 font-mono text-sm text-paper outline-none placeholder:text-zinc-700 focus:border-gold/50"
      />
    </label>
  )
}
