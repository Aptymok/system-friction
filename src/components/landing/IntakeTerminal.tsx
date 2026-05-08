'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send } from 'lucide-react'

interface IntakeResult {
  success: boolean
  node_id?: string
  error?: string
}

export function IntakeTerminal() {
  const router = useRouter()
  const [alias, setAlias] = useState('')
  const [email, setEmail] = useState('')
  const [objective, setObjective] = useState('')
  const [currentFriction, setCurrentFriction] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alias,
          email,
          objective,
          current_friction: currentFriction
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
          Cuatro datos. Una linea base. El sistema no pregunta para conocerte: pregunta para poder recordar estructura.
        </p>

        <div className="mt-8 grid gap-5">
          <Field label="Alias de nodo" value={alias} onChange={setAlias} placeholder="NODO-UMBRAL" />
          <Field label="Correo de persistencia" value={email} onChange={setEmail} placeholder="tu@correo.net" type="email" />
          <TextField label="Objetivo principal" value={objective} onChange={setObjective} placeholder="Que ejecucion debe volverse observable?" />
          <TextField label="Friccion actual" value={currentFriction} onChange={setCurrentFriction} placeholder="Donde se rompe hoy la continuidad entre intencion y accion?" />
        </div>

        {error && <p className="mt-5 border-l border-signalRed bg-signalRed/10 p-3 font-mono text-[11px] uppercase tracking-[0.14em] text-red-200">{error}</p>}

        <button
          onClick={submit}
          disabled={loading}
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

function TextField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 min-h-[120px] w-full resize-none border border-gold/15 bg-black/40 px-4 py-3 font-serif text-lg leading-relaxed text-paper outline-none placeholder:text-zinc-700 focus:border-gold/50"
      />
    </label>
  )
}
